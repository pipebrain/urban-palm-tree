# Decisions, open questions, and sources

Planning baseline v0.2: 6 October 2026.

## Confirmed

- Full selected QUDT import; Andrew curates it manually.
- Units are reference objects with internal hyperlinks, not graph nodes.
- Quantities, equations, and constants are the main node categories.
- Thermodynamic state property is a quantity classification, with a distinct proposed shape.
- Scientific classifications are editable and source-backed; they do not gate whether a node may exist.
- Related-node links only, with equations positioned among their participants.
- KaTeX/LaTeX throughout mathematical presentation.
- Editable US customary HVACR default unit choices and notation.
- Markdown, images, definitions, sources, internal links, and editable node fields.
- Groups, overlapping membership, styling, reversible curation, undo/redo, and layout controls.
- Autosave plus portable workspace save/load.
- Offline reopening and authoring after complete initial online preparation is a development target, with actual device verification required.
- A Reload from source menu action restores released defaults, with current-edit protection and an explicitly versioned cached fallback when offline.
- Workspace saving preserves current content and layout only. Undo/redo is session-only and excluded from saved files and autosave; saving itself does not clear active history.
- The chosen GitHub repository is `pipebrain/urban-palm-tree`. Andrew made it public and authorized a public GitHub Pages M0 feasibility preview, then M1 publication for iPhone and Android checks, on 6 October 2026. Later milestones and classroom alpha acceptance remain outstanding.
- Source export that can reproduce curated data/defaults in future builds.
- React, TypeScript, dockview-react, QUDT, and future CoolProp WASM.
- M2 MacBook Air development, Android/iPhone authoring, Git, GitHub, and eventual GitHub Pages alpha.
- Stage order: graph; flashcards; solver; test generator; calculation visualizer.

The latest classification decision supersedes the earlier proposal to treat Quantity and Property as mutually exclusive root types. The course does not mandate the distinction.

## M1 implementation decisions — 6 October 2026

- Runtime validation preserves and freezes the original import, checks stable identities and references, and rejects inconsistent source versions/counts. Label and LaTeX overrides remain separate. QUDT's five shared constant-value aliases are retained without merging their learning concepts.
- Eighteen exact quantity IDs have sourced application classifications; twelve are state-property quantity subtypes shown as hexagons. Unreviewed concepts remain explicit, and classification never propagates from a symbol, dimension, unit, or broader concept. See [semantic review](M1-SEMANTICS.md).
- Unit preferences cover 46 reviewed concept identities. Mass/force, temperature reading/interval, pressure reference, gallon variants, and Btu variants stay distinct. Explicit uses, source applicability, and display preferences have separate backlinks. Preferences do not perform conversions or alter recorded values/equation conventions. See [unit decisions](M1-UNITS.md).
- Layout degree counts distinct visible learning neighbours. Radius is `4 + min(6, sqrt(degree))`; one visible pair supplies one spring. Duplicate/reversed predicates, self-links, units, and metadata add no weight. Filtering preserves IDs and cached positions/pins; labels do not restart layout.
- Andrew's rough physical Android/iOS test of M0 found performance acceptable. Models and browser versions were unspecified, and no comprehensive or offline certification was reported. This supports proceeding beyond M0; it is not physical-device evidence for M1.
- M1 version 0.1.0 has 37 passing automated tests and three passing desktop/touch-emulated browser harnesses. Andrew subsequently requested M1 publication for physical-phone checks. The manual Pages deployment of `7fb7d539` succeeded; see [M1 deployment record](M1-PAGES-DEPLOYMENT.md).
- Andrew then reported that M1 passes on physical iOS and Android phones apart from UI rendering issues in iOS Safari and Chrome. He clarified that KaTeX renders as expected while other fonts appear missing; the logo arrow appears as an emoji, and a second screenshot shows the hop selector shorter than its adjacent control. Both screenshots remain local outside this public repository. Device models, OS/browser versions, the Android browser, and a detailed protocol were not supplied. This is smoke acceptance with rendering exceptions, not comprehensive offline/storage certification.
- The M1 0.1.1 correction in progress bundles pinned Inter 4.1 locally, replaces font-dependent UI icons with SVG, and gives the hop selector explicit WebKit appearance and a matching 44 px mobile height. KaTeX keeps its existing mathematical font assets. The published version remains 0.1.0 until deployment is verified, and actual-phone retesting remains outstanding. This is M1 correction work, not M2; see [rendering correction](M1-IOS-RENDERING-FIX.md).

