# M0 results — 6 October 2026

The local foundation and feasibility implementation is complete, with physical-device acceptance explicitly still outstanding. The full imported universe renders and can be searched and inspected in the tested desktop and touch-emulated phone views. No app publication, GitHub remote, later-stage solver, flashcards, problem generator, or calculation visualization was created.

## Reproducible foundation

- Project root: `HVACR-Codex-Handoff`. Original planning baseline was committed first (`7c6e25e`); implementation follows as a local commit on `main`.
- Existing tooling inspection: Apple command-line tools available at `/Library/Developer/CommandLineTools`, Git available, no Node/pnpm on the normal shell PATH. Existing Codex-bundled Node 24.19.0 and pnpm 11.25.0 were used; no system installation or shell-profile change.
- Host observed as macOS 27.0.1, arm64. Detailed hardware/memory sysctl queries were restricted; this report does not infer hardware from Chromium's compatibility user-agent string.
- Exact package versions, lockfile, runtime marker, helper launcher, and build/data commands are checked in. A frozen-lockfile offline dependency install succeeded from the populated package cache. Initial package acquisition still requires internet.
- Production build, TypeScript checks, formatting checks, and import determinism passed. Vite emits a large-main-chunk warning (~898 kB minified / ~245 kB gzip); this is recorded as an optimization opportunity rather than suppressed.

## Full-source evidence

Pinned official QUDT **3.5.2**: **132,166 RDF triples**, **11,148 subject records**, **1,224 quantity kinds**, **331 physical constants**, **2,932 unit references**, **1,734 directed source assertions** between eligible nodes. All **1,555** eligible nodes remain in the starting graph, including 419 isolated and 100 deprecated records. The independently authored DOE sensible-heat equation adds **1 node / 4 relationships**, making the displayed totals **1,556 / 1,738**.

Original ZIP/Turtle, license, source manifest, generated expanded JSON-LD, import report, and full browser projection are retained. The requested upstream JSON-LD URL was unavailable; this generated artifact is explicitly documented as an adaptation. Exact hashes, eligibility, gaps, and source references are in [QUDT import](QUDT-IMPORT.md). No shared-dimension or shared-unit edges are invented. Deprecated or unrecognized source properties are not silently discarded.

## Renderer decision and observations

Selected Canvas 2D + d3-force 3.0.0 in a Web Worker, with one camera and a bounded HTML KaTeX overlay. All graph shapes/relationships render at overview. Math labels are progressively revealed, prioritized for selection, culled outside the viewport, and capped at 60 to prevent thousands of KaTeX DOM trees. Search and inspector retain access to every node.

Distinct neighbors determine radius (`4 + min(6, sqrt(degree))` graph units). Each distinct pair supplies one spring even if several source predicates connect it; predicates remain separate in the domain and inspector. Fixed spring strength 0.12, repulsion −24, collision radius plus 3, centering strength 0.014, alpha decay 0.025. Graph weights do not imply physical mass or scientific strength. Source direction is explicit in inspector descriptions. Canvas edges have no arrows in M0.

The initial view automatically fits all nodes as layout expands. Selecting or panning/zooming stops fitting; **Fit all** restores it. Pins and pause survive the example's display edits. Desktop uses resizable Dockview panels (initial library 280 px and inspector 340 px); close controls are suppressed. Phone uses focused Map/Search/Inspector tabs without keyboard, hover, or right-click requirements.

Browser measured: **Chrome 154.0.8037.98**, automated headless on the Mac, served over localhost beneath `/hvacr-m0/`. Fresh isolated contexts, service workers blocked during interaction timing. Both viewports were verified to draw all **1,556** node shapes after Fit all and while arranging. The phone profile uses touch emulation and device scale factor 2; it is not Android or iPhone hardware.

| Profile | Viewport | Navigation to graph + ≥4 worker ticks | rAF interval p95 | Sample Canvas callback | Approx. JS heap after interactions |
| --- | --- | ---: | ---: | ---: | ---: |
| desktop | 1440 × 960 | 340 ms | 16.7 ms | 0.7 ms | 25.9 MiB |
| phone | 390 × 844 | 276 ms | 16.7 ms | 0.7 ms | 22.1 MiB |

