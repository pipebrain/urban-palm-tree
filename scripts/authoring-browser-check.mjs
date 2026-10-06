import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const engine = process.env.BROWSER_ENGINE || "chromium";
const offlineFirst = process.env.OFFLINE_FIRST === "1";
const reportSuffix = offlineFirst ? "-offline" : "";
assert.ok(["chromium", "webkit"].includes(engine));
const baseURL =
  process.env.PREVIEW_URL || "http://127.0.0.1:4174/urban-palm-tree/";
const browser = await (engine === "webkit" ? webkit : chromium).launch(
  engine === "webkit"
    ? { headless: true }
    : {
        executablePath:
          process.env.CHROME_PATH ||
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        headless: true,
      },
);
const report = {
  checkedAt: new Date().toISOString(),
  baseURL,
  engine,
  offlineFirst,
  browser: browser.version(),
  note: "Mac browser automation; phone is viewport/touch emulation, not physical-device acceptance.",
  runs: [],
};
await mkdir("test-results", { recursive: true });
const q = (name) => `http://qudt.org/vocab/quantitykind/${name}`;
const u = (name) => `http://qudt.org/vocab/unit/${name}`;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
  "base64",
);
try {
  for (const phone of offlineFirst ? [true] : [false, true]) {
    const context = await browser.newContext({
      viewport: phone
        ? { width: 390, height: 844 }
        : { width: 1440, height: 960 },
      isMobile: phone,
      hasTouch: phone,
      serviceWorkers: offlineFirst ? "allow" : "block",
    });
    let page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    context.on("page", (p) =>
      p.on("pageerror", (error) => errors.push(error.message)),
    );
    page.on("pageerror", (error) => errors.push(error.message));
    const run = { viewport: phone ? "phone" : "desktop", checks: [], errors };
    report.runs.push(run);
    try {
      if (offlineFirst) {
        await page.goto(baseURL, { waitUntil: "domcontentloaded" });
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-testid="offline-status"]')
              ?.getAttribute("data-state") === "ready",
          undefined,
          { timeout: 120000 },
        );
        await page.close();
        await context.setOffline(true);
        page = await context.newPage();
        page.setDefaultTimeout(15000);
        run.offlineResponses = [];
        page.on("response", (response) =>
          run.offlineResponses.push({
            url: response.url(),
            status: response.status(),
            fromServiceWorker: response.fromServiceWorker(),
          }),
        );
      }
      await page.goto(baseURL);
      await page.getByTestId("graph").waitFor();
      const inspector = page.getByTestId("inspector");
      const undo = page.getByRole("button", { name: "Undo", exact: true });
      const redo = page.getByRole("button", { name: "Redo", exact: true });
      const library = async () => {
        if (phone)
          await page
            .getByRole("button", { name: "Search", exact: true })
            .click();
      };
      const select = async (id) => {
        await library();
        await page
          .getByRole("button", { name: "Concepts", exact: true })
          .click();
        await page.getByLabel("Search all nodes", { exact: true }).fill(id);
        await page.locator(`.node-row[data-node-id="${id}"]`).click();
        assert.equal(await inspector.getAttribute("data-node-id"), id);
      };
      const create = async (kind, name) => {
        await library();
        await page
          .getByLabel("New concept type", { exact: true })
          .selectOption(kind);
        await page
          .getByRole("button", { name: "Create concept", exact: true })
          .click();
        await page.getByLabel("Concept name", { exact: true }).fill(name);
      };
      const pick = async (label, id) => {
        await inspector
          .getByLabel(`Find ${label.toLowerCase()}`, { exact: true })
          .fill(id);
        await inspector.getByLabel(label, { exact: true }).selectOption(id);
      };
      const saved = async (name) => {
        await inspector.getByRole("heading", { name, exact: true }).waitFor();
        return inspector.getAttribute("data-node-id");
      };
      const click = (name) =>
        inspector.getByRole("button", { name, exact: true }).click();
      const noOverflow = async () =>
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );

      await create("quantity", "Authoring check quantity");
      await page.getByLabel("Concept symbol", { exact: true }).fill("x");
      await page.getByLabel("Concept LaTeX", { exact: true }).fill("x_1");
      await page
        .getByLabel("Concept definition", { exact: true })
        .fill("A locally authored test concept with a stable identity.");
      const notes = `Inline $x_1 + y_2$ and **bold**.\n\n$$\n\\frac{Q}{t}\n$$\n\n[Temperature](node:${encodeURIComponent(q("Temperature"))})\n\n[Unit reference](unit:${encodeURIComponent(u("LB"))})\n\n<script>globalThis.UNSAFE_NOTE = true</script>\n\n[Unsafe](javascript:alert(1))`;
      await page.getByLabel("Notes (Markdown)").fill(notes);
      await page.locator(".markdown-editor input[type=file]").setInputFiles({
        name: "embedded.png",
        mimeType: "image/png",
        buffer: png,
      });
      await page.waitForFunction(() =>
        document
          .querySelector('textarea[aria-label="Notes (Markdown)"]')
          ?.value.includes("data:image/png;base64,"),
      );
      await inspector.locator(".markdown-content img").scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const img = document.querySelector(".markdown-content img");
        return img?.complete && img.naturalWidth > 0;
      });
      assert.equal(
        await inspector.locator(".markdown-content .katex").count(),
        2,
      );
      assert.equal(
        await inspector
          .locator(
            ".markdown-content script, .markdown-content a[href^='javascript:']",
          )
          .count(),
        0,
      );
      assert.equal(
        await page.evaluate(() => globalThis.UNSAFE_NOTE),
        undefined,
      );
      assert.equal(
        await inspector
          .getByRole("button", { name: "Temperature", exact: true })
          .isDisabled(),
        true,
        "A note-preview link cannot discard an unsaved draft",
      );
      await noOverflow();
      await click("Save quantity");
      const quantity = await saved("Authoring check quantity");
      assert.match(quantity, /^urn:hvacr:node:/);
      assert.match(
        await undo.getAttribute("title"),
        /^Create Authoring check quantity$/,
      );
      await undo.click();
      assert.equal(
        await undo.isDisabled(),
        true,
        "All draft typing and embedded upload belong to one create action",
      );
      await redo.click();
      await select(quantity);
      assert.equal(await inspector.locator(".markdown-content img").count(), 1);
      await click("Edit concept");
      await page
        .getByLabel("Concept name", { exact: true })
        .fill("Canceled draft");
      await click("Cancel edit");
      assert.equal(
        await inspector.locator("h2").innerText(),
        "Authoring check quantity",
      );
      assert.equal(
        await undo.getAttribute("title"),
        "Create Authoring check quantity",
      );
      await inspector
        .getByRole("button", { name: "Temperature", exact: true })
        .click();
      assert.equal(
        await inspector.getAttribute("data-node-id"),
        q("Temperature"),
      );
      await select(quantity);
      run.checks.push(
        "create-stable-quantity",
        "single-action-text-session",
        "cancel-preserves-content-history",
        "safe-Markdown-inline-display-math",
        "preview-internal-links-preserve-unsaved-draft",
        "embedded-image",
        "internal-node-link",
      );

      await click("Exclude from map");
      assert.equal(await inspector.getAttribute("data-node-id"), quantity);
      assert.equal(await inspector.locator(".markdown-content img").count(), 1);
      await click("Restore to map");
      await undo.click();
      assert.equal(
        await inspector
          .getByRole("button", { name: "Restore to map", exact: true })
          .count(),
        1,
      );
      await redo.click();
      assert.equal(
        await inspector
          .getByRole("button", { name: "Exclude from map", exact: true })
          .count(),
        1,
      );
      run.checks.push("reversible-exclusion-retains-content");

      await create("constant", "Authoring check constant");
      await page.getByLabel("Recorded value 1", { exact: true }).fill("8.33");
      await pick("Value 1 unit 1", u("LB"));
      await page
        .getByLabel("Conditions and assumptions", { exact: true })
        .fill(
          "Test fixture only; not a reviewed HVACR coefficient.\nSecond condition remains a separate line.",
        );
      await page
        .getByLabel("Concept source URLs", { exact: true })
        .fill("https://example.com/test-source");
      await page
        .getByLabel("Notes (Markdown)")
        .fill(`[Authored quantity](node:${encodeURIComponent(quantity)})`);
      await click("Save constant");
      const constant = await saved("Authoring check constant");
      assert.equal(
        await inspector
          .locator("details")
          .filter({
            has: page.locator("summary", {
              hasText: "Conditions & assumptions",
            }),
          })
          .locator("li")
          .count(),
        2,
      );
      await click("Edit concept");
      await pick("Value 1 unit 1", u("KiloGM"));
      await click("Save constant");
      assert.match(
        await inspector.getByRole("alert").innerText(),
        /Numerical conversion is unavailable/,
      );
      await click("Cancel edit");
      assert.equal(
        await inspector.locator(".constant-value strong").innerText(),
        "8.33",
      );
      assert.match(
        await inspector
          .locator(".constant-value .unit-link")
          .getAttribute("title"),
        /vocab\/unit\/LB$/,
      );
      run.checks.push(
        "contextual-constant-value-source-assumptions",
        "unit-change-refused-without-conversion",
      );

      await inspector.locator(".constant-value .unit-link").click();
      const unitPanel = page.getByTestId("unit-inspector");
      await unitPanel
        .getByRole("button", { name: "Edit unit presentation", exact: true })
        .click();
      await unitPanel
        .getByLabel("Unit name", { exact: true })
        .fill("Edited pound-mass label");
      await unitPanel
        .getByLabel("Unit LaTeX", { exact: true })
        .fill("\\mathrm{lb}_{test}");
      await unitPanel
        .getByLabel("Unit definition", { exact: true })
        .fill(
          "A presentation override retaining the pound-mass unit identity.",
        );
      await unitPanel
        .getByRole("button", { name: "Save unit", exact: true })
        .click();
      await unitPanel.getByRole("button", { name: /Back to concept/ }).click();
      assert.match(
        await inspector
          .locator(".constant-value .unit-link")
          .getAttribute("title"),
        /^Edited pound-mass label · http:\/\/qudt.org\/vocab\/unit\/LB$/,
      );
      assert.equal(
        await inspector
          .locator(".constant-value .unit-link annotation")
          .textContent(),
        "\\mathrm{lb}_{test}",
      );
      await undo.click();
      assert.doesNotMatch(
        await inspector
          .locator(".constant-value .unit-link")
          .getAttribute("title"),
        /Edited pound-mass/,
      );
      await redo.click();
      assert.match(
        await inspector
          .locator(".constant-value .unit-link")
          .getAttribute("title"),
        /Edited pound-mass/,
      );
      run.checks.push(
        "unit-edit-propagates-label-and-LaTeX-preserving-ID",
        "unit-edit-undo-redo",
      );

      await create("equation", "Authoring check equation");
      await page.getByLabel("Concept LaTeX", { exact: true }).fill("q=mc");
      await click("Add participant");
      await page.getByLabel("Participant 1 symbol", { exact: true }).fill("m");
      await pick("Participant 1 concept", quantity);
      await click("Add participant");
      await page.getByLabel("Participant 2 symbol", { exact: true }).fill("c");
      await pick("Participant 2 concept", constant);
      await pick("Participant 2 unit", u("LB"));
      await click("Save equation");
      const equation = await saved("Authoring check equation");
      assert.equal(await inspector.locator(".binding").count(), 2);
      assert.match(
        await inspector
          .getByRole("heading", { name: /^Relationships/ })
          .innerText(),
        /2$/,
      );
      await select(quantity);
      await click("Edit concept");
      await page
        .getByLabel("Concept name", { exact: true })
        .fill("Renamed authored quantity");
      await page.getByLabel("Concept symbol", { exact: true }).fill("r");
      await click("Save quantity");
      assert.equal(await inspector.getAttribute("data-node-id"), quantity);
      await select(equation);
      assert.match(
        await inspector.locator(".binding").first().innerText(),
        /Renamed authored quantity/,
      );
      run.checks.push(
        "explicit-equation-bindings-maintain-relationships",
        "rename-preserves-reference-identity",
      );

      await select(quantity);
      await click("Create relationship");
      await pick("Relationship target concept", constant);
      await page
        .getByLabel("Relationship rationale", { exact: true })
        .fill("A deliberately authored conceptual link for the browser check.");
      await page
        .getByLabel("Relationship source URLs", { exact: true })
        .fill("https://example.com/test-relationship");
      await click("Save relationship");
      assert.match(
        await inspector
          .getByRole("heading", { name: /^Relationships/ })
          .innerText(),
        /2$/,
      );
      await click("Delete custom node");
      await click("Delete node");
      assert.match(
        await page.locator(".authoring-error").innerText(),
        /reference|equation|notes/i,
      );
      assert.equal(await inspector.getAttribute("data-node-id"), quantity);
      run.checks.push(
        "authored-relationship-creation",
        "referenced-deletion-refused",
      );

      await create("quantity", "Disposable authored quantity");
      await click("Save quantity");
      const disposable = await saved("Disposable authored quantity");
      await click("Delete custom node");
      await click("Delete node");
      assert.match(await undo.getAttribute("title"), /^Delete Disposable/);
      await undo.click();
      await select(disposable);
      assert.equal(
        await inspector.locator("h2").innerText(),
        "Disposable authored quantity",
      );
      await redo.click();
      await library();
      await page.getByRole("button", { name: "Concepts", exact: true }).click();
      await page
        .getByLabel("Search all nodes", { exact: true })
        .fill(disposable);
      assert.equal(
        await page.locator(`.node-row[data-node-id="${disposable}"]`).count(),
        0,
      );
      await select(equation);
      if (phone) {
        await click("Show on map");
        const graph = page.getByTestId("graph");
        const pause = page.getByRole("button", { name: "Pause", exact: true });
        if (await pause.count()) await pause.click();
        await page.getByRole("button", { name: "Pin", exact: true }).click();
        // The last worker tick and the pin draw must settle before reading pixel coordinates.
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        await page.evaluate(() => {
          globalThis.authoringTapCanvas = undefined;
          document.addEventListener(
            "click",
            (event) => {
              globalThis.authoringTapCanvas =
                event.target instanceof HTMLCanvasElement;
            },
            { capture: true, once: true },
          );
        });
        await page.locator("canvas").tap({
          position: {
            x: Number(await graph.getAttribute("data-selected-x")),
            y: Number(await graph.getAttribute("data-selected-y")),
          },
        });
        await inspector.waitFor();
        assert.equal(await inspector.getAttribute("data-node-id"), equation);
        assert.equal(
          await page.evaluate(() => globalThis.authoringTapCanvas),
          true,
          "A touch selection cannot click through to the newly opened inspector",
        );
        run.checks.push("touch-canvas-selection-does-not-click-through");
      }
      await noOverflow();
      await page.screenshot({
        path: `test-results/m2-authoring-${engine}${reportSuffix}-${run.viewport}.png`,
        fullPage: true,
      });
      run.checks.push("custom-delete-undo-redo", "no-horizontal-overflow");
      assert.deepEqual(errors, []);
      if (offlineFirst) {
        assert.ok(
          run.offlineResponses.some(
            (response) =>
              response.url.endsWith("/data/qudt-graph.json") &&
              response.fromServiceWorker,
          ),
        );
        run.checks.push("fresh-document-offline-authoring");
      }
      run.passed = true;
    } catch (error) {
      run.failure = error.stack;
      await page.screenshot({
        path: `test-results/m2-authoring-${engine}${reportSuffix}-${run.viewport}-failure.png`,
        fullPage: true,
      });
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(
    `test-results/m2-authoring-${engine}${reportSuffix}-report.json`,
    JSON.stringify(report, null, 2),
  );
}
console.log(JSON.stringify(report, null, 2));
