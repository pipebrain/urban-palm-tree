import { enterEditMode } from "./browser-ui.mjs";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseURL =
  process.env.PREVIEW_URL || "http://127.0.0.1:4174/urban-palm-tree/";
const chromePath =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const baseline = JSON.parse(
  await readFile(
    new URL("../public/data/qudt-graph.json", import.meta.url),
    "utf8",
  ),
);
const inventory = JSON.parse(
  await readFile(
    new URL("../dist/offline-inventory.json", import.meta.url),
    "utf8",
  ),
);
const unseen = baseline.nodes.find(
  (node) =>
    node.constantValues?.some((value) => value.unitIds.length) && node.latex,
);
assert.ok(
  unseen,
  "The real baseline contains a constant with explicit units and math",
);
const unitId = unseen.constantValues.find((value) => value.unitIds.length)
  .unitIds[0];
const unit = baseline.units.find((candidate) => candidate.id === unitId);
assert.ok(
  unit,
  "The selected unit exists in the complete reference dictionary",
);
const results = {
  checkedAt: new Date().toISOString(),
  baseURL,
  engine: "Chromium via installed Google Chrome",
  appVersion: JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  ).version,
  note: "Browser automation on the Mac; phone viewport/touch emulation is not an actual Android or iPhone device test.",
  dataset: {
    sourceVersion: baseline.source.version,
    eligibleNodes: baseline.nodes.length,
    displayedNodes: baseline.nodes.length + 1,
    unitReferences: baseline.units.length,
    totalUnitReferences: baseline.units.length + 1,
  },
  build: {
    originalAssetCount: inventory.assets.length,
    byteCount: inventory.assets.reduce((sum, asset) => sum + asset.bytes, 0),
    fonts: inventory.assets.filter((asset) =>
      /KaTeX.*\.(woff2?|ttf)$/.test(asset.path),
    ).length,
    interfaceFonts: inventory.assets.filter((asset) =>
      /InterVariable.*\.woff2$/.test(asset.path),
    ).length,
    workers: inventory.assets
      .filter((asset) => /worker.*\.js$/.test(asset.path))
      .map((asset) => asset.path),
  },
  runs: [],
};
let browser;
let failure;
try {
  browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });
  results.browserVersion = browser.version();
  for (const profile of [
    {
      name: "desktop",
      viewport: { width: 1440, height: 960 },
      isMobile: false,
      hasTouch: false,
    },
    {
      name: "phone-emulation",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    },
  ]) {
    const { name: _name, ...browserProfile } = profile;
    const context = await browser.newContext({
      ...browserProfile,
      serviceWorkers: "allow",
    });
    const run = {
      profile: profile.name,
      viewport: profile.viewport,
      errors: [],
      offlineResponses: [],
      passed: false,
    };
    results.runs.push(run);
    context.on("page", (page) =>
      page.on("pageerror", (error) => run.errors.push(error.message)),
    );
    const page = await context.newPage();
    console.log(`${profile.name}: preparing the complete production build`);
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-testid="offline-status"]')
          ?.getAttribute("data-state") === "ready",
      undefined,
      { timeout: 120_000 },
    );
    await page.waitForFunction(
      (expected) =>
        Number(
          document
            .querySelector('[data-testid="graph"]')
            ?.getAttribute("data-node-count"),
        ) === expected,
      baseline.nodes.length + 1,
    );
    run.prepared = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration?.active) throw new Error("No active service worker");
      const status = await new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        const timer = setTimeout(
          () => reject(new Error("Worker readiness timed out")),
          15_000,
        );
        channel.port1.onmessage = (event) => {
          clearTimeout(timer);
          channel.port1.close();
          resolve(event.data);
        };
        registration.active.postMessage({ type: "HVACR_OFFLINE_STATUS" }, [
          channel.port2,
        ]);
      });
      const names = await caches.keys();
      const own = names.find((name) => name.endsWith(`:${status.buildId}`));
      if (!own) throw new Error("Prepared cache missing");
      const cache = await caches.open(own);
      const requests = await cache.keys();
      return {
        ...status,
        cachedURLs: requests.map((request) => request.url),
        controlledFirstPage: Boolean(navigator.serviceWorker.controller),
        cacheName: own,
      };
    });
    assert.equal(run.prepared.ready, true);
    for (const asset of inventory.assets)
      assert.ok(
        run.prepared.cachedURLs.includes(new URL(asset.path, baseURL).href),
        `Cached ${asset.path}`,
      );
    assert.equal(
      run.prepared.assetCount,
      inventory.assets.length + 1,
      "All production assets and inventory were prepared",
    );
    assert.ok(
      run.prepared.cachedURLs.includes(
        new URL("offline-inventory.json", baseURL).href,
      ),
    );
    // This is a new document after closing every app tab; no page snapshot survives.
    await page.close();
    await context.setOffline(true);
    console.log(
      `${profile.name}: closed all tabs, opening a fresh offline page`,
    );
    const reopened = await context.newPage();
    reopened.on("response", (response) =>
      run.offlineResponses.push({
        url: response.url(),
        status: response.status(),
        fromServiceWorker: response.fromServiceWorker(),
      }),
    );
    const started = performance.now();
    await reopened.goto(baseURL, { waitUntil: "domcontentloaded" });
    await reopened.waitForFunction(
      (expected) =>
        Number(
          document
            .querySelector('[data-testid="graph"]')
            ?.getAttribute("data-node-count"),
        ) === expected &&
        Number(
          document
            .querySelector('[data-testid="graph"]')
            ?.getAttribute("data-ticks"),
        ) > 0,
      baseline.nodes.length + 1,
    );
    run.offlineStartupMs = Math.round(performance.now() - started);
    await reopened.waitForFunction(
      () =>
        document
          .querySelector('[data-testid="offline-status"]')
          ?.getAttribute("data-state") === "ready",
    );
    if (profile.isMobile)
      await reopened
        .getByRole("button", { name: "Search", exact: true })
        .click();
    await reopened
      .getByRole("textbox", { name: "Search all nodes" })
      .fill(unseen.id);
    await reopened
      .locator(".node-row")
      .filter({ has: reopened.getByText(unseen.label, { exact: true }) })
      .click();
    assert.equal(
      await reopened.getByTestId("inspector").locator("h2").innerText(),
      unseen.label,
    );
    assert.ok(
      await reopened.getByTestId("inspector").locator(".katex").count(),
      "Previously unviewed math rendered offline",
    );
    await reopened
      .getByTestId("inspector")
      .locator(".constant-value .unit-link")
      .first()
      .click();
    assert.equal(
      await reopened.getByTestId("unit-inspector").locator("h2").innerText(),
      unit.label,
    );
    await reopened
      .getByTestId("unit-inspector")
      .locator("summary")
      .filter({ hasText: "Source identity & conversion metadata" })
      .click();
    assert.equal(
      await reopened.getByTestId("unit-inspector").locator("code").innerText(),
      unitId,
    );
    await reopened.evaluate(() => document.fonts.ready);
    assert.equal(await reopened.locator(".katex-error").count(), 0);
    run.unseenNode = {
      id: unseen.id,
      label: unseen.label,
      unitId,
      unitLabel: unit.label,
    };
    const selectConcept = async (id) => {
      if (profile.isMobile)
        await reopened
          .getByRole("button", { name: "Search", exact: true })
          .click();
      await reopened
        .getByRole("textbox", { name: "Search all nodes" })
        .fill(id);
      await reopened.locator(`.node-row[data-node-id="${id}"]`).click();
    };
    const equationId = "urn:hvacr:equation:steady-sensible-heat";
    const temperatureId = "http://qudt.org/vocab/quantitykind/Temperature";
    const celsiusId = "http://qudt.org/vocab/unit/DEG_C";
    await selectConcept(equationId);
    const bindingUnitsBefore = await reopened
      .getByTestId("inspector")
      .locator(".binding .unit-link")
      .evaluateAll((buttons) => buttons.map((button) => button.title));
    assert.equal(bindingUnitsBefore.length, 4);
    await selectConcept(temperatureId);
    await enterEditMode(reopened);
    const preference = reopened.getByRole("combobox", {
      name: "Preferred display unit",
      exact: true,
    });
    assert.equal(
      await preference.inputValue(),
      "http://qudt.org/vocab/unit/DEG_F",
    );
    await preference.selectOption(celsiusId);
    assert.equal(await preference.inputValue(), celsiusId);
    assert.equal(
      await reopened
        .getByTestId("inspector")
        .getByText("Session choice", { exact: true })
        .count(),
      1,
    );
    await reopened
      .getByTestId("inspector")
      .locator(".preference-current .unit-link")
      .click();
    const reference = reopened.getByTestId("unit-inspector");
    assert.equal(await reference.locator("h2").innerText(), "Degree Celsius");
    const originalUses = baseline.nodes.filter(
      (node) =>
        node.unitIds.includes(celsiusId) ||
        node.constantValues?.some((value) =>
          value.unitIds.includes(celsiusId),
        ) ||
        node.bindings?.some((binding) => binding.unitId === celsiusId),
    ).length;
    assert.equal(
      await reference
        .getByRole("heading", {
          name: `Explicit uses · ${originalUses}`,
          exact: true,
        })
        .count(),
      1,
    );
    await reference
      .locator("summary")
      .filter({ hasText: "Display preferences · 1" })
      .click();
    assert.equal(
      await reference
        .locator("details[open] .related")
        .filter({ hasText: temperatureId })
        .count(),
      1,
    );
    await selectConcept(
      "http://qudt.org/vocab/quantitykind/TemperatureDifference",
    );
    await reopened
      .getByRole("combobox", { name: "Preferred display unit", exact: true })
      .selectOption("http://qudt.org/vocab/unit/K");
    await selectConcept(equationId);
    const bindingUnitsAfter = await reopened
      .getByTestId("inspector")
      .locator(".binding .unit-link")
      .evaluateAll((buttons) => buttons.map((button) => button.title));
    assert.deepEqual(
      bindingUnitsAfter,
      bindingUnitsBefore,
      "Offline preference changes preserve equation conventions",
    );
    await selectConcept("http://qudt.org/vocab/quantitykind/Acceleration");
    assert.equal(
      await reopened
        .getByRole("combobox", { name: "Preferred display unit", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await reopened
        .getByTestId("inspector")
        .getByText("No reviewed unit preference for this concept yet.", {
          exact: true,
        })
        .count(),
      1,
    );
    assert.equal(await reopened.locator(".katex-error").count(), 0);
    run.offlinePreferences = {
      temperatureChoice: celsiusId,
      intervalChoice: "http://qudt.org/vocab/unit/K",
      explicitUseCountPreserved: originalUses,
      displayPreferenceBacklinkPresent: true,
      equationBindingsPreserved: true,
      unreviewedConceptRemainedUnresolved: true,
    };
    run.fonts = await reopened.evaluate(() =>
      Array.from(document.fonts)
        .filter(
          (font) => font.family.startsWith("KaTeX") && font.status === "loaded",
        )
        .map((font) => ({ family: font.family, status: font.status })),
    );
    assert.ok(run.fonts.length, "At least one cached KaTeX font is loaded");
    run.interfaceFonts = await reopened.evaluate(async () => {
      await document.fonts.ready;
      return Array.from(document.fonts)
        .filter((font) => font.family === "Inter" && font.status === "loaded")
        .map((font) => ({ family: font.family, status: font.status }));
    });
    assert.equal(
      run.interfaceFonts.length,
      1,
      "Bundled Inter is loaded offline",
    );
    assert.equal(
      run.errors.length,
      0,
      `No browser page errors: ${run.errors.join("; ")}`,
    );
    assert.ok(
      run.offlineResponses.some(
        (response) => response.url === baseURL && response.fromServiceWorker,
      ),
      "Fresh navigation served from worker",
    );
    assert.ok(
      run.offlineResponses.some(
        (response) =>
          response.url.endsWith("/data/qudt-graph.json") &&
          response.fromServiceWorker,
      ),
      "Complete dataset served from worker",
    );
    assert.ok(
      run.offlineResponses.some(
        (response) =>
          /InterVariable[^/]*\.woff2$/.test(response.url) &&
          response.fromServiceWorker,
      ),
      "Interface font served from worker during offline reopening",
    );
    assert.ok(
      run.offlineResponses.every((response) => response.status < 400),
      "No failed offline responses",
    );
    run.passed = true;
    console.log(
      `${profile.name}: passed full offline startup, unseen node, unit, math and preference checks (${run.offlineStartupMs} ms)`,
    );
    await context.close();
  }
} catch (error) {
  failure = error;
  results.failure = error.stack || String(error);
} finally {
  await browser?.close();
  await mkdir(new URL("../test-results/", import.meta.url), {
    recursive: true,
  });
  await writeFile(
    new URL("../test-results/offline-report.json", import.meta.url),
    `${JSON.stringify(results, null, 2)}\n`,
  );
}
if (failure) throw failure;
console.log(
  "Offline browser evidence saved to test-results/offline-report.json",
);
