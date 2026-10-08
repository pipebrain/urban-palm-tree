import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
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
const report = {
  checkedAt: new Date().toISOString(),
  baseURL,
  engine,
  browser: browser.version(),
  note: "Mac browser automation. Phone means viewport/touch emulation, not physical-device acceptance. Chromium phone drags use touch dispatch; WebKit drags use mouse pointer events.",
  runs: [],
};
await mkdir("test-results", { recursive: true });
const q = (name) => `http://qudt.org/vocab/quantitykind/${name}`;
const equationId = "urn:hvacr:equation:steady-sensible-heat";
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
    const run = { profile: phone ? "phone" : "desktop", checks: [], errors };
    report.runs.push(run);
    const click = (locator) => (phone ? locator.tap() : locator.click());
    const button = (name) => page.getByRole("button", { name, exact: true });
    const trigger = (name) =>
      page.getByRole("menubar").getByRole("menuitem", { name, exact: true });
    const openMenu = async (name) => {
      await click(trigger(name));
      await page.getByRole("menu", { name, exact: true }).waitFor();
    };
    const menuAction = async (name, action, checkbox = false) => {
      await openMenu(name);
      await click(
        page
          .getByRole("menu", { name, exact: true })
          .getByRole(checkbox ? "menuitemcheckbox" : "menuitem", {
            name: action,
            exact: true,
          }),
      );
    };
    const frame = () =>
      page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
    const history = page.getByTestId("history-status");
    const counts = async () => ({
      undo: Number(await history.getAttribute("data-undo-count")),
      redo: Number(await history.getAttribute("data-redo-count")),
    });
    const inspector = page.getByTestId("inspector");
    const graph = page.getByTestId("graph");
    const searchPanel = async () => {
      if (phone) await click(button("Search"));
    };
    const inspectPanel = async () => {
      if (phone) await click(button("Inspector"));
    };
    const select = async (id) => {
      await searchPanel();
      await page.getByLabel("Search all nodes", { exact: true }).fill(id);
      await click(page.locator(`.node-row[data-node-id="${id}"]`));
      assert.equal(await inspector.getAttribute("data-node-id"), id);
    };
    const selected = async (id, label) => {
      assert.equal(await inspector.getAttribute("data-node-id"), id);
      if (label)
        assert.equal(await inspector.locator("h2").textContent(), label);
    };
    const noOverflow = async () => {
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        "The application must not overflow the viewport",
      );
      const popup = page.getByRole("menu");
      if (await popup.count()) {
        const box = await popup.boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= (phone ? 390 : 1440));
      }
    };
    try {
      await page.goto(baseURL);
      await graph.waitFor();
      assert.equal(await graph.getAttribute("data-node-count"), "1556");
      assert.deepEqual(await counts(), { undo: 0, redo: 0 });
      assert.equal(await history.getAttribute("data-edit-mode"), "false");
      assert.equal(await page.locator(".session-status").isVisible(), true);
      assert.match(
        await page.locator(".session-status").innerText(),
        /Browse mode/,
      );
      assert.equal(
        await page.locator(".workspace-trail, .authoring-toolbar").count(),
        0,
      );
      assert.equal(await button("Create concept").count(), 0);
      assert.equal(await button("Edit concept").count(), 0);
      assert.equal(await page.locator(".brand-mark svg").count(), 1);
      assert.equal((await page.locator(".brand-mark").innerText()).trim(), "");
      assert.equal(await page.locator(".app-menu-name").isVisible(), !phone);
      for (const target of await page
        .getByRole("menubar")
        .getByRole("menuitem")
        .all()) {
        const box = await target.boundingBox();
        assert.ok(
          box.height >= 44,
          "Menu triggers must have 44px touch targets",
        );
        if (phone) assert.ok(box.x >= 0 && box.x + box.width <= 390);
      }
      await noOverflow();
      run.checks.push(
        "Compact SVG brand, six accessible menus, old toolbars removed, Browse mode by default, 44px menu triggers, no overflow",
      );

      await openMenu("File");
      const fileItems = page
        .getByRole("menu", { name: "File", exact: true })
        .getByRole("menuitem");
      assert.equal(await fileItems.count(), 5);
      for (const item of await fileItems.all()) {
        assert.equal(await item.getAttribute("aria-disabled"), "true");
        assert.ok((await item.boundingBox()).height >= 44);
      }
      await noOverflow();
      await page.keyboard.press("Escape");
      await trigger("HVACRbuild.app").focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(
        await page.locator(":focus").getAttribute("aria-label"),
        "File",
      );
      await page.keyboard.press("Enter");
      assert.equal(
        await page.locator(":focus").getAttribute("aria-label"),
        "New",
      );
      await page.keyboard.press("Enter");
      assert.deepEqual(await counts(), { undo: 0, redo: 0 });
      await page.keyboard.press("ArrowDown");
      assert.equal(
        await page.locator(":focus").getAttribute("aria-label"),
        "Open…",
      );
      await page.keyboard.press("End");
      assert.equal(
        await page.locator(":focus").getAttribute("aria-label"),
        "Export…",
      );
      await page.keyboard.press("ArrowRight");
      assert.equal(
        await page.locator(":focus").getAttribute("aria-label"),
        "Undo",
      );
      assert.equal(
        await page.locator(":focus").getAttribute("aria-disabled"),
        "true",
      );
      await page.keyboard.press("Escape");
      assert.equal(
        await page.locator(":focus").getAttribute("aria-label"),
        "Edit",
      );
      await openMenu("Window");
      await page.keyboard.press("Tab");
      assert.equal(await page.getByRole("menu").count(), 0);
      assert.equal(
        await page.evaluate(() =>
          Boolean(
            document.activeElement?.closest(".app-menu-bar, .app-menu-popup"),
          ),
        ),
        false,
      );
      assert.notEqual(
        await page.evaluate(() => document.activeElement?.tagName),
        "BODY",
      );
      run.checks.push(
        "Disabled M3 file actions are keyboard discoverable and inert; arrows, Enter, Escape, and Tab preserve focus",
      );

      await menuAction("View", "Show status bar", true);
      assert.equal(
        await page.getByLabel("Status bar", { exact: true }).count(),
        0,
      );
      await openMenu("View");
      assert.equal(
        await page
          .getByRole("menuitemcheckbox", {
            name: "Show status bar",
            exact: true,
          })
          .getAttribute("aria-checked"),
        "false",
      );
      await click(
        page.getByRole("menuitemcheckbox", {
          name: "Show status bar",
          exact: true,
        }),
      );
      assert.equal(
        await page.getByLabel("Status bar", { exact: true }).count(),
        1,
      );
      await menuAction("HVACRbuild.app", "About HVACRbuild.app");
      await page
        .getByRole("dialog", { name: "HVACRbuild.app", exact: true })
        .waitFor();
      await click(button("Close About"));
      assert.equal(await page.getByRole("dialog").isVisible(), false);
      await menuAction("HVACRbuild.app", "About HVACRbuild.app");
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").isVisible(), false);
      run.checks.push(
        "Status bar toggles and restores; About opens and closes by button and Escape",
      );

      await select(equationId);
      assert.equal(await button("Edit concept").count(), 0);
      await click(
        inspector.getByRole("button", { name: "Show on map", exact: true }),
      );
      await click(button("Pause"));
      await frame();
      const beforePan = await graph.evaluate((element) => ({
        x: Number(element.dataset.cameraX),
        y: Number(element.dataset.cameraY),
        pins: Number(element.dataset.pins),
      }));
      const beforePanHistory = await counts();
      const canvas = page.locator("canvas");
      const canvasBox = await canvas.boundingBox();
      const start = {
        x: canvasBox.x + Number(await graph.getAttribute("data-selected-x")),
        y: canvasBox.y + Number(await graph.getAttribute("data-selected-y")),
      };
      if (phone && engine === "chromium") {
        const cdp = await context.newCDPSession(page);
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ ...start, id: 1 }],
        });
        for (let i = 1; i <= 8; i++)
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: start.x + i * 4, y: start.y + i * 3, id: 1 }],
          });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await cdp.detach();
      } else {
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.mouse.move(start.x + 32, start.y + 24, { steps: 8 });
        await page.mouse.up();
      }
      await frame();
      const afterPan = await graph.evaluate((element) => ({
        x: Number(element.dataset.cameraX),
        y: Number(element.dataset.cameraY),
        pins: Number(element.dataset.pins),
      }));
      assert.ok(
        Math.hypot(afterPan.x - beforePan.x, afterPan.y - beforePan.y) > 10,
      );
      assert.equal(afterPan.pins, beforePan.pins);
      assert.deepEqual(await counts(), beforePanHistory);
      assert.equal(await page.locator(".authoring-error").count(), 0);
      run.checks.push(
        "Dragging a selected node in Browse mode pans without pinning, authoring, or errors",
      );

      await select(q("Pressure"));
      const originalName = await inspector.locator("h2").innerText();
      await menuAction("Develop", "Enter Edit Mode", true);
      assert.equal(await history.getAttribute("data-edit-mode"), "true");
      assert.equal(await page.locator(".session-status").isVisible(), true);
      assert.match(
        await page.locator(".session-status").innerText(),
        /Edit mode/,
      );
      await searchPanel();
      assert.equal(await button("Create concept").isVisible(), true);
      await inspectPanel();
      await click(button("Edit concept"));
      await page
        .getByLabel("Concept name", { exact: true })
        .fill("GUI pressure");
      await page.getByLabel("Concept symbol", { exact: true }).fill("P_gui");
      const beforeSave = await counts();
      await click(button("Save quantity"));
      await selected(q("Pressure"), "GUI pressure");
      assert.equal(
        (await counts()).undo,
        beforeSave.undo + 1,
        "One save and resulting selection form one history action",
      );
      await select(q("Temperature"));
      const mixedHistory = await counts();
      await menuAction("Edit", "Undo");
      await selected(q("Pressure"), "GUI pressure");
      await menuAction("Edit", "Undo");
      await selected(q("Pressure"), originalName);
      await menuAction("Edit", "Undo");
      await selected(equationId);
      await menuAction("Edit", "Redo");
      await selected(q("Pressure"), originalName);
      await menuAction("Edit", "Redo");
      await selected(q("Pressure"), "GUI pressure");
      await menuAction("Edit", "Redo");
      await selected(q("Temperature"));
      assert.deepEqual(await counts(), mixedHistory);
      run.checks.push(
        "Edit mode unlocks authoring; Save is atomic; one Undo/Redo timeline traverses references and content edits in order",
      );

      await click(button("Edit concept"));
      await page
        .getByLabel("Concept name", { exact: true })
        .fill("Unsaved GUI draft");
      const beforeGuard = await counts();
      const guarded = async (menu, action, checkbox = false) => {
        await menuAction(menu, action, checkbox);
        await page.locator(".authoring-error").waitFor();
        assert.match(
          await page.locator(".authoring-error").innerText(),
          /Save or cancel the open editor/,
        );
        assert.equal(
          await page.getByLabel("Concept name", { exact: true }).inputValue(),
          "Unsaved GUI draft",
        );
        assert.equal(await history.getAttribute("data-edit-mode"), "true");
        assert.deepEqual(await counts(), beforeGuard);
        await click(button("Dismiss"));
      };
      await guarded("Develop", "Leave Edit Mode", true);
      await guarded("Window", "Close all tabs");
      if (phone) {
        await openMenu("Window");
        assert.equal(
          await page
            .getByRole("menuitem", { name: "Merge all tabs", exact: true })
            .getAttribute("aria-disabled"),
          "true",
        );
        await page.keyboard.press("Escape");
      } else await guarded("Window", "Merge all tabs");
      await guarded("Edit", "Undo");
      await searchPanel();
      await page
        .getByLabel("Search all nodes", { exact: true })
        .fill(q("Pressure"));
      await click(page.locator(`.node-row[data-node-id="${q("Pressure")}"]`));
      await page.locator(".authoring-error").waitFor();
      await inspectPanel();
      assert.equal(
        await page.getByLabel("Concept name", { exact: true }).inputValue(),
        "Unsaved GUI draft",
      );
      assert.deepEqual(await counts(), beforeGuard);
      await click(button("Dismiss"));
      await searchPanel();
      await click(button("Unit dictionary"));
      await page
        .getByLabel("Search unit dictionary", { exact: true })
        .fill("DEG_C");
      await click(page.locator(".node-row").first());
      await page.locator(".authoring-error").waitFor();
      await inspectPanel();
      assert.equal(
        await page.getByLabel("Concept name", { exact: true }).inputValue(),
        "Unsaved GUI draft",
      );
      assert.deepEqual(await counts(), beforeGuard);
      await click(button("Dismiss"));
      await searchPanel();
      await click(button("Concepts"));
      await click(button("Create concept"));
      await page.locator(".authoring-error").waitFor();
      await inspectPanel();
      assert.equal(
        await page.getByLabel("Concept name", { exact: true }).inputValue(),
        "Unsaved GUI draft",
      );
      assert.deepEqual(await counts(), beforeGuard);
      await click(button("Dismiss"));
      await page.setViewportSize(
        phone ? { width: 1024, height: 768 } : { width: 390, height: 844 },
      );
      await frame();
      assert.equal(
        await page.getByLabel("Concept name", { exact: true }).inputValue(),
        "Unsaved GUI draft",
      );
      assert.equal(await page.locator(".mobile-nav").count(), phone ? 1 : 0);
      if (phone) {
        await click(button("Cancel edit"));
        await frame();
        assert.equal(await page.locator(".mobile-nav").count(), 0);
      }
      await page.setViewportSize(
        phone ? { width: 390, height: 844 } : { width: 1440, height: 960 },
      );
      await frame();
      assert.deepEqual(await counts(), beforeGuard);
      if (!phone) await click(button("Cancel edit"));
      await menuAction("Develop", "Leave Edit Mode", true);
      assert.equal(await history.getAttribute("data-edit-mode"), "false");
      assert.equal(await button("Edit concept").count(), 0);
      await menuAction("Edit", "Undo");
      await selected(q("Pressure"), "GUI pressure");
      await openMenu("Edit");
      assert.equal(
        await page
          .getByRole("menuitem", { name: "Undo", exact: true })
          .getAttribute("aria-disabled"),
        "true",
        "Browse mode cannot undo content edits",
      );
      await page.keyboard.press("Escape");
      await menuAction("Develop", "Enter Edit Mode", true);
      await menuAction("Edit", "Redo");
      await selected(q("Temperature"));
      run.checks.push(
        `Unsaved draft survives attempted mode exit, close tabs, ${phone ? "" : "desktop merge, "}Undo, concept/unit navigation, new-concept action, and responsive breakpoint changes; cancellation allows mode exit; Browse history cannot mutate authored content`,
      );

      await searchPanel();
      await click(button("Create concept"));
      await page
        .getByLabel("Concept name", { exact: true })
        .fill("GUI authoring fixture");
      const beforeCreate = await counts();
      await click(button("Save quantity"));
      const createdId = await inspector.getAttribute("data-node-id");
      assert.ok(createdId?.startsWith("urn:hvacr:node:"));
      await selected(createdId, "GUI authoring fixture");
      assert.equal((await counts()).undo, beforeCreate.undo + 1);
      await menuAction("Edit", "Undo");
      await selected(q("Temperature"));
      assert.deepEqual(await counts(), {
        undo: beforeCreate.undo,
        redo: beforeCreate.redo + 1,
      });
      await menuAction("Edit", "Redo");
      await selected(createdId, "GUI authoring fixture");
      run.checks.push(
        "Creating and selecting a new node saves one history action; Undo and Redo restore the prior reference and new content together",
      );

      const beforeClose = await counts();
      await menuAction("Window", "Close all tabs");
      await page
        .getByRole("heading", { name: "All tabs are closed", exact: true })
        .waitFor();
      assert.deepEqual(await counts(), beforeClose);
      await click(button("Restore tabs"));
      await selected(createdId, "GUI authoring fixture");
      assert.deepEqual(await counts(), beforeClose);
      if (!phone) {
        assert.ok((await page.locator(".dv-groupview").count()) > 1);
        await menuAction("Window", "Merge all tabs");
        assert.equal(await page.locator(".dv-groupview").count(), 1);
        assert.equal(await page.locator(".dv-tab").count(), 4);
        await selected(createdId, "GUI authoring fixture");
        assert.deepEqual(await counts(), beforeClose);
        await menuAction("Window", "Close all tabs");
        await click(button("Restore tabs"));
        assert.equal(await page.locator(".dv-groupview").count(), 1);
        assert.equal(await page.locator(".dv-tab").count(), 4);
        await selected(createdId, "GUI authoring fixture");
      }
      run.checks.push(
        phone
          ? "Closing/restoring tabs preserves content and timeline; Merge all tabs is disabled for the existing phone tab layout"
          : "Closing/restoring tabs preserves content and timeline; desktop merge yields one group with four tabs and preserves that layout on restore",
      );
      await noOverflow();
      await openMenu("Develop");
      await noOverflow();
      await page.screenshot({
        path: `test-results/gui-${engine}-${run.profile}.png`,
        fullPage: true,
      });
      assert.deepEqual(errors, []);
      run.history = await counts();
      run.passed = true;
    } catch (error) {
      run.failure = String(error);
      await page.screenshot({
        path: `test-results/gui-${engine}-${run.profile}-failure.png`,
        fullPage: true,
      });
      await writeFile(
        `test-results/gui-${engine}-${run.profile}-failure.txt`,
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
    `test-results/gui-${engine}-report.json`,
    `${JSON.stringify(report, null, 2)}\n`,
  );
}
console.log(JSON.stringify(report, null, 2));
