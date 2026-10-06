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
- The chosen GitHub repository is `pipebrain/urban-palm-tree`. Andrew made it public and authorized a public GitHub Pages M0 feasibility preview, then M1 publication for iPhone and Android checks, on 6 October 2026. M2 was subsequently published and accepted against its Done when criteria; M3 onward and classroom alpha acceptance remain outstanding.
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
- The live M1 0.1.1 correction bundles pinned Inter 4.1 locally, replaces font-dependent UI icons with SVG, and gives the hop selector explicit WebKit appearance and a matching 44 px mobile height. KaTeX keeps its existing mathematical font assets. Deployment of `9ada4474` succeeded, and live release assets match the verified build. All 37 tests, local Chrome/WebKit checks, and offline font checks pass. Andrew subsequently reported that the correction passes on Android and iOS phones, closing the rendering follow-up. This is user-reported smoke acceptance, not comprehensive offline/storage certification; see [rendering correction](M1-IOS-RENDERING-FIX.md).

## M2 implementation decisions — 6 October 2026

Andrew authorized M2 after the successful physical-phone recheck. Local source is **0.2.0, implemented and locally verified** with 57 passing tests and successful production browser checks. Andrew subsequently unpublished Pages and explicitly requested redeployment; M2 0.2.0 is now published from `95684ad4`, with successful live asset, Chrome/WebKit authoring, and fresh offline verification. See the [M2 deployment record](M2-PAGES-DEPLOYMENT.md). See [M2 results](M2-RESULTS.md). Andrew then confirmed M2 complete against its Done when criteria; no detailed device/version or offline/storage protocol accompanied the confirmation.

- One transactional authoring state holds custom nodes/relationships, source overrides, exclusions, groups, explicit placements, and unit preferences separately from the immutable baseline. IDs and original provenance remain intact. A failed command must preserve the previous state.
- A completed Save, membership change, exclusion, or drag is one undoable action. Automatic layout ticks do not become history. Save applies a session edit; it does not write a workspace file. Autosave, portable files, source export, and Reload from source remain M3.
- Markdown notes use pinned `react-markdown` **10.1.0** and `remark-math` **6.0.0**, with HTML skipped, allowed link/image protocols, and the existing safe KaTeX renderer. Internal `node:` and `unit:` links retain exact identities. `mdast-util-from-markdown` **2.1.0**, `mdast-util-math` **3.0.0**, and `micromark-extension-math` **3.1.0** use the same Markdown/math syntax for reference-integrity checks, rather than guessing links from text patterns.
- Embedded PNG, JPEG, GIF, and WebP images remain in the editing session; linked images retain their network dependency. M2 does not claim durable asset storage or portable workspace export.
- Groups can overlap and remain independent of scientific classifications. The first matching group's colour supplies the map colour, and a count badge indicates multiple memberships. Deleting a group retains its concepts. Curation excludes content reversibly rather than removing source records.
- Unit edits change notation and explanatory content while preserving exact identity and conversion metadata. Numerical conversion is still unavailable; editing a recorded value's unit must not silently relabel the existing number. Equation participant links follow explicit bindings rather than parsed LaTeX.

## Provisional implementation defaults

These defaults guide remaining implementation. M1 choices and M2 implementation decisions are recorded above; Andrew has accepted M2 against its Done when criteria.

| Topic            | Working default                                                                                                                 | When to revisit                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Backend/accounts | Browser-local workspaces; no login, shared server workspace, or automatic synchronization                                       | If collaboration or cloud sync becomes a requirement |
| Device transfer  | Explicit workspace file export/import                                                                                           | When synchronization is requested                    |
| Import conflicts | Load a file as a separate workspace; do not silently merge concurrent edits                                                     | Before M3                                            |
| Graph weight     | M1: distinct visible neighbours, bounded radius, one spring per pair                                                            | If measured usability requires adjustment            |
| Group colours    | M2: first matching group's colour plus a membership-count badge                                                                 | During physical-device usability review              |
| Source export    | Versioned, deterministic data and assets consumable by the app; exact format chosen by Codex                                    | Before M3                                            |
| Release trigger  | Manually initiated Pages publishing via `.github/workflows/pages.yml` (`workflow_dispatch`), separate from ordinary code pushes | Each requested preview or alpha release              |
| App name         | HVACR Knowledge Graph is a working name                                                                                         | Before public release                                |

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

- M2 acceptance, 6 October 2026: Andrew confirmed, “Confirming M2 is complete as per "done when".” M2 is accepted against its milestone criteria. No detailed device/version or offline/storage protocol accompanied this confirmation. M3 remains the next planned milestone; implementation has not started.