These are single observed local runs, not network download estimates or device guarantees. rAF samples cover 89 intervals while the full layout is arranging; they do not measure worst-case gestures or guarantee every frame painted. Canvas callback timing excludes React/KaTeX DOM commit and compositing. Heap is Chromium's approximate JavaScript metric, not total process/GPU/worker memory, and no prolonged leak/pressure test was performed.

Functional browser checks passed: full import visible, search without curating graph, selection, KaTeX, internal exact-unit reference, zoom controls, pointer pan, pin/unpin UI, pause, example edits preserving pins/pause, no horizontal page overflow, and inspector navigation. Phone additionally passed search-result tap, direct canvas tap selection, touch pan, and two-finger pinch input. Both runs recorded zero page errors. Screenshot review confirmed desktop proportions/full universe and phone editing layout. Manual physical-device ergonomics remain untested.

[Interaction measurements](verification/browser-report.json) preserve the observed metrics. Repeat with `sh scripts/pnpm.sh test:browser` against the production preview.

## Offline and subpath evidence

Build **`f6b7851872aeb7293077`** prepared **65 assets / 6,621,776 bytes**, including the complete browser graph/unit projection, all **59 bundled KaTeX font files**, app entry/CSS/JS, and layout worker. Preparation validates hashes, scopes caches by app path/build, rejects partial installs, and leaves new workers waiting while older app tabs remain open.

With service workers allowed, all app tabs were closed, the context network disabled, and a new page opened at the same subpath. Desktop reached the full graph and restarted worker in **280 ms**; phone viewport emulation in **267 ms**. Previously unviewed Atomic Mass Constant, Kilogram unit, and math/fonts were loaded successfully with zero page errors. This proves fresh-document offline startup in tested browser contexts. It does **not** prove persistence through browser-process restart, storage eviction, reboot, or actual phone use.

The `/hvacr-m0/` production subpath exercised HTML, data, fonts, worker, service worker, and fresh navigation. No deployment occurred. [Offline measurements](verification/offline-report.json) and [offline protocol](M0-OFFLINE.md) preserve details.

## Integrity checks

Eleven automated tests passed: seven cover original-source hashes, complete RDF round trip, exact full eligibility/deprecations, unit separation and references, directed-edge provenance, decimal precision, deterministic regeneration and version rejection. Four cover full-cache preparation, unavailable/changed assets, unrelated-cache preservation, determinism, and waiting-worker behavior. These tests target data loss and release consistency; they are not evidence for unimplemented workspace/undo/conversion features.

## Limits and next milestone

- Actual Android and iPhone hardware, Safari, prolonged memory/thermal behavior, file transfer, install-to-home-screen, and offline browser-process restart remain unverified. Plain HTTP LAN access is not sufficient for phone service-worker testing; use trusted HTTPS when arranging device checks.
- The example supports temporary display-name and LaTeX editing only. There is no full editor, undo/redo, persistence, curation/group authoring, portable workspace, deterministic authored-source export, or Reload from source. Refreshing loses the draft. These remain M2/M3 work.
- Imported constants may be historical; source descriptions can be incomplete or contradictory. No calculation uses them. Thermodynamic property classifications are not guessed; future reviewed classification will add the quantity-subtype shape.
- The authored example uses exact Btu_IT and mass identities plus a separate Fahrenheit interval reference. General unit profiles/conversions are not implemented. Unknown unit meaning is not silently resolved.
- CoolProp is an explicit asynchronous property-service boundary that returns `not-installed`. The official pinned JS/WASM pair is the intended later route; no binary loading or property calculation is claimed.
- This baseline bundles ~6.6 MB of decoded offline assets. The large main JS chunk and keeping font fallback formats are acceptable feasibility tradeoffs, with optimization to revisit using measured device evidence.

Proceed to **M1: browsing and semantic foundation**: review classifications/relationships, strengthen inspector and unit-reference semantics, add deliberate filtering/neighborhood controls, and verify real phone behavior while preserving full default import. Suggested regression budgets from this Mac evidence: local first graph under 1 s and approximate main-thread JS heap under 80 MiB after the same short exploration. Establish a ≤33 ms p95 continuous pan/zoom benchmark with visible math labels before using it as a pass/fail gate; the current arranging-only rAF samples are insufficient for that claim. Agree physical-device budgets after measurements rather than extrapolating these Mac results.