## Provisional implementation defaults

These defaults guide remaining implementation. Resolved M1 choices are recorded above; other entries remain provisional.

| Topic | Working default | When to revisit |
| --- | --- | --- |
| Backend/accounts | Browser-local workspaces; no login, shared server workspace, or automatic synchronization | If collaboration or cloud sync becomes a requirement |
| Device transfer | Explicit workspace file export/import | When synchronization is requested |
| Import conflicts | Load a file as a separate workspace; do not silently merge concurrent edits | Before M3 |
| Graph weight | M1: distinct visible neighbours, bounded radius, one spring per pair | If measured usability requires adjustment |
| Group colours | User-selected primary group colour plus membership markers | During M2 |
| Source export | Versioned, deterministic data and assets consumable by the app; exact format chosen by Codex | Before M3 |
| Release trigger | Manually initiated Pages publishing via `.github/workflows/pages.yml` (`workflow_dispatch`), separate from ordinary code pushes | Each requested preview or alpha release |
| App name | HVACR Knowledge Graph is a working name | Before public release |

Offline use is now selected. The implementation must distinguish online preparation, offline-ready status, and offline reopening; storing edits in an online tab alone is insufficient. The working interpretation of source is the released app content/defaults, not direct access to unpublished GitHub commits. Detailed source-replacement behaviour is specified in the product brief.

## Questions to resolve at the relevant milestone

1. Which additional classroom shorthand should the author adopt? M1 offers explicitly identified gram/grain, mass/force, US/UK gallon, refrigeration-ton, and water-column choices; it does not guess the meaning of an ambiguous imported label.
2. For each named engineering constant, what is its associated classroom equation, source, and intended units?
3. What actual Android/iPhone models and browsers should define the performance baseline?

Only questions that materially affect the current milestone need an answer at that point. Routine reversible technical decisions can be made and documented by Codex. Do not repeatedly ask Andrew to reconfirm settled requirements.

## How to classify scientific content

Use QUDT as the reference for identities, dimensions, units, and available quantity kinds. Use primary HVACR/measurement sources for definitions and physical distinctions. Record the basis of a classification and flag uncertainty. Course notation can be preserved while the underlying scientific meaning is explicit.

Do not invent an authoritative proprietary knowledge graph or imply that QUDT contains the complete instructional curriculum. Do not infer causal dependence from a shared unit/dimension, or treat all occurrences of a number as one constant.

## References checked during planning

These are primary source entry points. Verify the current release and relevant details again when implementing; versions in a future lockfile must match actual chosen dependencies.

