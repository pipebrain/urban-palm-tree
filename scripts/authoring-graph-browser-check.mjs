import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseURL =
  process.env.PREVIEW_URL || "http://127.0.0.1:4174/urban-palm-tree/";
const selectedId = "urn:hvacr:equation:steady-sensible-heat";
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
  note: "Mac Chromium. Phone uses touch dispatch and viewport emulation, not a physical device.",
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
    page.on("pageerror", (error) => errors.push(error.message));
    const run = { profile: phone ? "phone" : "desktop", errors };
    report.runs.push(run);
    await page.goto(baseURL);
    const graph = page.getByTestId("graph");
    const history = page.getByTestId("history-status");
    const inspect = page.getByTestId("inspector");
    const button = (name) => page.getByRole("button", { name, exact: true });
    const frames = () =>
      page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
    const state = async () => {
      await frames();
      return graph.evaluate((element) => ({
        x: Number(element.dataset.selectedWorldX),
        y: Number(element.dataset.selectedWorldY),
        pins: Number(element.dataset.pins),
        ticks: Number(element.dataset.ticks),
        count: Number(element.dataset.nodeCount),
        color: element.dataset.selectedColor,
        groups: Number(element.dataset.selectedGroupCount),
      }));
    };
    const undoCount = async () =>
      Number(await history.getAttribute("data-undo-count"));
    const samePosition = (actual, expected) => {
      assert.ok(
        Math.abs(actual.x - expected.x) < 0.001,
        `x: ${actual.x} versus ${expected.x}`,
      );
      assert.ok(
        Math.abs(actual.y - expected.y) < 0.001,
        `y: ${actual.y} versus ${expected.y}`,
      );
    };
    const searchPanel = async () => {
      if (phone) await button("Search").tap();
    };
    const inspectorPanel = async () => {
      if (phone) await button("Inspector").tap();
    };
    const mapPanel = async () => {
      if (phone) await button("Map").tap();
    };
    await graph.waitFor();
    await page.waitForFunction(
      () =>
        Number(document.querySelector("[data-testid=graph]")?.dataset.ticks) >=
        8,
    );
    assert.equal(await undoCount(), 0, "Force ticks create no history");
    await button("Pause").click();
    await searchPanel();
    await page
      .getByRole("textbox", { name: "Search all nodes" })
      .fill(selectedId);
    await page.locator(`.node-row[data-node-id="${selectedId}"]`).click();
    await inspect.waitFor();
    await inspect
      .getByRole("button", { name: "Show on map", exact: true })
      .click();
    await mapPanel();
    const before = await state();
    assert.equal(before.pins, 0);
    const cdp = phone ? await context.newCDPSession(page) : undefined;
    const drag = async (cancel = false) => {
      const box = await page.locator("canvas").boundingBox();
      assert.ok(box);
      const start = {
        x: box.x + Number(await graph.getAttribute("data-selected-x")),
        y: box.y + Number(await graph.getAttribute("data-selected-y")),
      };
      if (cdp)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ ...start, id: 1 }],
        });
      else {
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
      }
      for (let step = 1; step <= 8; step++) {
        const point = { x: start.x + step * 4, y: start.y + step * 2 };
        if (cdp)
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ ...point, id: 1 }],
          });
        else await page.mouse.move(point.x, point.y);
      }
      if (cdp)
        await cdp.send("Input.dispatchTouchEvent", {
          type: cancel ? "touchCancel" : "touchEnd",
          touchPoints: [],
        });
      else {
        if (cancel)
          await page
            .locator("canvas")
            .dispatchEvent("pointercancel", { pointerId: 1 });
        await page.mouse.up();
      }
      await frames();
    };
    await drag();
    const moved = await state();
    assert.equal(
      await undoCount(),
      1,
      "Eight drag moves produce one history step",
    );
    assert.equal(moved.pins, 1);
    assert.ok(Math.hypot(moved.x - before.x, moved.y - before.y) > 5);
    await button("Undo").click();
    const undone = await state();
    samePosition(undone, before);
    assert.equal(undone.pins, 0);
    assert.equal(await undoCount(), 0);
    await button("Redo").click();
    samePosition(await state(), moved);
    assert.equal((await state()).pins, 1);
    await button("Unpin").click();
    assert.equal(await undoCount(), 2);
    assert.equal((await state()).pins, 0);
    await button("Undo").click();
    assert.equal((await state()).pins, 1);
    await button("Redo").click();
    assert.equal((await state()).pins, 0);
    const ticks = (await state()).ticks;
    await button("Resume").click();
    await page.waitForFunction(
      (previous) =>
        Number(document.querySelector("[data-testid=graph]")?.dataset.ticks) >=
        previous + 12,
      ticks,
    );
    await button("Pause").click();
    await frames();
    const afterForce = await state();
    assert.equal(await undoCount(), 2, "Resumed force ticks create no history");
    await button("Pin").click();
    assert.equal(await undoCount(), 3);
    await button("Undo").click();
    samePosition(await state(), afterForce);
    assert.equal(
      (await state()).pins,
      0,
      "Undo restores the unpinned starting state after force movement",
    );
    await drag(true);
    samePosition(await state(), afterForce);
    assert.equal((await state()).pins, 0);
    assert.equal(await undoCount(), 2, "Cancelled drag creates no history");
    await button("Pin").click();
    const pinned = await state();
    if (phone) {
      // The preceding unpinned force run may move the node beyond the camera.
      await inspectorPanel();
      await inspect
        .getByRole("button", { name: "Show on map", exact: true })
        .click();
      await state();
      await page.evaluate(() => {
        window.graphTapTarget = undefined;
        document.addEventListener(
          "click",
          (event) => {
            window.graphTapTarget = event.target instanceof HTMLCanvasElement;
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
      await inspect.waitFor();
      assert.equal(await inspect.getAttribute("data-node-id"), selectedId);
      assert.equal(
        await page.evaluate(() => window.graphTapTarget),
        true,
        "The completed touch click stays on canvas instead of activating an inspector control",
      );
      await mapPanel();
      run.touchSelection =
        "Canvas tap preserves selected identity and cannot click through to inspector";
    }
    await page.locator(".map-filters > summary").click();
    await page
      .getByRole("combobox", { name: "Map node type" })
      .selectOption("quantity");
    assert.equal((await state()).pins, 1);
    assert.equal(await graph.getAttribute("data-visible-pins"), "0");
    await button("Undo").click();
    assert.equal((await state()).pins, 0, "Undo reaches a filtered-out node");
    await button("Redo").click();
    assert.equal((await state()).pins, 1, "Redo restores a filtered-out pin");
    await button("Reset map").click();
    samePosition(await state(), pinned);
    assert.equal(await graph.getAttribute("data-visible-pins"), "1");
    assert.equal(await undoCount(), 3, "Filtering and fit create no history");
    run.placement = {
      before,
      moved,
      afterForce,
      pinned,
      checks:
        "single drag / undo / redo / pin / unpin / ticks / cancelled drag / filtering / hidden-node history",
    };

    await searchPanel();
    await page.locator(".groups-panel > summary").click();
    for (const [name, color] of [
      ["HVAC study", "#2266aa"],
      ["Equations", "#aa6622"],
    ]) {
      await button("New group").click();
      await page.getByRole("textbox", { name: "Group name" }).fill(name);
      await page.getByLabel("Group colour", { exact: true }).fill(color);
      await button("Save group").click();
    }
    await inspectorPanel();
    await inspect.locator(".node-groups > summary").click();
    await page.getByRole("checkbox", { name: "Member of HVAC study" }).check();
    await page.getByRole("checkbox", { name: "Member of Equations" }).check();
    await mapPanel();
    assert.equal((await state()).groups, 2);
    assert.equal((await state()).color, "#2266aa");
    const groupId = await page
      .locator(".group-item")
      .filter({ hasText: "HVAC study" })
      .getAttribute("data-group-id");
    assert.ok(groupId);
    await page
      .getByRole("combobox", { name: "Map group" })
      .selectOption(groupId);
    assert.equal((await state()).count, 1);
    samePosition(await state(), pinned);
    const groupHistory = await undoCount();
    await searchPanel();
    await button("Delete group HVAC study").click();
    await mapPanel();
    const deletedGroup = await state();
    assert.equal(
      deletedGroup.count,
      1556,
      "Deleting a group retains all concepts",
    );
    assert.equal(deletedGroup.groups, 1);
    assert.equal(deletedGroup.color, "#aa6622");
    assert.equal(await undoCount(), groupHistory + 1);
    await button("Undo").click();
    assert.equal((await state()).groups, 2);
    assert.equal((await state()).color, "#2266aa");
    samePosition(await state(), pinned);
    run.groups = {
      primaryColor: "#2266aa",
      overlappingCount: 2,
      filteredCount: 1,
      countAfterGroupDeletion: deletedGroup.count,
    };
    assert.deepEqual(errors, []);
    await page.screenshot({
      path: `test-results/m2-graph-${run.profile}.png`,
      fullPage: true,
    });
    await context.close();
  }
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.error = error.stack || String(error);
  throw error;
} finally {
  await writeFile(
    "test-results/m2-graph-browser-report.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
