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
- The GitHub repository stays private for now. Public site release is a separate later decision.
- Source export that can reproduce curated data/defaults in future builds.
- React, TypeScript, dockview-react, QUDT, and future CoolProp WASM.
- M2 MacBook Air development, Android/iPhone authoring, Git, GitHub, and eventual GitHub Pages alpha.
- Stage order: graph; flashcards; solver; test generator; calculation visualizer.

The latest classification decision supersedes the earlier proposal to treat Quantity and Property as mutually exclusive root types. The course does not mandate the distinction.

## Provisional implementation defaults

These let M0 proceed. They are recommendations, not previously settled user requirements.

| Topic | Working default | When to revisit |
| --- | --- | --- |
| Backend/accounts | Browser-local workspaces; no login, shared server workspace, or automatic synchronization | If collaboration or cloud sync becomes a requirement |
| Device transfer | Explicit workspace file export/import | When synchronization is requested |
| Import conflicts | Load a file as a separate workspace; do not silently merge concurrent edits | Before M3 |
| Initial graph weight | Distinct visible neighbours contribute equally, with bounded size/influence | During M0/M1 |
| Group colours | User-selected primary group colour plus membership markers | During M2 |
| Source export | Versioned, deterministic data and assets consumable by the app; exact format chosen by Codex | Before M3 |
| Release trigger | Separate manually initiated alpha publishing from ordinary code pushes | Before M4 |
| App name | HVACR Knowledge Graph is a working name | Before public release |

Offline use is now selected. The implementation must distinguish online preparation, offline-ready status, and offline reopening; storing edits in an online tab alone is insufficient. The working interpretation of source is the released app content/defaults, not direct authenticated access to the private GitHub repository. Detailed source-replacement behaviour is specified in the product brief.

## Questions to resolve at the relevant milestone

1. Which GitHub account and repository name should be used for the private repository? Is a publicly reachable Pages alpha acceptable at the later release milestone?
2. What do ambiguous preferred labels mean in this project, especially g, gr, lb, oz, Ton, and gallon/water-column conventions?
3. For each named engineering constant, what is its associated classroom equation, source, and intended units?
4. What actual Android/iPhone models and browsers should define the performance baseline?

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

- M0 implementation, 6 October 2026: Selected Vite, Canvas with a bounded KaTeX overlay, and d3-force in a Web Worker. Pinned QUDT 3.5.2 official OWL Turtle; generated the unavailable requested JSON-LD artifact deterministically. Inventoried all 1,555 eligible nodes, 1,734 relationships and 2,932 unit references. Added one clearly authored DOE-based equation with exact US unit identities and a separate Fahrenheit interval reference; no conversion execution. Evaluated full graph on desktop and touch-emulated phone viewport, plus closed-tab offline preview startup. See [M0 results](M0-RESULTS.md), [import inventory](QUDT-IMPORT.md), and [technical notes](M0-TECHNICAL-NOTES.md). Actual phone testing remains outstanding. No later milestone or public release was performed.
- v0.2: Confirmed offline-use target with Reload from source, workspace content/layout saving without persisted undo/redo, and a private GitHub repository. Updated all affected requirements, acceptance criteria, and release guidance. No app implementation or deployment performed.
- v0.1: Initial consolidated handoff. Captures accepted graph concept, corrected quantity/property taxonomy, contextual constants, portable authoring, and intended Mac/GitHub/Pages workflow. No app implementation or deployment performed.
