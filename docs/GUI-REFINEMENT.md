# Menu bar refinement before M3

Requested by Andrew on 7 October 2026 after accepting M2. Version **0.2.1** refines the GUI before persistence work begins. Andrew confirmed **browse mode by default** and **disabled File actions until M3**. M3 has not started. The public Pages release remains M2 **0.2.0**, source `95684ad4376cc32221962b34f8acc3699d55ea1a`; this change does not dispatch a deployment.

## Using the revised interface

The old workspace trail and authoring toolbar are removed. A compact white SVG H with a northeast vector replaces the text-bearing brand mark. The header has these menus:

| Menu | Actions |
| --- | --- |
| HVACRbuild.app | About HVACRbuild.app, including app and reference-data versions |
| File | New, Open, Close, Save, Export — disabled until M3 |
| Edit | Undo, Redo, with the next action shown when available |
| View | Show status bar |
| Develop | Enter Edit Mode / Leave Edit Mode |
| Window | Merge all tabs, Close all tabs |

Start in browse mode. **Develop → Enter Edit Mode** exposes the existing concept, relationship, unit, group, curation, display, and placement controls. Search/Library → Create concept starts an authoring form; selecting a concept opens Inspector → Edit concept. Saving a form applies its change to this session. It does not save a workspace file.

The phone header retains all six menus, using the icon for the application menu. Its accessible name remains HVACRbuild.app. Menu triggers and items have at least 44 px touch height. Keyboard users can use arrows, Home/End, Enter/Space, typeahead, Escape, and Tab. Disabled items remain discoverable and do not execute. Popup menus stay within the viewport. Menu keyboard behavior follows the [WAI-ARIA menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/).

The status bar is initially visible and reports offline preparation, browse/edit mode, session-only changes, and QUDT attribution. Its visibility is controlled by View. The About dialog also retains attribution and the session-only limitation.

## State and preservation

One session controller now owns reference navigation, authored content, Undo/Redo, edit mode, status-bar visibility, and workspace-panel commands. The implementation interprets Andrew's request to merge the old history controls into one state engine as **one chronological timeline for concept/unit navigation and completed edits**. Ordinary panel activation, menu use, filters, camera movement, and simulation ticks do not create history entries.

- A form Save and its resulting concept selection are one history action. Undo restores the preceding content and reference; Redo restores the saved result. Invalid changes preserve content and history. A new action after Undo clears the abandoned redo branch.
- Browse mode allows reference-history travel but prevents authoring changes, including an Undo/Redo step that would modify content. Enter Edit Mode to cross such a step. Text fields retain native typing undo; the application shortcut acts outside text fields.
- Browse-mode graph drags pan. Edit-mode node drags pin and move, with one history entry per completed drag. Leaving edit mode during a drag cancels its unfinished placement.
- An unfinished editor blocks changing its selected concept/unit, starting another concept, leaving edit mode, global Undo/Redo, Merge All Tabs, and Close All Tabs. Save or Cancel resolves the draft first. A phone rotation or resize across the panel-layout breakpoint defers replacing the panel tree until the draft closes.
- Merge All Tabs combines desktop workspace panels in one Dockview group. Phones already use tabbed panels, so merging is disabled there. Close All Tabs shows an empty workspace with **Restore tabs**; authored content and history remain in memory, and restoration retains the stored desktop panel arrangement. These are app workspace panels, not browser tabs.

Session state is still temporary. Refreshing or closing the page loses edits; a browser unload warning is requested when there are authored changes or open drafts. Autosave, portable workspaces, deterministic source exports, and Reload from source remain M3. Unpinned force positions and camera state are not promised to survive panel remounts. No new dependency was introduced.

## Verification

Production verification uses the repository subpath `/urban-palm-tree/`, the complete baseline of 1,556 learning nodes, and the pinned runtime and browser harnesses. The GUI harness is available through `sh scripts/pnpm.sh test:gui-browser`; set `BROWSER_ENGINE=webkit` for WebKit. Phone profiles are desktop browser viewport/touch emulation, not physical Android/iPhone acceptance.

Implementation commit: **`564c47e04d7d048d3e79e50c464445c1ca66b2cc`**. The production build passes TypeScript checking and prepares **67 local assets / 7,221,816 bytes**, build **`3097e82d5fbfa3358db8`**. All **65 domain/offline tests** pass, including eight session-controller tests for mixed history, atomic Save, failed/no-op commands, branch handling, and placements. Formatting and whitespace checks pass. The existing Vite advisory about the main JavaScript chunk exceeding 500 kB remains.

Chrome **154.0.8037.98** and Playwright WebKit **26.6** pass the GUI workflow on desktop **1440 × 960** and phone **390 × 844** profiles with no runtime exceptions. Checks cover menu accessibility and keyboard focus, disabled File actions, mode and status visibility, About, browse-mode panning, mixed navigation/edit Undo/Redo, one-step Save/create, unfinished-draft protection, responsive changes, and tab close/restore/merge. Browser testing caught and resolved redundant Dockview activation stealing input focus, draft loss during navigation/rotation, and an obsolete phone CSS rule hiding the mode indicator.

The existing interaction, semantic, graph-placement, and Chrome/WebKit authoring regressions also pass. Fresh offline startup passes on desktop and phone; full authoring passes in a freshly opened offline phone context. Both final offline reports verify the active build ID and complete asset inventory. The GUI harness blocks service workers for isolation, so its screenshots show offline preparation unavailable; the separate offline harnesses verify preparation and reopening.

Retained evidence:

- [Build and test conditions](verification/gui-build-checks.json), including the final CSS-only correction and which suites ran against each build.
- [Chrome GUI](verification/gui-chromium-report.json) and [WebKit GUI](verification/gui-webkit-report.json).
- [Interaction](verification/gui-interaction-report.json), [semantics](verification/gui-semantic-report.json), and [graph placement](verification/gui-graph-report.json).
- [Chrome authoring](verification/gui-authoring-chromium-report.json), [WebKit authoring](verification/gui-authoring-webkit-report.json), [offline reopening](verification/gui-offline-report.json), and [fresh offline authoring](verification/gui-authoring-chromium-offline-report.json).
- Visually reviewed [desktop merged tabs](verification/gui-webkit-desktop.png) and [phone menu](verification/gui-webkit-phone.png).

This is local verification of the GUI refinement. Physical-phone acceptance of this version and publication are separate from the accepted M2 release.
