import { enterEditMode } from "./browser-ui.mjs";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseURL =
  process.env.PREVIEW_URL || "http://127.0.0.1:4174/urban-palm-tree/";
const report = {
  baseURL,
  startedAt: new Date().toISOString(),
  note: "Desktop Chromium; phone viewports emulate touch and size, not physical devices.",
  runs: [],
};
await mkdir("test-results", { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
report.browser = browser.version();
let activePage;
try {
  for (const profile of [
    { name: "desktop", viewport: { width: 1440, height: 960 } },
    {
      name: "phone",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    },
  ]) {
    const { name, ...options } = profile;
    const context = await browser.newContext({
      ...options,
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    activePage = page;
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const began = performance.now();
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    const graph = page.getByTestId("graph");
    await graph.waitFor();
    await enterEditMode(page);
    await page.waitForFunction(
      () =>
        Number(document.querySelector("[data-testid=graph]")?.dataset.ticks) >=
        4,
    );
    const firstGraphMs = performance.now() - began;
    assert.equal(await graph.getAttribute("data-node-count"), "1556");
    await page.getByRole("button", { name: "Fit all", exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-testid=graph]")?.dataset.renderedNodes ===
        "1556",
    );
    const frames = await page.evaluate(async () => {
      const values = [];
      let last = performance.now();
      for (let i = 0; i < 90; i++) {
        const now = await new Promise((resolve) =>
          requestAnimationFrame(resolve),
        );
        values.push(now - last);
        last = now;
      }
      return values.slice(1).sort((a, b) => a - b);
    });
    const metrics = await graph.evaluate((el) => ({ ...el.dataset }));
    await page.screenshot({
      path: `test-results/${name}-full-graph.png`,
      fullPage: true,
    });
    const zoomBefore = Number(await graph.getAttribute("data-zoom"));
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.waitForFunction(
      (v) =>
        Number(document.querySelector("[data-testid=graph]")?.dataset.zoom) > v,
      zoomBefore,
    );
    // Search must not curate/remove any graph nodes.
    if (name === "phone")
      await page.getByRole("button", { name: "Search", exact: true }).tap();
    await page
      .getByRole("textbox", { name: "Search all nodes" })
      .fill("no-such-hvacr-concept-873104");
    assert.equal(await page.locator(".node-row").count(), 0);
    assert.equal(
      await graph.getAttribute("data-node-count"),
      "1556",
      "Search only narrows results, not the graph",
    );
    await page
      .getByRole("textbox", { name: "Search all nodes" })
      .fill("Sensible heat transfer");
    const row = page
      .locator(".node-row")
      .filter({ hasText: "Sensible heat transfer" });
    if (name === "phone") await row.tap();
    else await row.click();
    await page
      .getByRole("heading", { name: "Sensible heat transfer", exact: true })
      .waitFor();
    assert.equal(await graph.getAttribute("data-node-count"), "1556");
    assert.ok(
      (await page.getByTestId("inspector").locator(".katex").count()) > 3,
    );
    // Exact internal unit identity remains inspectable with reviewed US notation.
    await page.getByTestId("inspector").locator(".unit-link").first().click();
    await page
      .getByRole("heading", { name: /British Thermal Unit.*per Hour/i })
      .waitFor();
    await page.getByText("Source identity & conversion metadata").click();
    assert.match(
      await page
        .getByTestId("unit-inspector")
        .locator("code")
        .first()
        .textContent(),
      /BTU_IT-PER-HR$/,
    );
    await page
      .getByRole("button", { name: "Back to concept", exact: false })
      .click();
    if (name === "phone")
      await page.getByRole("button", { name: "Map", exact: true }).tap();
    await page.getByRole("button", { name: "Pin", exact: true }).click();
    assert.equal(
      await page.getByRole("button", { name: "Unpin", exact: true }).count(),
      1,
    );
    await page.getByRole("button", { name: /Pause/ }).click();
    await page.waitForTimeout(200);
    const pausedTicks = await graph.getAttribute("data-ticks");
    if (name === "phone") {
      await page.locator("canvas").tap({
        position: {
          x: Number(await graph.getAttribute("data-selected-x")),
          y: Number(await graph.getAttribute("data-selected-y")),
        },
      });
      await page
        .getByRole("heading", { name: "Sensible heat transfer", exact: true })
        .waitFor();
    }
    if (name === "phone")
      await page.getByRole("button", { name: "Inspector", exact: true }).tap();
    await page.getByText("Display overrides", { exact: true }).click();
    await page
      .getByRole("textbox", { name: "Display name" })
      .fill("Sensible heat — local draft");
    await page
      .getByRole("textbox", { name: "Display LaTeX" })
      .fill("\\dot{Q}=\\dot{m}c_p(T_2-T_1)");
    await page
      .getByRole("button", { name: "Apply display", exact: true })
      .click();
    await page
      .getByRole("heading", {
        name: "Sensible heat — local draft",
        exact: true,
      })
      .waitFor();
    await page.waitForTimeout(200);
    assert.equal(
      await graph.getAttribute("data-ticks"),
      pausedTicks,
      "Editing display fields must preserve paused simulation",
    );
    assert.equal(
      await graph.getAttribute("data-pins"),
      "1",
      "Editing must preserve pins",
    );
    if (name === "phone")
      await page.getByRole("button", { name: "Map", exact: true }).tap();
    // A pin follows its identity when the selected equation is hidden and
    // restored at a different visible index. Neither filtering nor editing
    // should resume a paused simulation or reset the camera.
    const beforeFilter = await graph.evaluate((el) => ({ ...el.dataset }));
    await page.locator(".map-filters > summary").click();
    await page
      .getByRole("combobox", { name: "Map node type", exact: true })
      .selectOption("constant");
    await page.waitForFunction(() => {
      const d = document.querySelector("[data-testid=graph]")?.dataset;
      return d?.nodeCount === "331" && d?.visiblePins === "0";
    });
    assert.equal(await graph.getAttribute("data-pins"), "1");
    assert.equal(await page.getByRole("button", { name: /Resume/ }).count(), 1);
    assert.equal(
      await graph.getAttribute("data-camera-x"),
      beforeFilter.cameraX,
    );
    assert.equal(
      await graph.getAttribute("data-camera-y"),
      beforeFilter.cameraY,
    );
    await page
      .getByRole("combobox", { name: "Map node type", exact: true })
      .selectOption("all");
    await page.waitForFunction(() => {
      const d = document.querySelector("[data-testid=graph]")?.dataset;
      return d?.nodeCount === "1556" && d?.visiblePins === "1";
    });
    assert.equal(
      await graph.getAttribute("data-selected-world-x"),
      beforeFilter.selectedWorldX,
    );
    assert.equal(
      await graph.getAttribute("data-selected-world-y"),
      beforeFilter.selectedWorldY,
    );
    assert.equal(
      await graph.getAttribute("data-camera-x"),
      beforeFilter.cameraX,
    );
    assert.equal(
      await graph.getAttribute("data-camera-y"),
      beforeFilter.cameraY,
    );
    assert.equal(
      await page.getByRole("button", { name: "Unpin", exact: true }).count(),
      1,
    );
    await page.waitForTimeout(150);
    assert.equal(
      await graph.getAttribute("data-ticks"),
      "0",
      "Paused state must survive a new filtered layout worker",
    );

    // Mutually exclusive kind/classification filters produce an intentional,
    // recoverable empty graph, with a finite camera and cached pins retained.
    await page
      .getByRole("combobox", { name: "Map node type", exact: true })
      .selectOption("constant");
    await page
      .getByRole("combobox", { name: "Map classification", exact: true })
      .selectOption("thermodynamic-state-property");
    await page.waitForFunction(
      () =>
        document.querySelector("[data-testid=graph]")?.dataset.nodeCount ===
        "0",
    );
    await page
      .getByText("No nodes match this view. Change or clear the filters.", {
        exact: true,
      })
      .waitFor();
    assert.ok(Number.isFinite(Number(await graph.getAttribute("data-zoom"))));
    assert.equal(await graph.getAttribute("data-pins"), "1");
    await page.getByRole("button", { name: "Reset map", exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-testid=graph]")?.dataset.nodeCount ===
        "1556",
    );
    await page.locator(".map-filters > summary").click();

    // Equation neighbourhood focus retains all four explicitly bound concepts.
    if (name === "phone")
      await page.getByRole("button", { name: "Inspector", exact: true }).tap();
    await page
      .getByRole("button", { name: "Focus neighbourhood", exact: true })
      .click();
    if (name === "phone")
      await page.getByRole("button", { name: "Map", exact: true }).tap();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-testid=graph]")?.dataset.nodeCount ===
        "5",
    );
    if (name === "phone")
      await page.getByRole("button", { name: "Inspector", exact: true }).tap();
    await page
      .getByRole("combobox", { name: "Neighbourhood depth", exact: true })
      .selectOption("2");
    await page
      .getByRole("button", { name: "Focus neighbourhood", exact: true })
      .click();
    if (name === "phone")
      await page.getByRole("button", { name: "Map", exact: true }).tap();
    await page.waitForFunction(
      () =>
        Number(
          document.querySelector("[data-testid=graph]")?.dataset.nodeCount,
        ) > 5,
    );
    await page.getByRole("button", { name: "Reset map", exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-testid=graph]")?.dataset.nodeCount ===
        "1556",
    );
    // Refocus the unchanged selection, then verify dragging pins at the new
    // location. The explicit focus action must work for the same selected ID.
    if (name === "phone")
      await page.getByRole("button", { name: "Inspector", exact: true }).tap();
    await page
      .getByRole("button", { name: "Show on map", exact: true })
      .click();
    if (name === "phone")
      await page.getByRole("button", { name: "Map", exact: true }).tap();
    await page.waitForFunction(
      () =>
        Number(document.querySelector("[data-testid=graph]")?.dataset.zoom) ===
        2.8,
    );
    const worldBeforeDrag = Number(
      await graph.getAttribute("data-selected-world-x"),
    );
    const dragBounds = await page.locator("canvas").boundingBox();
    const dragX =
      dragBounds.x + Number(await graph.getAttribute("data-selected-x"));
    const dragY =
      dragBounds.y + Number(await graph.getAttribute("data-selected-y"));
    if (name === "phone") {
      const dragCdp = await context.newCDPSession(page);
      await dragCdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: dragX, y: dragY, id: 0 }],
      });
      await dragCdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: dragX + 35, y: dragY - 20, id: 0 }],
      });
      await dragCdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await dragCdp.detach();
    } else {
      await page.mouse.move(dragX, dragY);
      await page.mouse.down();
      await page.mouse.move(dragX + 35, dragY - 20, { steps: 5 });
      await page.mouse.up();
    }
    await page.waitForFunction(
      (before) =>
        Number(
          document.querySelector("[data-testid=graph]")?.dataset.selectedWorldX,
        ) !== before,
      worldBeforeDrag,
    );
    assert.equal(await graph.getAttribute("data-pins"), "1");

    // Pointer pan on blank margin and multitouch pinch via real browser touch input.
    const bounds = await page.locator("canvas").boundingBox();
    const x = bounds.x + 15,
      y = bounds.y + bounds.height - 95;
    const beforeX = Number(await graph.getAttribute("data-camera-x"));
    if (name === "phone") {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y, id: 0 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + 55, y: y - 25, id: 0 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await page.waitForTimeout(100);
      assert.notEqual(
        Number(await graph.getAttribute("data-camera-x")),
        beforeX,
        "Touch pan updates camera",
      );
      const beforePinch = Number(await graph.getAttribute("data-zoom"));
      const cx = bounds.x + bounds.width / 2,
        cy = bounds.y + bounds.height / 2;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: cx - 30, y: cy, id: 0 },
          { x: cx + 30, y: cy, id: 1 },
        ],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: cx - 65, y: cy, id: 0 },
          { x: cx + 65, y: cy, id: 1 },
        ],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await page.waitForTimeout(150);
      assert.ok(
        Number(await graph.getAttribute("data-zoom")) > beforePinch,
        "Pinch zoom changes camera",
      );
    } else {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 55, y - 25, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(100);
      assert.notEqual(
        Number(await graph.getAttribute("data-camera-x")),
        beforeX,
      );
    }
    await page.getByRole("button", { name: "Fit all", exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-testid=graph]")?.dataset.renderedNodes ===
        "1556",
    );
    if (name === "phone")
      await page.getByRole("button", { name: "Inspector", exact: true }).tap();
    await page.screenshot({
      path: `test-results/${name}-inspector.png`,
      fullPage: true,
    });
    const runtime = await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      heapUsedBytes: performance.memory?.usedJSHeapSize,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert.equal(runtime.horizontalOverflow, false);
    assert.deepEqual(errors, []);
    const run = {
      profile: name,
      viewport: profile.viewport,
      firstGraphMs,
      frameIntervalMedianMs: frames[Math.floor(frames.length * 0.5)],
      frameIntervalP95Ms: frames[Math.floor(frames.length * 0.95)],
      metrics,
      runtime,
      errors,
      checks: [
        "full-import-visible",
        "search-selection",
        "katex",
        "internal-unit-reference",
        "zoom",
        "pan",
        "pin",
        "pause",
        "edit-preserves-layout",
        "filter-hide-restore-preserves-id-pins-and-camera",
        "filter-retains-paused-layout",
        "empty-filter-recovery",
        "neighbourhood-focus-depth",
        "same-selection-focus",
        "node-drag",
        "search-no-results",
        "responsive-inspector",
        ...(name === "phone" ? ["touch-selection", "multitouch-pinch"] : []),
      ],
    };
    report.runs.push(run);
    console.log(JSON.stringify(run, null, 2));
    await context.close();
  }
} catch (error) {
  report.failure = error.message;
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({
      path: "test-results/browser-failure.png",
      fullPage: true,
    });
    await writeFile(
      "test-results/browser-failure.txt",
      await activePage.locator("body").innerText(),
    );
  }
  throw error;
} finally {
  await browser.close();
  await writeFile(
    "test-results/browser-report.json",
    JSON.stringify(report, null, 2) + "\n",
  );
}