- M2 publication, 6 October 2026: Andrew reported that he unpublished GitHub Pages and requested redeployment after finding that the public site did not expose M2 editing. At that request, published M2 0.2.0 commit `95684ad4376cc32221962b34f8acc3699d55ea1a` through [Actions run 37479683546](https://github.com/pipebrain/urban-palm-tree/actions/runs/37479683546), after restoring Pages to workflow publishing. Every release asset matches verified build `a3ccb9ca6434f09fef63`; live Chrome/WebKit authoring and fresh offline checks pass. See the [M2 deployment record](M2-PAGES-DEPLOYMENT.md). Acceptance was outstanding at publication; Andrew subsequently confirmed M2 complete against its Done when criteria.

- M1 phone acceptance and M2 authorization, 6 October 2026: Andrew reports the corrected M1 0.1.1 release passes on Android and iOS phones and instructs Codex to proceed with M2. Local version 0.2.0 now implements editing, curation, groups, and action history; 57 tests and the production Chrome/WebKit authoring, graph, semantic, and offline checks pass. At implementation completion, the public site remained M1 0.1.1; the later redeployment request separately authorized M2 publication. This acceptance does not certify offline/storage behavior. See [M2 results](M2-RESULTS.md).
- M1 rendering correction release, 6 October 2026: Published version 0.1.1, commit `9ada447447811f51000db92f9287fc45045e2e18`, through [Actions run 37454092024](https://github.com/pipebrain/urban-palm-tree/actions/runs/37454092024). The live index, service worker, inventory, Inter font, and license return HTTP 200 and match local build `fd67e8fbe52c3c3a5a13` byte for byte. The 37 tests, local Chrome/WebKit checks, and offline font checks pass. Actual-phone retesting was pending at publication and subsequently passed by Andrew's report; see [rendering correction](M1-IOS-RENDERING-FIX.md).
- M1 physical-phone feedback, 6 October 2026: Andrew initially reports M1 passes on iOS and Android except for UI rendering issues in iOS Safari and Chrome. KaTeX renders as expected; other fonts appear missing, the logo arrow appears as an emoji, and the hop selector is too short. Both screenshots remain outside the public repository. The subsequent 0.1.1 correction addresses interface fonts, icons, and control sizing, and Andrew later reports both phones pass. Neither report establishes comprehensive offline/storage certification. See [M1 results](M1-RESULTS.md).
- M1 Pages deployment, 6 October 2026: At Andrew's request for public iPhone and Android testing, published commit `7fb7d5396a30a1dafeb57e156c6aa334a206c7e8` through [manual Actions run 37448915597](https://github.com/pipebrain/urban-palm-tree/actions/runs/37448915597). See [M1 deployment record](M1-PAGES-DEPLOYMENT.md). This releases the verified browsing milestone without declaring physical-device acceptance or later milestones complete.
- M1 implementation, 6 October 2026: Completed the semantic browsing foundation and recorded user-reported M0 Android/iOS smoke testing. [M1 results](M1-RESULTS.md) distinguish automated/browser evidence, remaining physical-device checks, and the separate M0 public deployment.
- Pages deployment, 6 October 2026: Published M0 commit `85c174f0a1655db666e299afea436677fd0c0067` through the manual Actions workflow. HTTPS site and full-graph, touch-emulation, unit/math, and fresh-document offline checks passed at `https://pipebrain.github.io/urban-palm-tree/`. See [deployment evidence](PAGES-DEPLOYMENT.md). This does not complete physical-device or later-milestone acceptance.

- Publication decision, 6 October 2026: Andrew changed `pipebrain/urban-palm-tree` to public and requested enabling GitHub Pages for the current M0 feasibility preview. This supersedes the earlier private-only and wait-until-M4 publication constraints. Deployment is manually triggered, independent of code pushes. A successful deployment and URL verification must be recorded separately; no later milestone is declared complete by publication.
- Repository selection, 6 October 2026: Andrew selected owner `pipebrain`, repository name `urban-palm-tree`, and private visibility. The private repository was created, connected as `origin`, and the M0 commits pushed to `main`; website publication and audience remain separate later decisions.
- M0 implementation, 6 October 2026: Selected Vite, Canvas with a bounded KaTeX overlay, and d3-force in a Web Worker. Pinned QUDT 3.5.2 official OWL Turtle; generated the unavailable requested JSON-LD artifact deterministically. Inventoried all 1,555 eligible nodes, 1,734 relationships and 2,932 unit references. Added one clearly authored DOE-based equation with exact US unit identities and a separate Fahrenheit interval reference; no conversion execution. Evaluated full graph on desktop and touch-emulated phone viewport, plus closed-tab offline preview startup. See [M0 results](M0-RESULTS.md), [import inventory](QUDT-IMPORT.md), and [technical notes](M0-TECHNICAL-NOTES.md). Actual phone testing remains outstanding. No later milestone or public release was performed.
- v0.2: Confirmed offline-use target with Reload from source, workspace content/layout saving without persisted undo/redo, and a private GitHub repository. Updated all affected requirements, acceptance criteria, and release guidance. No app implementation or deployment performed.
- v0.1: Initial consolidated handoff. Captures accepted graph concept, corrected quantity/property taxonomy, contextual constants, portable authoring, and intended Mac/GitHub/Pages workflow. No app implementation or deployment performed.
