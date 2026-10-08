# System button, menus, and workspace tabs

Version **0.2.2**, requested on 7 October 2026, extends the [initial GUI refinement](GUI-REFINEMENT.md) before M3. Andrew confirmed that Edit → Undo/Redo remains in the revised menu bar. File operations remain disabled, browse mode remains the default, and persistence has not started. Public Pages remains the accepted M2 0.2.0 release.

## Interface

The H and northeast vector now form a plain white SVG **System** button, separate from the application menu. It has no icon tile, border, rounded background, or text. The system button is intentionally inactive, retaining high contrast. **HVACRbuild → About** is a separate text menu on desktop and phones.

| Menu | Commands |
| --- | --- |
| HVACRbuild | About |
| File | New, Open, Close, Save, Export — disabled until M3 |
| Edit | Undo, Redo |
| View | Inspector, Knowledge Map, Library, Units, Hide Status Bar / Show Status Bar |
| Develop | Enter Edit Mode / Leave Edit Mode |
| Window | Tile Tabs → Columns, Rows, Quarters; Merge All Tabs; Close All Tabs |

Tile Tabs is a real submenu with pointer, touch, and keyboard handling. Desktop tiling arranges only currently open panels: Columns places them side by side, Rows stacks them, and Quarters makes a two-by-two layout when all four are open. With fewer panels, available positions fill without opening unwanted panels. Merge All Tabs combines the open desktop panels. Arrangement commands bring floated tabs back into the workspace grid. Short map panels scroll rather than collapsing the graph canvas. Phones retain one visible panel at a time, with tiling and merging disabled; wider tablet layouts use Dockview.

Every tab can close. Desktop close controls appear on the visible tab in each group, on hover, and with keyboard focus; touch users can access them without hover. Each control has a specific accessible name, such as Close Inspector. Close controls highlight on pointer hover or focus. Phone tabs have visible touch controls.

View opens a missing panel or activates its existing tab. Selecting a concept opens Inspector; selecting a unit opens Units; Show on map and Focus neighbourhood open Knowledge Map; starting a concept opens Inspector. These actions reopen only their destination panel. Closing every tab leaves an empty workspace with View guidance and individual Open buttons.

## State and preservation

The session engine tracks the exact open panel list independently of the navigation/edit timeline. Opening, closing, merging, and tiling tabs do not change authored content or add Undo/Redo entries. Closing the active tab selects a remaining tab; closing the final tab leaves its concept/unit reference available for reopening. Undo/Redo opens its required destination panel when needed.

Draft registration now records the owning panel. A tab with an unfinished editor refuses to close and explains how to Save or Cancel; unrelated panels can close. The close button and Dockview's Delete/Backspace tab shortcuts use the same guarded session action. Close All Tabs and arrangement commands also protect unfinished editors. The existing navigation, mode, and responsive-layout draft guards remain in effect.

Dockview reconciliation adds/removes individual panel instances. Tiling and merging use the installed Dockview 8.4.0 panel movement API, which supports moving panels without recreating their instances; see the official [panel movement](https://dockview.dev/docs/core/panels/move/) and [panel removal](https://dockview.dev/docs/core/panels/remove/) references. Closed panel UI instances are recreated on demand from the shared session state. Saved content, explicit manual placements, selected identities, and history remain; transient search text, unpinned force positions, and camera state may reset when their panel closes. Durable workspace and layout saving remain M3.

## Verification

Implementation commit: **`b2a307d217305510d5018e07de362b6876c69a50`**. All **70 tests** pass, including 13 session-controller tests. TypeScript, formatting, whitespace checks, and the repository-subpath production build pass. Final offline build **`74ccbeb451e7e33fae20`** contains **67 prepared assets / 7,226,876 bytes**. The existing Vite main-chunk size advisory remains; no dependencies changed.

Chrome **154.0.8037.98** and Playwright WebKit **26.6** pass the new window workflow on desktop **1440 × 960** and phone **390 × 844**, with no runtime errors. They verify independent closing, keyboard Delete/Backspace draft protection, unrelated-tab closing with a draft open, selective View reopening, automatic concept/unit/map panel opening, unchanged content/history, actual tiling geometry, floating-tab redocking, and merging. Rows retains a **183 px canvas** with working scrolling/zoom while its panel bounds stay fixed. Columns, Rows, Quarters, and phone screenshots were visually inspected.

The existing GUI workflow also passes both engines, covering menu keyboard/focus handling, status visibility, About, browse/edit gating, atomic Save, shared history, and responsive draft protection. Retained Chrome/WebKit authoring and fresh offline authoring checks pass; final offline startup verifies the current complete asset inventory on desktop and phone. The [build record](verification/window-build-checks.json) identifies each tested build and the narrowly scoped changes covered by final reruns.

Evidence:

- [Chrome window checks](verification/window-chromium-report.json) and [WebKit window checks](verification/window-webkit-report.json).
- [Chrome GUI](verification/window-gui-chromium-report.json), [WebKit GUI](verification/window-gui-webkit-report.json), [Chrome authoring](verification/window-authoring-chromium-report.json), and [WebKit authoring](verification/window-authoring-webkit-report.json).
- [Final offline startup](verification/window-offline-report.json) and [fresh offline authoring](verification/window-authoring-chromium-offline-report.json).
- [Columns](verification/window-webkit-desktop-columns.png), [Rows](verification/window-webkit-desktop-rows.png), [Quarters](verification/window-webkit-desktop-quarters.png), and [phone](verification/window-webkit-phone.png) screenshots. GUI checks isolate service workers, so screenshots show offline preparation unavailable; separate offline tests verify readiness.

Browser phone profiles are Mac viewport/touch emulation, not physical-device acceptance. Source pushes remain separate from the manually triggered Pages deployment.
