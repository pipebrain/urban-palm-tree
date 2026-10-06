# HVACR Knowledge Atlas — M0

A local feasibility implementation of the HVACR knowledge graph. The starting universe is the full eligible QUDT 3.5.2 import: **1,555 upstream nodes**, **1,734 explicit relationships**, and **2,932 internal unit references**. One clearly marked app-authored sensible-heat equation adds one node and four participant links. Source is backed up in the private GitHub repository [pipebrain/urban-palm-tree](https://github.com/pipebrain/urban-palm-tree). The website has not been published.

## Run on this Mac

From this project directory:

```sh
sh scripts/pnpm.sh install --frozen-lockfile
sh scripts/pnpm.sh dev
```

Open the localhost address printed by Vite. The helper uses installed Node/pnpm or this Mac's already-bundled Codex runtime. It does not install system software or alter shell settings. Tested: Node **24.19.0**, pnpm **11.25.0**, macOS **27.0.1 arm64**. On another machine, provide those versions; `.node-version` and `packageManager` record them. First dependency installation needs internet; the pinned QUDT source and derived data are already committed.

Production preview, including offline asset preparation and a Pages-style repository subpath:

```sh
APP_BASE=/hvacr-m0/ sh scripts/pnpm.sh build
APP_BASE=/hvacr-m0/ sh scripts/pnpm.sh preview --port 4173
```

Then open `http://127.0.0.1:4173/hvacr-m0/`. `APP_BASE` must start and end with `/`; use your eventual repository name when separately preparing a release. The default build base is `/`. The Git remote `origin` points to the private `pipebrain/urban-palm-tree` repository, with `main` tracking `origin/main`. No deploy workflow has been created.

## Explore

- Use **Search** (phone) or **Library** (desktop) to select a concept. Search narrows only the result list; it does not remove graph nodes.
- Drag empty graph space to pan. Pinch, scroll, or use `+`/`−` to zoom. **Fit all** follows the full layout while it settles. Selecting a concept or manually navigating stops automatic fitting.
- Tap/click a node to inspect it. Dragging a node pins it; **Pin/Unpin** and **Pause/Resume** also work without keyboard or hover.
- Open the authored sensible-heat example from the inspector welcome card or search. Its participants have stable references and exact unit identities. The small display-name/LaTeX editing probe lasts only in this tab.
- Unit links open internal references. Upstream compatibility is labelled separately from actual explicit-use backlinks. No numerical conversion or equation solving is provided.
- Desktop Dockview panels can be resized and moved. Phone navigation uses the same domain data in focused Map/Search/Inspector views.

All node shapes remain in the graph. KaTeX labels appear at useful zoom levels with an overlap/budget cap of 60 HTML labels; the selected label has priority. Full formulas appear in the inspector. No state-property classifications are guessed, so unreviewed quantities remain circles. Constants are diamonds and the authored equation is a rounded rectangle. Force placement is a navigation aid, not a physical model.

## Reproduce data and verification

```sh
sh scripts/pnpm.sh data:check   # verify hashes + deterministic generated files
sh scripts/pnpm.sh data:import  # regenerate from committed official Turtle
sh scripts/pnpm.sh data:fetch   # explicitly redownload only the pinned release
sh scripts/pnpm.sh test
sh scripts/pnpm.sh typecheck
sh scripts/pnpm.sh test:browser
sh scripts/pnpm.sh test:offline-browser
```

Browser tests require the production preview above. They use installed Google Chrome on macOS by default; override `CHROME_PATH` and `PREVIEW_URL` if needed. Screenshots and machine-readable reports are written to ignored `test-results/`. Phone tests are **viewport/touch emulation on the Mac**, not actual Android/iPhone testing. Browser automation may require permission to launch Chrome in Codex's sandbox.

The requested `qudt-all.jsonld` was not available as an upstream release artifact. The exact official Turtle is retained, and the importer generates expanded JSON-LD without dropping any RDF assertions. See [source inventory and licensing](docs/QUDT-IMPORT.md). Repeated names/symbols do not merge identities, deprecated records are retained, and dimensions alone never create relationships.

## Scope and next work

M0 demonstrates full-data rendering, touch navigation, KaTeX, source provenance, limited example authoring, and offline **read-only baseline reopening**. It does not implement complete authoring, curation, undo/redo, autosave, workspace files, source export, or Reload from source; those belong to later milestones. Refreshing discards the example draft. CoolProp has an explicit uninstalled service boundary; there is no substituted engine or solver.

Physical Android/iPhone testing, Safari testing, mobile storage eviction, and prolonged memory behavior remain unverified. Offline preparation is not a permanent-backup guarantee. The UI says *preview prepared*, not device-certified offline authoring. See [offline scope and protocol](docs/M0-OFFLINE.md), [technical choices](docs/M0-TECHNICAL-NOTES.md), and [M0 results](docs/M0-RESULTS.md). Continue with M1 semantic browsing and review, preserving the full initial universe.

QUDT attribution: QUDT.org, QUDT 3.5.2, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); browser projection and generated JSON-LD are adaptations. Original source, license and checksums are in `data/qudt/`. DOE example provenance is attached to the example in the app. Third-party code retains its package licenses in the dependency installation.
