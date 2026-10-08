# HVACRbuild.app — GUI window refinement · v0.2.2

An editable HVACR knowledge graph with semantic browsing, contextual constants, Markdown/math notes, overlapping groups, and session undo/redo. The starting universe remains the full eligible QUDT 3.5.2 import: **1,555 upstream nodes**, **1,734 explicit relationships**, and **2,932 internal unit references**. One clearly marked app-authored sensible-heat equation adds one node, four participant links, and a separate Fahrenheit-interval unit. Source is in [pipebrain/urban-palm-tree](https://github.com/pipebrain/urban-palm-tree).

The working source is **version 0.2.2, a GUI window refinement requested on 7 October 2026 before M3**. It defaults to browsing and adds individual panel opening/closing and desktop tiling to the application menu. See the [GUI window refinement record](docs/GUI-WINDOW-REFINEMENT.md) for current scope and verification; the [0.2.1 GUI record](docs/GUI-REFINEMENT.md) preserves the preceding menu/session work. **M2 0.2.0 remains the published release**, from commit `95684ad4`, and Andrew has accepted that milestone against its Done when criteria. The source commit/push is authorized; Pages publication is not. See the [M2 deployment record](docs/M2-PAGES-DEPLOYMENT.md), [M2 results](docs/M2-RESULTS.md), and [release guidance](docs/GIT-AND-RELEASE.md). Ordinary code pushes do not deploy the site.

## Run on this Mac

From this project directory:

```sh
sh scripts/pnpm.sh install --frozen-lockfile
sh scripts/pnpm.sh dev
```

Open the localhost address printed by Vite. The helper uses installed Node/pnpm or this Mac's already-bundled Codex runtime. It does not install system software or alter shell settings. Tested: Node **24.19.0**, pnpm **11.25.0**, macOS **27.0.1 arm64**. On another machine, provide those versions; `.node-version` and `packageManager` record them. First dependency installation needs internet; the pinned QUDT source and derived data are already committed.

Production preview, including offline asset preparation and a Pages-style repository subpath:

```sh
APP_BASE=/urban-palm-tree/ sh scripts/pnpm.sh build
APP_BASE=/urban-palm-tree/ sh scripts/pnpm.sh preview --port 4174
```

Then open [the local preview](http://127.0.0.1:4174/urban-palm-tree/). This serves the locally built revision, currently GUI version 0.2.2. `APP_BASE` must start and end with `/`; this path matches the Pages deployment. The default build base is `/`. The Git remote `origin` points to `pipebrain/urban-palm-tree`.

## GitHub Pages preview

**M2 0.2.0** is live at [pipebrain.github.io/urban-palm-tree](https://pipebrain.github.io/urban-palm-tree/). Andrew requested redeployment after unpublishing Pages. The [manual deployment](https://github.com/pipebrain/urban-palm-tree/actions/runs/37479683546) succeeded on 6 October 2026; every release asset matches the verified build, and live Chrome/WebKit authoring and fresh offline checks pass. See the [M2 deployment record](docs/M2-PAGES-DEPLOYMENT.md). The [M1 deployment record](docs/M1-PAGES-DEPLOYMENT.md) remains historical evidence. The `.github/workflows/pages.yml` workflow runs only through **Actions → Deploy GitHub Pages → Run workflow** (`workflow_dispatch`).

If an existing browser still shows M1, open the site online, allow the update to prepare, then close **all** tabs for this app and reopen the URL. Updates wait for old tabs to close. M2 has four phone tabs: **Map, Search, Inspector, Units**; its desktop header says **M2 · SHAPE YOUR ATLAS**. The visible **Undo/Redo** controls and **Create concept** button identify the authoring release. Session changes are temporary and disappear when the app closes or refreshes.

## Browse and use the local GUI

Version 0.2.2 starts in **Browse mode**. An inert SVG system mark sits beside the **HVACRbuild, File, Edit, View, Develop, Window** application menus; **HVACRbuild → About** shows the app information. **Develop → Enter Edit Mode** reveals authoring controls. **View** opens or activates **Inspector, Knowledge Map, Library, Units** individually and toggles the status bar. File operations are disabled until M3.

Each desktop or phone tab has a close control. **Window → Close All Tabs** retains session content and history; reopen only the panel you need through View or the empty-workspace buttons. Selecting a concept, following a unit link, or travelling through history opens its required panel automatically. On desktop, **Window → Tile Tabs → Columns / Rows / Quarters** arranges the open panels, while **Merge All Tabs** puts them in one group. These layout commands are disabled on phones. Closing an editor's panel, closing all tabs, and arranging tabs require finishing its draft first; unrelated panels can close without discarding the draft.

**Edit → Undo/Redo** uses one session timeline for reference navigation and deliberate content edits. Undoing or redoing a content change requires Edit mode. A completed Save and its resulting selection form one step; force ticks and view controls do not. This shared timeline is the implementation interpretation of the GUI unification request. The former reference arrows and separate history toolbar are removed locally; the published 0.2.0 interface retains them.

- Use **Search** (phone) or **Library** (desktop) to select a concept. Search narrows only the result list; it does not remove graph nodes.
- Drag empty graph space to pan. Pinch, scroll, or use `+`/`−` to zoom. **Fit all** follows the full layout while it settles. Selecting a concept or manually navigating stops automatic fitting.
- Tap/click a node to inspect it. In Browse mode, dragging pans. In Edit mode, dragging a node pins it and **Pin/Unpin** is available. **Pause/Resume** remains available in either mode without keyboard or hover.
- Use **Map filters** for node type, classification, origin, relationships, and deprecated records. Focus a selected concept's one- or two-hop neighbourhood; **Reset map** restores the full universe. Pins follow stable IDs through filtering and display edits.
- Open the authored sensible-heat example from the inspector welcome card or search. Its participants have stable references, exact unit identities, and no fixed solve direction. Display-name/LaTeX overrides can be applied and restored without rewriting the source; they last only in this tab.
- Unit links and the searchable **Unit dictionary** open internal references. Explicit-use backlinks, source applicability, and display preferences are labelled separately. Reviewed preferences for 46 concepts select exact units while preserving values and equation conventions. No numerical conversion or equation solving is provided.
- Desktop Dockview panels can be resized and moved. Phone navigation uses the same domain data in Map/Search/Inspector/Units views. The Edit menu revisits concepts and units through the shared session timeline.

The default view includes all learning nodes. KaTeX labels appear at useful zoom levels with an overlap/budget cap of 60 HTML labels; the selected label has priority. Full formulas appear in the inspector. Twelve reviewed thermodynamic state-property quantities use hexagons; other quantities use circles, constants diamonds, and equations rounded rectangles. Eighteen exact concepts have sourced classifications; all other quantities remain visibly unreviewed. The legend identifies state property as a quantity subtype. Force placement is a navigation aid, not a physical model.

Source provenance, typed relationship meanings, four missing upstream subjects, and known unit-description disagreements are inspectable. See [semantic boundary](docs/M1-SEMANTICS.md) and [unit choices](docs/M1-UNITS.md).

## Author in M2

Version 0.2.0 adds editors for quantities, equations, contextual constants, unit notation and notes, and typed relationships. Equations use explicit participant bindings; source records remain separate from local overrides. Markdown notes support KaTeX, embedded images, and internal concept/unit links. Groups can overlap, and excluding content is reversible. Save, group changes, pinning, and completed drags enter session undo/redo as deliberate actions; force ticks do not.

In local version 0.2.2, first choose **Develop → Enter Edit Mode**. Select a concept and open **Inspector → Edit concept**. In **Search** (phone) or **Library** (desktop), choose a type and use **Create concept**. A unit reference offers **Edit unit presentation**; relationships in Inspector offer **Edit relationship**. Editors use **Save/Cancel**, with **Undo/Redo** in the Edit menu. The published 0.2.0 release exposes these editors directly and has no global mode toggle.

The M2 0.2.0 milestone passed 57 automated tests and its production browser checks, including Chrome and WebKit authoring on desktop and emulated phone layouts. Andrew confirmed M2 complete against its Done when criteria; the confirmation supplies no detailed device/version or offline/storage protocol. Current GUI verification is recorded separately in [GUI window refinement](docs/GUI-WINDOW-REFINEMENT.md). **Save applies an edit to this session; it does not save a workspace file.** Refreshing or closing the browser loses authored work and history. Autosave, portable workspace files, source export, and Reload from source remain M3. See [M2 results and checks](docs/M2-RESULTS.md).

## Reproduce data and verification

```sh
sh scripts/pnpm.sh data:check   # verify hashes + deterministic generated files
sh scripts/pnpm.sh data:import  # regenerate from committed official Turtle
sh scripts/pnpm.sh data:fetch   # explicitly redownload only the pinned release
sh scripts/pnpm.sh test
sh scripts/pnpm.sh typecheck
sh scripts/pnpm.sh format:check
sh scripts/pnpm.sh test:browser
sh scripts/pnpm.sh test:semantic-browser
sh scripts/pnpm.sh test:authoring-browser
BROWSER_ENGINE=webkit sh scripts/pnpm.sh test:authoring-browser
OFFLINE_FIRST=1 sh scripts/pnpm.sh test:authoring-browser
sh scripts/pnpm.sh test:authoring-graph
sh scripts/pnpm.sh test:offline-browser
PREVIEW_URL=http://127.0.0.1:4174/urban-palm-tree/ sh scripts/pnpm.sh test:gui-browser
BROWSER_ENGINE=webkit PREVIEW_URL=http://127.0.0.1:4174/urban-palm-tree/ sh scripts/pnpm.sh test:gui-browser
PREVIEW_URL=http://127.0.0.1:4174/urban-palm-tree/ sh scripts/pnpm.sh test:window-browser
BROWSER_ENGINE=webkit PREVIEW_URL=http://127.0.0.1:4174/urban-palm-tree/ sh scripts/pnpm.sh test:window-browser
```

See [GUI window refinement](docs/GUI-WINDOW-REFINEMENT.md) for current verification, [GUI refinement](docs/GUI-REFINEMENT.md) for 0.2.1, and [M2 results](docs/M2-RESULTS.md) for the accepted 0.2.0 milestone. The WebKit run requires the matching Playwright browser (`sh scripts/pnpm.sh exec playwright install webkit`). Browser tests require the matching production preview. They use installed Google Chrome on macOS by default; override `CHROME_PATH` and `PREVIEW_URL` if needed. Screenshots and machine-readable reports are written to ignored `test-results/`; retained evidence is linked from each record. Phone browser tests are **viewport/touch emulation on the Mac**, separate from Andrew's physical-phone reports. Use the matching source revision when reproducing historical milestone checks.

The requested `qudt-all.jsonld` was not available as an upstream release artifact. The exact official Turtle is retained, and the importer generates expanded JSON-LD without dropping any RDF assertions. See [source inventory and licensing](docs/QUDT-IMPORT.md). Repeated names/symbols do not merge identities, deprecated records are retained, and dimensions alone never create relationships.

## Scope and next work

M1 established semantic browsing, reviewed classifications and display-unit choices, reference navigation, reversible view filters, and immutable source/display separation. M2 added authoring, curation, groups, and undo/redo and is accepted. The current **0.2.2 GUI window refinement** reorganizes those capabilities before M3. Autosave, workspace files, source export, and Reload from source remain **M3**, which has not started. CoolProp has an explicit uninstalled service boundary; there is no substituted engine or solver.

On 6 October 2026 Andrew reported that **M1 passes on physical iOS and Android phones, apart from iOS UI rendering issues**. He clarified that **KaTeX renders as expected**, while other fonts appear missing in iOS Safari and Chrome. The logo arrow appears as an emoji, and a second screenshot shows the hop selector shorter than its adjacent control. Both screenshots remain local outside this public repository. Device models, OS/browser versions, the Android browser, and detailed measurements were not supplied. This is user-reported smoke acceptance with those rendering exceptions, not comprehensive or offline/storage certification.

The previously published M1 **0.1.1 correction** bundles pinned Inter 4.1 for interface text, replaces font-dependent UI icons with SVG, and gives the mobile hop selector explicit WebKit appearance and a matching 44 px height. The 37 tests, local Chrome/WebKit checks, and offline font checks pass; live release assets match the verified build. Andrew subsequently confirmed that the correction **passes on both Android and iOS phones**, then authorized M2. That report closes the M1 rendering follow-up; it supplies no device/version details or comprehensive offline/storage certification. See [M1 results](docs/M1-RESULTS.md) and [rendering correction](docs/M1-IOS-RENDERING-FIX.md).

Andrew's earlier rough M0 phone testing found performance acceptable. Mobile storage eviction, prolonged memory behavior, and a detailed physical-device offline reopening protocol remain unverified. The UI says _preview prepared_, not device-certified offline authoring. See [offline scope and protocol](docs/M0-OFFLINE.md) and [M0 results](docs/M0-RESULTS.md). **Andrew has accepted M2 against its Done when criteria.** The next planned milestone is **M3: persistence and reusable content**, subject to Andrew’s instruction.

QUDT attribution: QUDT.org, QUDT 3.5.2, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); browser projection and generated JSON-LD are adaptations. Original source, license and checksums are in `data/qudt/`. DOE example provenance is attached to the example in the app. Third-party code retains its package licenses in the dependency installation.
