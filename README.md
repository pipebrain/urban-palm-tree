# HVACR Knowledge Atlas — M1 · v0.1.0

A browsable semantic foundation for the HVACR knowledge graph. The starting universe remains the full eligible QUDT 3.5.2 import: **1,555 upstream nodes**, **1,734 explicit relationships**, and **2,932 internal unit references**. One clearly marked app-authored sensible-heat equation adds one node, four participant links, and a separate Fahrenheit-interval unit. Source is in [pipebrain/urban-palm-tree](https://github.com/pipebrain/urban-palm-tree).

The working source and public GitHub Pages preview are **M1, version 0.1.0**. Andrew authorized publishing commit `7fb7d539` for iPhone and Android checks on 6 October 2026. See [M1 results](docs/M1-RESULTS.md), [deployment record](docs/M1-PAGES-DEPLOYMENT.md), and [release guidance](docs/GIT-AND-RELEASE.md). Ordinary code pushes do not deploy the site.

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

Then open [the local M1 preview](http://127.0.0.1:4174/urban-palm-tree/). `APP_BASE` must start and end with `/`; this path matches the Pages deployment. The default build base is `/`. The Git remote `origin` points to `pipebrain/urban-palm-tree`.

## GitHub Pages preview

The **M1** preview is live at [pipebrain.github.io/urban-palm-tree](https://pipebrain.github.io/urban-palm-tree/). The [manual deployment](https://github.com/pipebrain/urban-palm-tree/actions/runs/37448915597) succeeded on 6 October 2026; see [deployment record](docs/M1-PAGES-DEPLOYMENT.md). The `.github/workflows/pages.yml` workflow runs only through **Actions → Deploy GitHub Pages → Run workflow** (`workflow_dispatch`).

If an existing browser still shows M0, open the site online, allow the update to prepare, then close **all** tabs for this app and reopen the URL. Updates wait for old tabs to close. M1 has four phone tabs: **Map, Search, Inspector, Units**; its desktop header says **M1 · BROWSE & CONNECT**. Session changes are temporary and disappear when the app closes or refreshes.

## Explore

- Use **Search** (phone) or **Library** (desktop) to select a concept. Search narrows only the result list; it does not remove graph nodes.
- Drag empty graph space to pan. Pinch, scroll, or use `+`/`−` to zoom. **Fit all** follows the full layout while it settles. Selecting a concept or manually navigating stops automatic fitting.
- Tap/click a node to inspect it. Dragging a node pins it; **Pin/Unpin** and **Pause/Resume** also work without keyboard or hover.
- Use **Map filters** for node type, classification, origin, relationships, and deprecated records. Focus a selected concept's one- or two-hop neighbourhood; **Reset map** restores the full universe. Pins follow stable IDs through filtering and display edits.
- Open the authored sensible-heat example from the inspector welcome card or search. Its participants have stable references, exact unit identities, and no fixed solve direction. Display-name/LaTeX overrides can be applied and restored without rewriting the source; they last only in this tab.
- Unit links and the searchable **Unit dictionary** open internal references. Explicit-use backlinks, source applicability, and display preferences are labelled separately. Reviewed preferences for 46 concepts select exact units while preserving values and equation conventions. No numerical conversion or equation solving is provided.
- Desktop Dockview panels can be resized and moved. Phone navigation uses the same domain data in Map/Search/Inspector/Units views. Back/forward reference controls revisit concepts and units.

The default view includes all learning nodes. KaTeX labels appear at useful zoom levels with an overlap/budget cap of 60 HTML labels; the selected label has priority. Full formulas appear in the inspector. Twelve reviewed thermodynamic state-property quantities use hexagons; other quantities use circles, constants diamonds, and equations rounded rectangles. Eighteen exact concepts have sourced classifications; all other quantities remain visibly unreviewed. The legend identifies state property as a quantity subtype. Force placement is a navigation aid, not a physical model.

Source provenance, typed relationship meanings, four missing upstream subjects, and known unit-description disagreements are inspectable. See [semantic boundary](docs/M1-SEMANTICS.md) and [unit choices](docs/M1-UNITS.md).

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
sh scripts/pnpm.sh test:offline-browser
```

The 37 automated tests and all three browser harnesses passed for M1. Browser tests require the production preview above. They use installed Google Chrome on macOS by default; override `CHROME_PATH` and `PREVIEW_URL` if needed. Screenshots and machine-readable reports are written to ignored `test-results/`; retained milestone evidence is linked from [M1 results](docs/M1-RESULTS.md). Phone browser tests are **viewport/touch emulation on the Mac**, not actual Android/iPhone testing. Use the matching source revision when reproducing historical M0 checks.

The requested `qudt-all.jsonld` was not available as an upstream release artifact. The exact official Turtle is retained, and the importer generates expanded JSON-LD without dropping any RDF assertions. See [source inventory and licensing](docs/QUDT-IMPORT.md). Repeated names/symbols do not merge identities, deprecated records are retained, and dimensions alone never create relationships.

## Scope and next work

M1 adds semantic browsing, reviewed classifications and display-unit choices, reference navigation, reversible view filters, and immutable source/display separation. Offline checks cover fresh baseline reopening and in-session browsing/preferences. Refreshing discards display overrides, preferences, and other session changes. Complete authoring, curation, groups, and undo/redo are **M2**; autosave, workspace files, source export, and Reload from source remain **M3**. CoolProp has an explicit uninstalled service boundary; there is no substituted engine or solver.

On 6 October 2026 Andrew reported that **M1 passes on physical iOS and Android phones, apart from an iOS font/icon rendering issue**. Safari and Chrome on iOS displayed unexpected typography, particularly an emoji in place of the logo arrow. The supplied screenshot is retained locally outside this public repository. Device models, OS/browser versions, the Android browser, and detailed measurements were not supplied. This is user-reported smoke acceptance with that rendering exception, not comprehensive or offline/storage certification. The iOS rendering correction remains part of M1; its actual-phone retest is still needed. See [M1 results](docs/M1-RESULTS.md).

Andrew's earlier rough M0 phone testing found performance acceptable. Mobile storage eviction, prolonged memory behavior, and a detailed physical-device offline reopening protocol remain unverified. The UI says *preview prepared*, not device-certified offline authoring. See [offline scope and protocol](docs/M0-OFFLINE.md) and [M0 results](docs/M0-RESULTS.md). The next implementation milestone after this M1 correction is **M2: editing, curation, groups, and action history**.

QUDT attribution: QUDT.org, QUDT 3.5.2, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); browser projection and generated JSON-LD are adaptations. Original source, license and checksums are in `data/qudt/`. DOE example provenance is attached to the example in the app. Third-party code retains its package licenses in the dependency installation.