1. [QUDT overview](https://www.qudt.org/) — ontology and vocabulary scope.
2. [QUDT user guide](https://github.com/qudt/qudt-public-repo/wiki/User-Guide-for-QUDT) — quantity kinds, dimensions, conversions, and the limits of dimensional matching.
3. [QUDT releases](https://github.com/qudt/qudt-public-repo/releases) — choose and pin the actual source release. The requested JSON-LD artifact itself was not inspected in this planning session.
4. [ASHRAE thermodynamics and refrigeration cycles](https://handbook.ashrae.org/Handbooks/F21/IP/F21_Ch02/F21_Ch02_ip.aspx) — state properties and energy transfers. Consult specific relevant passages; do not copy the handbook into the app.
5. [ASHRAE testing, adjusting, and balancing](https://handbook.ashrae.org/handbooks/A19/IP/A19_Ch39/a19_ch39_ip.aspx) — common air/water factors and their component assumptions.
6. [NIST guide to expressing quantities](https://www.nist.gov/pml/special-publication-811/nist-guide-si-chapter-7-rules-and-style-conventions-expressing-values) — meaning, notation, and quantity versus numerical-value equations.
7. [CoolProp JavaScript/WASM wrapper](https://coolprop.org/coolprop/wrappers/Javascript/index.html) — official browser binary/build route.
8. [CoolProp high-level interface](https://coolprop.org/coolprop/HighLevelAPI.html) — property evaluation boundary.
9. [Dockview core concepts](https://dockview.dev/docs/core/overview/) — panel and group layout.
10. [KaTeX supported functions](https://katex.org/docs/supported) and [options](https://katex.org/docs/options) — mathematical rendering and supported linking features.
11. [Codex project instructions](https://developers.openai.com/codex/guides/agents-md) — placing project guidance in AGENTS.md.
12. [What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) — static hosting and project site paths.
13. [Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) — publishing and audience implications.
14. [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) — future build/deploy workflow.

## Change log

- M1 physical-phone feedback, 6 October 2026: Andrew reports M1 passes on iOS and Android except for UI rendering issues in iOS Safari and Chrome. KaTeX renders as expected; other fonts appear missing, the logo arrow appears as an emoji, and the hop selector is too short. Both screenshots remain outside the public repository. The pending 0.1.1 correction addresses interface fonts, icons, and control sizing; actual-phone retesting remains necessary without extending this report to offline/storage certification. See [M1 results](M1-RESULTS.md).
- M1 Pages deployment, 6 October 2026: At Andrew's request for public iPhone and Android testing, published commit `7fb7d5396a30a1dafeb57e156c6aa334a206c7e8` through [manual Actions run 37448915597](https://github.com/pipebrain/urban-palm-tree/actions/runs/37448915597). See [M1 deployment record](M1-PAGES-DEPLOYMENT.md). This releases the verified browsing milestone without declaring physical-device acceptance or later milestones complete.
- M1 implementation, 6 October 2026: Completed the semantic browsing foundation and recorded user-reported M0 Android/iOS smoke testing. [M1 results](M1-RESULTS.md) distinguish automated/browser evidence, remaining physical-device checks, and the separate M0 public deployment.
- Pages deployment, 6 October 2026: Published M0 commit `85c174f0a1655db666e299afea436677fd0c0067` through the manual Actions workflow. HTTPS site and full-graph, touch-emulation, unit/math, and fresh-document offline checks passed at `https://pipebrain.github.io/urban-palm-tree/`. See [deployment evidence](PAGES-DEPLOYMENT.md). This does not complete physical-device or later-milestone acceptance.

- Publication decision, 6 October 2026: Andrew changed `pipebrain/urban-palm-tree` to public and requested enabling GitHub Pages for the current M0 feasibility preview. This supersedes the earlier private-only and wait-until-M4 publication constraints. Deployment is manually triggered, independent of code pushes. A successful deployment and URL verification must be recorded separately; no later milestone is declared complete by publication.
- Repository selection, 6 October 2026: Andrew selected owner `pipebrain`, repository name `urban-palm-tree`, and private visibility. The private repository was created, connected as `origin`, and the M0 commits pushed to `main`; website publication and audience remain separate later decisions.
- M0 implementation, 6 October 2026: Selected Vite, Canvas with a bounded KaTeX overlay, and d3-force in a Web Worker. Pinned QUDT 3.5.2 official OWL Turtle; generated the unavailable requested JSON-LD artifact deterministically. Inventoried all 1,555 eligible nodes, 1,734 relationships and 2,932 unit references. Added one clearly authored DOE-based equation with exact US unit identities and a separate Fahrenheit interval reference; no conversion execution. Evaluated full graph on desktop and touch-emulated phone viewport, plus closed-tab offline preview startup. See [M0 results](M0-RESULTS.md), [import inventory](QUDT-IMPORT.md), and [technical notes](M0-TECHNICAL-NOTES.md). Actual phone testing remains outstanding. No later milestone or public release was performed.
- v0.2: Confirmed offline-use target with Reload from source, workspace content/layout saving without persisted undo/redo, and a private GitHub repository. Updated all affected requirements, acceptance criteria, and release guidance. No app implementation or deployment performed.
- v0.1: Initial consolidated handoff. Captures accepted graph concept, corrected quantity/property taxonomy, contextual constants, portable authoring, and intended Mac/GitHub/Pages workflow. No app implementation or deployment performed.
