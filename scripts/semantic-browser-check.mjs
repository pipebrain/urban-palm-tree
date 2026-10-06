import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
const baseURL =
  process.env.PREVIEW_URL || "http://127.0.0.1:4174/urban-palm-tree/";
const baseline = JSON.parse(
  await readFile("public/data/qudt-graph.json", "utf8"),
);
const q = (name) => `http://qudt.org/vocab/quantitykind/${name}`;
const u = (name) => `http://qudt.org/vocab/unit/${name}`;
const equation = "urn:hvacr:equation:steady-sensible-heat";
const sameSymbol = baseline.nodes
  .filter((n) => n.symbol === "p" && n.kind === "quantity")
  .slice(0, 2);
assert.equal(
  sameSymbol.length,
  2,
  "The real source has distinct concepts sharing p",
);
const unknown = baseline.nodes.find(
  (n) => n.kind === "quantity" && !n.description && n.id !== q("Temperature"),
);
assert.ok(unknown);
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const report = {
  checkedAt: new Date().toISOString(),
  baseURL,
  browser: browser.version(),
  note: "Mac Chromium; phone is touch/viewport emulation.",
  runs: [],
};
await mkdir("test-results", { recursive: true });
try {
  for (const phone of [false, true]) {
    const context = await browser.newContext({
      viewport: phone
        ? { width: 390, height: 844 }
        : { width: 1440, height: 960 },
      isMobile: phone,
      hasTouch: phone,
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(baseURL);
    await page.getByTestId("graph").waitFor();
    const inspect = page.getByTestId("inspector");
    const select = async (id) => {
      if (phone)
        await page.getByRole("button", { name: "Search", exact: true }).click();
      const concepts = page.getByRole("button", {
        name: "Concepts",
        exact: true,
      });
      await concepts.click();
      await page.getByRole("textbox", { name: "Search all nodes" }).fill(id);
      await page.locator(`.node-row[data-node-id="${id}"]`).click();
      await inspect.waitFor();
      await page.waitForFunction(
        () =>
          document.querySelector('[data-testid="inspector"]')?.scrollTop === 0,
      );
      assert.equal(await inspect.getAttribute("data-node-id"), id);
    };
    await select(q("Temperature"));
    assert.match(
      await inspect.locator(".classification").innerText(),
      /state property/i,
    );
    const unitSelect = inspect.getByRole("combobox", {
      name: "Preferred display unit",
    });
    assert.equal(await unitSelect.inputValue(), u("DEG_F"));
    await unitSelect.selectOption(u("DEG_C"));
    await inspect.locator(".preference-current .unit-link").click();
    const units = page.getByTestId("unit-inspector");
    await units.waitFor();
    await units
      .getByText("Source identity & conversion metadata", { exact: true })
      .click();
    assert.equal(await units.locator("code").innerText(), u("DEG_C"));
    assert.match(await units.innerText(), /No explicit uses/);
    await units.getByText(/^Display preferences ·/).click();
    assert.ok(
      await units
        .locator(`.related[data-node-id="${q("Temperature")}"]`)
        .count(),
    );
    await page
      .getByRole("button", { name: "Previous reference", exact: true })
      .click();
    assert.equal(await unitSelect.inputValue(), u("DEG_C"));
    await page
      .getByRole("button", { name: "Next reference", exact: true })
      .click();
    await units.waitFor();
    await units
      .getByRole("button", { name: "Back to concept", exact: false })
      .click();
    await select(q("TemperatureDifference"));
    assert.equal(
      await inspect
        .getByRole("combobox", { name: "Preferred display unit" })
        .inputValue(),
      "urn:hvacr:unit:fahrenheit-interval",
    );
    assert.equal(
      await inspect.locator(`option[value="${u("DEG_F")}"]`).count(),
      0,
    );
    await select(q("GaugePressure"));
    const options = await inspect
      .getByRole("combobox", { name: "Preferred display unit" })
      .locator("option")
      .evaluateAll((nodes) => nodes.map((n) => n.value));
    assert.ok(
      !options.includes(u("BAR_A")) && !options.includes(u("KiloPA_A")),
    );
    await select(unknown.id);
    assert.match(await inspect.innerText(), /does not include a description/);
    assert.match(await inspect.innerText(), /No reviewed unit preference/);
    assert.match(
      await inspect.locator(".classification").innerText(),
      /review/i,
    );
    await select(q("TemperatureRelatedMolarMass"));
    assert.match(
      await inspect.getByTestId("unresolved-source").innerText(),
      /no subject record/,
    );
    await inspect.getByTestId("unresolved-source").locator("summary").click();
    assert.match(
      await inspect.getByTestId("unresolved-source").innerText(),
      /A-1E0L0I0M1H-1T0D0/,
    );
    for (const n of sameSymbol) await select(n.id);
    await select(q("MassFlowRate"));
    const relationCount = await inspect
      .getByRole("heading", { name: /^Relationships/ })
      .innerText();
    await inspect.getByText("Display overrides", { exact: true }).click();
    await inspect
      .getByRole("textbox", { name: "Display name", exact: true })
      .fill("Mass flow — identity preserved");
    await inspect
      .getByRole("textbox", { name: "Display LaTeX", exact: true })
      .fill("p");
    await inspect
      .getByRole("button", { name: "Apply display", exact: true })
      .click();
    assert.equal(
      await inspect.locator("h2").innerText(),
      "Mass flow — identity preserved",
    );
    assert.equal(
      await inspect
        .getByRole("heading", { name: /^Relationships/ })
        .innerText(),
      relationCount,
    );
    await select(equation);
    assert.ok(
      await inspect
        .locator(".binding")
        .getByRole("button", { name: /Mass flow — identity preserved/ })
        .count(),
    );
    const unitTitles = await inspect
      .locator(".binding .unit-link")
      .evaluateAll((nodes) => nodes.map((n) => n.title));
    assert.ok(
      unitTitles.some((title) => title.includes("fahrenheit-interval")),
      "Equation unit convention stays fixed",
    );
    assert.ok(unitTitles.some((title) => title.includes("LB-PER-HR")));
    await inspect
      .locator(".binding")
      .getByRole("button", { name: /Mass flow — identity preserved/ })
      .click();
    assert.equal(await inspect.getAttribute("data-node-id"), q("MassFlowRate"));
    await page.screenshot({
      path: `test-results/m1-${phone ? "phone" : "desktop"}-semantic.png`,
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    report.runs.push({
      profile: phone ? "phone-emulation" : "desktop",
      sameSymbolIds: sameSymbol.map((n) => n.id),
      unknownId: unknown.id,
      checks: [
        "classification-subtype",
        "exact-unit-choice",
        "preference-backlinks-separate",
        "back-forward-navigation",
        "temperature-interval",
        "gauge-pressure-context",
        "unknown-data-visible",
        "missing-source-record",
        "symbol-collision",
        "rename-equation-links",
        "fixed-equation-convention",
      ],
      errors,
    });
    await context.close();
  }
  // Corrupt data must fail visibly at the boundary, before a partial workspace opens.
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  await page.route("**/data/qudt-graph.json", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...baseline, schemaVersion: 99 }),
    }),
  );
  await page.goto(baseURL);
  await page
    .getByRole("heading", { name: "The atlas could not open" })
    .waitFor();
  assert.match(await page.locator(".loading").innerText(), /schemaVersion/);
  assert.equal(await page.getByTestId("graph").count(), 0);
  report.invalidBaselineRejected = true;
  await context.close();
} finally {
  await browser.close();
  await writeFile(
    "test-results/semantic-browser-report.json",
    JSON.stringify(report, null, 2) + "\n",
  );
}
console.log(JSON.stringify(report, null, 2));
