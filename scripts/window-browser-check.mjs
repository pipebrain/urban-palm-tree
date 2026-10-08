import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const engine = process.env.BROWSER_ENGINE || "chromium";
assert.ok(["chromium", "webkit"].includes(engine));
const baseURL =
  process.env.PREVIEW_URL || "http://127.0.0.1:4175/urban-palm-tree/";
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
const appVersion = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
).version;
const report = {
  checkedAt: new Date().toISOString(),
  baseURL,
  engine,
  appVersion,
  browser: browser.version(),
  note: "Mac browser automation; phone is viewport/touch emulation, not physical-device acceptance. Geometry is measured from rendered Dockview groups.",
  runs: [],
};
const titles = {
  library: "Library",
  graph: "Knowledge Map",
  inspector: "Inspector",
  units: "Units",
};
const equationId = "urn:hvacr:equation:steady-sensible-heat";
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
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const run = {
      profile: phone ? "phone" : "desktop",
      checks: [],
      layouts: {},
      errors,
    };
    report.runs.push(run);
    const click = (target) => (phone ? target.tap() : target.click());
    const button = (name) => page.getByRole("button", { name, exact: true });
    const item = (menu, name) =>
      menu
        .getByRole("menuitem", { name, exact: true })
        .or(menu.getByRole("menuitemcheckbox", { name, exact: true }));
    const openMenu = async (name) => {
      const trigger = page
        .getByRole("menubar")
        .getByRole("menuitem", { name, exact: true });
      if ((await trigger.getAttribute("aria-expanded")) !== "true")
        await click(trigger);
      return page.getByRole("menu", { name, exact: true });
    };
    const action = async (menu, name) =>
      click(item(await openMenu(menu), name));
    const show = async (id) => action("View", titles[id]);
    const closeButton = (id) =>
      page.getByRole("button", {
        name: new RegExp(`^Close ${titles[id]}$`, "i"),
      });
    const close = async (id) => click(closeButton(id));
    const history = page.getByTestId("history-status");
    const counts = async () => ({
      undo: Number(await history.getAttribute("data-undo-count")),
      redo: Number(await history.getAttribute("data-redo-count")),
    });
    const tabCount = async () =>
      phone
        ? page.locator(".mobile-nav [data-panel-id]").count()
        : page.locator(".dv-tab").count();
    const frame = () =>
      page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
    const inspector = page.getByTestId("inspector");
    const select = async (id) => {
      await show("library");
      await page.getByLabel("Search all nodes", { exact: true }).fill(id);
      await click(page.locator(`.node-row[data-node-id="${id}"]`));
      await inspector.waitFor();
      assert.equal(await inspector.getAttribute("data-node-id"), id);
    };
    const geometry = async () => {
      await frame();
      return page.locator(".dv-groupview").evaluateAll((groups) =>
        groups
          .map((group) => {
            const { x, y, width, height } = group.getBoundingClientRect();
            return { x, y, width, height };
          })
          .filter((box) => box.width > 0 && box.height > 0),
      );
    };
    const tile = async (layout) => {
      await action("Window", /^Tile tabs$/i);
      const submenu = page.getByRole("menu", { name: /^Tile tabs$/i });
      await click(item(submenu, new RegExp(`^${layout}$`, "i")));
      await frame();
    };
    const assertGeometry = async (layout) => {
      const boxes = await geometry();
      assert.equal(
        boxes.length,
        4,
        `${layout} exposes four independent panel groups`,
      );
      const workspace = await page.locator(".workspace").boundingBox();
      for (const box of boxes) {
        assert.ok(box.width > 100 && box.height > 100);
        assert.ok(box.x >= workspace.x - 2 && box.y >= workspace.y - 2);
        assert.ok(box.x + box.width <= workspace.x + workspace.width + 2);
        assert.ok(box.y + box.height <= workspace.y + workspace.height + 2);
      }
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i],
            b = boxes[j];
          assert.ok(
            a.x + a.width <= b.x + 3 ||
              b.x + b.width <= a.x + 3 ||
              a.y + a.height <= b.y + 3 ||
              b.y + b.height <= a.y + 3,
            `${layout} groups do not overlap`,
          );
        }
      const spread = (key) =>
        Math.max(...boxes.map((box) => box[key])) -
        Math.min(...boxes.map((box) => box[key]));
      if (layout === "Columns") {
        assert.ok(spread("y") < 4 && spread("height") < 4);
        assert.ok(spread("x") > workspace.width / 2);
      } else if (layout === "Rows") {
        assert.ok(spread("x") < 4 && spread("width") < 4);
        assert.ok(spread("y") > workspace.height / 2);
        const canvas = page.locator("canvas");
        await canvas.scrollIntoViewIfNeeded();
        const canvasBox = await canvas.boundingBox();
        assert.ok(
          canvasBox.height >= 120,
          "The map canvas cannot collapse in a short row",
        );
        const zoom = button("Zoom in");
        await zoom.scrollIntoViewIfNeeded();
        const panelBox = await page.locator(".map-panel").boundingBox();
        const zoomBox = await zoom.boundingBox();
        assert.ok(
          zoomBox.y >= panelBox.y &&
            zoomBox.y + zoomBox.height <= panelBox.y + panelBox.height,
        );
        const graph = page.getByTestId("graph");
        const zoomBefore = Number(await graph.getAttribute("data-zoom"));
        await click(zoom);
        await page.waitForFunction(
          (before) =>
            Number(
              document.querySelector('[data-testid="graph"]').dataset.zoom,
            ) > before,
          zoomBefore,
        );
        const scrollTop = await page
          .locator(".map-panel")
          .evaluate((panel) => panel.scrollTop);
        assert.ok(
          scrollTop > 0,
          "The short map row scrolls to its canvas controls",
        );
        assert.deepEqual(
          await geometry(),
          boxes,
          "Scrolling the map preserves the row layout bounds",
        );
        run.rowCanvas = {
          height: canvasBox.height,
          viewportHeight: panelBox.height,
          scrollTop,
          zoomBefore,
          zoomAfter: Number(await graph.getAttribute("data-zoom")),
        };
      } else {
        const xs = [...new Set(boxes.map((box) => Math.round(box.x / 4)))];
        const ys = [...new Set(boxes.map((box) => Math.round(box.y / 4)))];
        assert.equal(xs.length, 2, "Quarters has two columns");
        assert.equal(ys.length, 2, "Quarters has two rows");
      }
      run.layouts[layout] = boxes;
      await page.screenshot({
        path: `test-results/window-${engine}-desktop-${layout.toLowerCase()}.png`,
        fullPage: true,
      });
    };
    try {
      await page.goto(baseURL);
      await page.getByTestId("graph").waitFor();
      assert.equal(await tabCount(), 4);
      assert.deepEqual(await counts(), { undo: 0, redo: 0 });
      const mark = page.locator(".brand-mark");
      assert.equal(await mark.locator("svg").count(), 1);
      assert.equal(await mark.getAttribute("aria-disabled"), "true");
      const markBox = await mark.boundingBox();
      if (phone)
        await page.touchscreen.tap(
          markBox.x + markBox.width / 2,
          markBox.y + markBox.height / 2,
        );
      else
        await page.mouse.click(
          markBox.x + markBox.width / 2,
          markBox.y + markBox.height / 2,
        );
      assert.equal(
        await page.getByRole("menu").count(),
        0,
        "System mark is an inert visual control",
      );
      assert.equal(await page.getByRole("dialog").isVisible(), false);
      assert.deepEqual(await counts(), { undo: 0, redo: 0 });
      const appMenu = page
        .getByRole("menubar")
        .getByRole("menuitem", { name: /^HVACRbuild(?:\.app)?$/ });
      assert.equal(await appMenu.count(), 1);
      await click(appMenu);
      await click(
        page.getByRole("menuitem", {
          name: /^About(?: HVACRbuild(?:\.app)?)?$/,
        }),
      );
      await page.getByRole("dialog").waitFor();
      await click(button("Close About"));
      run.checks.push(
        "Inert SVG system icon is separate from the application About menu",
      );

      await action("Develop", "Enter Edit Mode");
      await show("library");
      await click(button("Create concept"));
      await page
        .getByLabel("Concept name", { exact: true })
        .fill("Window workflow fixture");
      await page
        .getByLabel("Concept definition", { exact: true })
        .fill(
          "Authored content survives panel closing, reopening and rearrangement.",
        );
      const unsavedHistory = await counts();
      if (!phone) {
        for (const key of ["Delete", "Backspace"]) {
          await page
            .locator(".dv-tab")
            .filter({ hasText: "Inspector" })
            .focus();
          await page.keyboard.press(key);
          await page.locator(".authoring-error").waitFor();
          assert.match(
            await page.locator(".authoring-error").innerText(),
            /Save or cancel/i,
          );
          assert.equal(
            await page.getByLabel("Concept name", { exact: true }).inputValue(),
            "Window workflow fixture",
          );
          assert.equal(
            await tabCount(),
            4,
            `${key} cannot close the tab holding an unsaved draft`,
          );
          assert.deepEqual(await counts(), unsavedHistory);
          await click(button("Dismiss"));
        }
      }
      await close("inspector");
      await page.locator(".authoring-error").waitFor();
      assert.match(
        await page.locator(".authoring-error").innerText(),
        /Save or cancel/i,
      );
      assert.equal(
        await page.getByLabel("Concept name", { exact: true }).inputValue(),
        "Window workflow fixture",
      );
      assert.deepEqual(await counts(), unsavedHistory);
      await click(button("Dismiss"));
      if (phone) await close("library");
      else {
        await page.locator(".dv-tab").filter({ hasText: "Library" }).focus();
        await page.keyboard.press("Delete");
      }
      assert.equal(
        await tabCount(),
        3,
        "An unrelated panel can close while a draft stays open",
      );
      assert.equal(
        await page.getByLabel("Concept name", { exact: true }).inputValue(),
        "Window workflow fixture",
      );
      await show("library");
      await show("inspector");
      assert.equal(
        await page.getByLabel("Concept name", { exact: true }).inputValue(),
        "Window workflow fixture",
      );
      assert.deepEqual(await counts(), unsavedHistory);
      await click(button("Save quantity"));
      const createdId = await inspector.getAttribute("data-node-id");
      assert.ok(createdId?.startsWith("urn:hvacr:node:"));
      assert.equal(
        await inspector.locator("h2").innerText(),
        "Window workflow fixture",
      );
      if (!phone) {
        const savedHistory = await counts();
        for (const key of ["Delete", "Backspace"]) {
          await page
            .locator(".dv-tab")
            .filter({ hasText: "Inspector" })
            .focus();
          await page.keyboard.press(key);
          assert.equal(
            await tabCount(),
            3,
            `${key} closes a saved panel through application state`,
          );
          await show("inspector");
          assert.equal(await tabCount(), 4);
          assert.equal(
            await inspector.locator("h2").innerText(),
            "Window workflow fixture",
          );
          assert.deepEqual(await counts(), savedHistory);
        }
        run.checks.push(
          "Native outer-tab Delete/Backspace respect draft guards and panel state; unrelated tabs close without discarding another panel's draft",
        );
      }
      run.checks.push(
        "Closing an editor tab refuses unsaved draft loss; saving creates stable authored content",
      );

      const beforeCloseAll = await counts();
      await action("Window", "Close All Tabs");
      await page
        .getByRole("heading", { name: "All tabs are closed", exact: true })
        .waitFor();
      assert.equal(await tabCount(), 0);
      assert.deepEqual(await counts(), beforeCloseAll);
      await show("library");
      assert.equal(
        await tabCount(),
        1,
        "View opens only the requested closed panel",
      );
      assert.deepEqual(await counts(), beforeCloseAll);
      await page
        .getByLabel("Search all nodes", { exact: true })
        .fill(createdId);
      await click(page.locator(`.node-row[data-node-id="${createdId}"]`));
      assert.equal(
        await tabCount(),
        2,
        "Concept selection opens Inspector without restoring all tabs",
      );
      assert.equal(
        await inspector.locator("h2").innerText(),
        "Window workflow fixture",
      );
      await close("inspector");
      assert.equal(await tabCount(), 1);
      await select(equationId);
      assert.equal(await tabCount(), 2);
      await click(inspector.locator(".binding .unit-link").first());
      await page.getByTestId("unit-inspector").waitFor();
      assert.equal(
        await tabCount(),
        3,
        "Unit links automatically open the closed Units panel",
      );
      await show("inspector");
      await click(
        inspector.getByRole("button", { name: "Show on map", exact: true }),
      );
      await page.getByTestId("graph").waitFor();
      assert.equal(
        await tabCount(),
        4,
        "Show on map automatically opens the closed graph panel",
      );
      run.checks.push(
        "Close all preserves content/history; View opens one panel; concept, unit and map navigation open only their required panels",
      );

      const layoutHistory = await counts();
      if (phone) {
        const windowMenu = await openMenu("Window");
        assert.equal(
          await item(windowMenu, /^Tile tabs$/i).getAttribute("aria-disabled"),
          "true",
        );
        assert.equal(
          await item(windowMenu, "Merge All Tabs").getAttribute(
            "aria-disabled",
          ),
          "true",
        );
        await page.keyboard.press("Escape");
        await close("library");
        assert.equal(await tabCount(), 3);
        await show("library");
        assert.equal(await tabCount(), 4);
        await show("inspector");
        await close("inspector");
        assert.equal(await tabCount(), 3);
        await show("inspector");
        assert.equal(await tabCount(), 4);
        run.checks.push(
          "Phone tab close/reopen works by touch; desktop-only tiling/merging stays disabled",
        );
      } else {
        for (const layout of ["Columns", "Rows", "Quarters"]) {
          await tile(layout);
          await assertGeometry(layout);
          assert.deepEqual(await counts(), layoutHistory);
        }
        const floatingLibrary = page
          .locator(".dv-tab")
          .filter({ hasText: "Library" });
        const floatStart = await floatingLibrary.boundingBox();
        await page.keyboard.down("Shift");
        await page.mouse.move(
          floatStart.x + 25,
          floatStart.y + floatStart.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(floatStart.x + 130, floatStart.y + 100, {
          steps: 5,
        });
        await page.mouse.up();
        await page.keyboard.up("Shift");
        await frame();
        assert.equal(
          await page
            .locator(".dv-resize-container .dv-tab")
            .filter({ hasText: "Library" })
            .count(),
          1,
          "Shift-drag floats the Library tab",
        );
        await tile("Quarters");
        assert.equal(
          await page.locator(".dv-resize-container").count(),
          0,
          "Tiling docks the floating anchor back into the main grid",
        );
        await assertGeometry("Quarters");
        assert.deepEqual(await counts(), layoutHistory);
        run.checks.push(
          "Shift-dragged floating Library returns to the grid when tiled; short Rows retain a scrollable canvas and usable zoom controls",
        );
        await action("Window", "Merge All Tabs");
        assert.equal((await geometry()).length, 1);
        assert.equal(await tabCount(), 4);
        const libraryTab = page
          .locator(".dv-tab")
          .filter({ hasText: "Library" });
        await libraryTab.hover();
        assert.equal(await closeButton("library").isVisible(), true);
        await close("library");
        assert.equal(
          await tabCount(),
          3,
          "Inactive tab closes using its revealed hover button",
        );
        const unitsClose = closeButton("units");
        await unitsClose.focus();
        assert.equal(await unitsClose.isVisible(), true);
        await page.keyboard.press("Enter");
        assert.equal(
          await tabCount(),
          2,
          "Inactive tab closes using its keyboard-focus button",
        );
        await show("inspector");
        await close("inspector");
        assert.equal(
          await tabCount(),
          1,
          "Active merged tab closes independently",
        );
        await show("inspector");
        assert.equal(await tabCount(), 2);
        run.checks.push(
          "Columns, rows and quarters have correct nonoverlapping geometry; merged active/inactive tabs close by click, hover and keyboard focus",
        );
      }
      assert.deepEqual(
        await counts(),
        layoutHistory,
        "All panel visibility/layout actions preserve the shared timeline",
      );
      await select(createdId);
      assert.equal(
        await inspector.locator("h2").innerText(),
        "Window workflow fixture",
      );
      assert.match(
        await inspector.innerText(),
        /Authored content survives panel closing/,
      );
      const beforeFinalClose = await counts();
      await action("Window", "Close All Tabs");
      await show("inspector");
      assert.equal(await tabCount(), 1);
      assert.equal(await inspector.getAttribute("data-node-id"), createdId);
      assert.equal(
        await inspector.locator("h2").innerText(),
        "Window workflow fixture",
      );
      assert.deepEqual(await counts(), beforeFinalClose);
      run.checks.push(
        "Authored content and selection survive every close/reopen/tile/merge action; reopening Inspector alone restores the current concept",
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.deepEqual(errors, []);
      run.history = await counts();
      run.passed = true;
      await page.screenshot({
        path: `test-results/window-${engine}-${run.profile}.png`,
        fullPage: true,
      });
    } catch (error) {
      run.failure = error.stack || String(error);
      await page.screenshot({
        path: `test-results/window-${engine}-${run.profile}-failure.png`,
        fullPage: true,
      });
      await writeFile(
        `test-results/window-${engine}-${run.profile}-failure.txt`,
        await page.locator("body").innerText(),
      );
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(
    `test-results/window-${engine}-report.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
}
console.log(JSON.stringify(report, null, 2));
