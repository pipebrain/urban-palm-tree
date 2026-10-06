# Development plan and acceptance criteria

This plan is for stage 1 only. It defines outcomes rather than pseudocode. Implementation details are for Codex to resolve against the real source data and devices.

Release update, 6 October 2026: Andrew made `pipebrain/urban-palm-tree` public and authorized publishing the M0 feasibility preview with GitHub Pages, then requested M1 publication for iPhone and Android checks. This changed the original publication timing; publication remains separate from milestone acceptance.

M1 status, 6 October 2026: Version 0.1.0 established browsing and the semantic foundation below. All 37 automated tests and desktop/touch-emulated phone runs of the interaction, semantic, and offline browser harnesses passed; see [M1 results](M1-RESULTS.md). After the requested manual deployment of `7fb7d539`, Andrew reported that M1 passes on physical iOS and Android phones except for UI rendering issues in iOS Safari and Chrome. KaTeX renders as expected; other fonts appear missing, the logo arrow appears as an emoji, and the hop selector is shorter than its adjacent control. Device models and OS/browser versions were not supplied; this is smoke acceptance, not comprehensive offline/storage certification.

The published M1 **0.1.1** correction bundles pinned Inter 4.1, replaces UI glyphs with SVG, and sets explicit WebKit select appearance and a matching 44 px mobile height. All 37 tests, local Chrome/WebKit checks, and offline font checks pass. Commit `9ada4474` was published successfully, and live release assets match the verified build. Andrew subsequently reported that the correction passes on both Android and iOS phones, closing the M1 rendering follow-up. No device/version details or comprehensive offline/storage protocol were supplied. See [M1 deployment record](M1-PAGES-DEPLOYMENT.md) and [rendering correction](M1-IOS-RENDERING-FIX.md).

M2 status, 6 October 2026: Andrew explicitly instructed Codex to proceed with M2 after the phone recheck. Version **0.2.0** implements editing, curation, groups, and action history. All 57 automated tests and the production browser checks pass, including Chrome/WebKit authoring and fresh offline authoring. Physical-phone M2 review remains outstanding. See [M2 results](M2-RESULTS.md). Andrew subsequently unpublished Pages and requested redeployment. M2 0.2.0 is published from `95684ad4`; live assets, Chrome/WebKit authoring, and fresh offline checks pass. See the [M2 deployment record](M2-PAGES-DEPLOYMENT.md). M3 persistence remains outside this milestone.

## M0 — Local foundation and feasibility

Establish the local Git project on the Mac and inspect installed tooling before modifying it. Select compatible current versions of the required libraries and a maintainable static build tool. Record the runtime/package-manager choice and lock dependencies.

Obtain the requested QUDT source from a verified upstream location. Record release, original filename, download location, checksum, licensing/attribution, record types, and counts. Inventory eligible learning nodes versus units and technical records.

Choose a graph renderer/layout approach using a focused feasibility implementation. Evaluate KaTeX rendering, full eligible graph size, search and selection, touch interaction, pinning, and mobile memory/interaction behaviour. The exact library is intentionally undecided. Prefer a single supported approach; justify any extra rendering layer.

Keep CoolProp's future property-service boundary explicit. A small browser WASM loading check is useful if inexpensive, but a self-compiled CoolProp build is not a prerequisite to authoring the graph. Record whether an official prebuilt binary or reproducible build is intended; do not silently replace the requested engine.

### Done when

- The project can be installed and run again using documented tooling.
- The real QUDT source is identified; record counts and import gaps are reported.
- Renderer choice is supported by actual evidence at full eligible graph size.
- KaTeX, touch selection, pan/zoom, and inspector opening work in the feasibility view.
- A small app-authored HVACR example is clearly distinguished from upstream data.
- Full graph behaviour is evaluated at a phone viewport; actual device tests are distinguished from emulation.
- The static build can use a repository subpath suitable for a GitHub Pages project site.
- Known tradeoffs and proposed performance targets are recorded before expansion.
- The offline reopening approach is evaluated early, including complete dataset/KaTeX asset preparation and phone-browser constraints. Do not report an already-open tab as proof of offline startup.

Do not declare full graph support based only on a small demonstration. If full-size mobile rendering fails, resolve the concrete limitation and report it before changing the user's starting-view requirement.

## M1 — Browsing and semantic foundation

Implement the reference/import boundary, stable node identities, typed relationships, source provenance, classifications, unit references, and desktop/phone navigation.

Add the full starting graph, equation-centred connections, bounded degree-based sizing, layout controls, search, filters, pinning, and a legend. Define how derived metadata affects graph weight without inflating it with every internal reference.

### Done when

- The default view includes all eligible imported nodes; technical and unit records are accounted for separately.
- Distinct concepts with the same symbol remain distinct.
- Renaming a node does not break relationships or links.
- A unit opens its own reference panel and accurate explicit-use backlinks.
- Thermodynamic state properties are visibly labelled as quantity subtypes.
- Equation links identify participating concepts without asserting a fixed solve direction.
- Unit preferences select exact compatible units and render through KaTeX.
- Unknown classifications, missing conversions, and absent upstream records are visible and honest.
- Desktop and touch-only phone users can search, select, inspect, and navigate.

