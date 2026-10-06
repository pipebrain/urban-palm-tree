import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseURL = process.env.PREVIEW_URL || "http://127.0.0.1:4173/hvacr-m0/";
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
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const began = performance.now();
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    const graph = page.getByTestId("graph");
    await graph.waitFor();
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
      .fill("Sensible heat transfer");
    const row = page.getByRole("button", {
      name: /Sensible heat transfer App-authored example/,
    });
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
      await page.locator(".inspector code").textContent(),
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
    await page.getByText("Try editing this example", { exact: true }).click();
    await page
      .getByRole("textbox", { name: "Example display name" })
      .fill("Sensible heat — local draft");
    await page
      .getByRole("textbox", { name: "Example LaTeX" })
      .fill("\\dot{Q}=\\dot{m}c_p(T_2-T_1)");
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
        "responsive-inspector",
        ...(name === "phone" ? ["touch-selection", "multitouch-pinch"] : []),
      ],
    };
    report.runs.push(run);
    console.log(JSON.stringify(run, null, 2));
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(
    "test-results/browser-report.json",
    JSON.stringify(report, null, 2) + "\n",
  );
}