## M2 — Editing, curation, groups, and action history

**Implementation and local verification complete; physical-phone review outstanding.** The user-reported Android/iOS pass applies to published M1 0.1.1, not the new M2 authoring controls.

Implement authoring for structured fields, Markdown with images/internal links, and LaTeX with preview. Add node/relationship creation and editing, original/reference inspection, overrides, reversible exclusion, groups, and undo/redo.

### Done when

- Andrew can create an HVACR quantity, equation, and contextual constant and connect them.
- Editing a unit, node name, or symbol updates references while preserving identity.
- A node may belong to more than one group; removing a group preserves its nodes.
- Exclusion, restoration, group membership, manual placement, and deletion can be undone/redone.
- A text-edit session and a drag produce useful history steps; force ticks do not.
- Notes, embedded images, and math are readable on desktop and phones.
- A constant's source, units, assumptions, and related equations can be edited and inspected.
- Altering a displayed unit with an example value preserves meaning or explicitly reports why conversion is unavailable.

## M3 — Persistence and reusable content

Implement the confirmed offline-use target, session-only undo/redo, autosave, explicit workspace files, deterministic source exports, and the Reload from source menu operation.

A workspace file is a resumable authoring document. A source export is a reusable app content/defaults package. They may share a versioned data representation but must have distinct user-facing purposes.

### Done when

- Saving and reopening preserves semantic content, assets, curation, groups, and relevant layout state.
- An exported workspace can be imported on Android and iPhone without proprietary desktop file access.
- The UI communicates that file transfer is manual and device storage is separate.
- A malformed or unsupported file fails with an actionable explanation while preserving current work.
- A source export can be consumed by a fresh build to reproduce the curated graph and defaults.
- An unchanged content export is stable for Git review; incidental layout/simulation state does not churn source content.
- Original QUDT version and local overrides are distinguishable.
- Published app updates do not silently replace a user's edited workspace.
- Migrating a file either succeeds with defined semantics or reports the incompatible version.
- After complete online preparation, close and reopen offline and test the full graph, previously unviewed nodes, unit dictionary, KaTeX, editing, embedded images, autosave, and workspace import/export. Record remaining platform limitations; do not advertise unsupported offline behaviour.
- Workspace files, source exports, and autosave contain no undo/redo stacks. Saving preserves active in-memory history; reopening/loading starts empty history.
- Online Reload from source obtains the current compatible published defaults rather than stale cached data. Offline reload offers only a clearly versioned cached source baseline.
- Source replacement offers saving current work or cancellation. Download/validation failure and cancellation preserve current work. A successful replacement starts empty history.
- Missing network-dependent reference pages/images fail clearly without blocking offline authoring; later WASM-dependent features have their offline prerequisites tested when implemented.

## M4 — Classroom alpha preparation

Complete actual device checks, document limitations, and prepare a separately triggered GitHub Pages deployment of a stable classroom alpha commit. The earlier M0 and M1 previews had separate publication authorization; publish future releases only when Andrew requests them.

### Done when

- Desktop Mac, Android, and iPhone smoke checks are recorded with browser/device versions.
- Fresh loading, graph interaction, editing, file import/export, and reopening work on target devices.
- Assets, fonts, data, workers, and any included WASM resolve under the real repository subpath.
- Refreshing a supported app location does not produce a hosting 404.
- The release identifies its app/content versions and can be rolled back by redeploying a prior build.
- Alpha testers understand that edits are local and exports are how they preserve/share work.
- The published content has source attribution and contains only material selected for public release.
- The public repository and publicly reachable Pages audience are documented. Any later audience or visibility change requires Andrew's instruction.
- The deployment report records the commit and resulting URL after publication actually succeeds.

## Verification priorities

Use targeted automated tests for meaningful data risks:

- Stable identity, relationship integrity, curation restoration, and overrides.
- Workspace/source export round trips, assets, version handling, and failed-import preservation.
- Undo/redo across compound edits and deletes.
- Representative supported unit conversions, including absolute versus interval temperatures and pressure reference handling.
- Constant units and assumptions; never infer semantics from the number alone.

Use visual/manual checks for touch ergonomics, KaTeX legibility, force behaviour, and Dockview-to-phone presentation. Do not add tests that merely repeat implementation details.

Track the measured dataset size and actual test conditions. Numerical performance budgets should be agreed from M0 evidence, not fabricated before the dataset and devices are known.

## Future-stage constraints to preserve

Use stable IDs so flashcards can reference nodes. Preserve equation-variable bindings for the later Given / Find / Solve workflow. Keep assumptions and permissible domains with equations/constants for later valid problem generation. Keep chart rendering distinct from CoolProp property evaluation.

These are data-design considerations, not authorization to implement future features.
