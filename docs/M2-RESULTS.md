# M2 — editing, curation, groups, and action history

**Implementation and local verification complete; physical-phone review outstanding.** App version **0.2.0**, QUDT **3.5.2**, 6 October 2026. Andrew authorized M2 after reporting that the corrected M1 0.1.1 release passes on Android and iOS phones. That is M1 smoke acceptance, not verification of the new M2 authoring controls.

The public [GitHub Pages preview](https://pipebrain.github.io/urban-palm-tree/) remains **M1 0.1.1**, source [`9ada4474`](https://github.com/pipebrain/urban-palm-tree/commit/9ada447447811f51000db92f9287fc45045e2e18). **M2 publication has not been authorized.** This report records the implemented M2 scope and production-build verification. M2 has not been tested on physical phones or published.

## Implemented scope

The immutable starting baseline remains **1,555 imported learning nodes + 1 app-authored equation**, **1,734 source relationships + 4 equation-participant links**, and **2,932 imported unit references + 1 authored Fahrenheit interval**. Session-authored content and source overrides are stored separately; exclusions do not delete imported records or alter their identities.

Editors create and change quantities, equations, contextual constants, and typed relationships. Node fields include names, notation, descriptions, Markdown notes, sources, assumptions, quantity classifications, explicit unit references, constant context/values, and equation participant bindings. Bindings retain exact concept/unit IDs, and participant relationships follow those bindings rather than parsed LaTeX. Unit editing changes notation and explanatory content while preserving exact identity and original conversion metadata. Original source values remain inspectable and restorable.

Markdown notes render math through the existing KaTeX component, support internal `node:`/`unit:` links, and allow embedded PNG/JPEG/GIF/WebP images or web-linked images. The editor limits an embedded image to 5 MiB. HTML is skipped, executable URL schemes are rejected, and unavailable linked images have a visible fallback. Reference checks parse the same Markdown/math syntax used for display, including reference-style links, so deleting an authored concept cannot silently break an internal note reference. Code and mathematical notation do not become semantic references merely because they contain similar text.

Groups have names, colours, and overlapping concept membership. The first matching group's colour is used on the map; a badge shows the membership count. Group filters, reversible node/relationship exclusion, restoration, and deletion of authored content are available in the current implementation. Removing a group retains its concepts. Deleting referenced custom content is rejected until its references are resolved; exclusions preserve references.

Transactional authoring commands validate before replacing state. A completed editor Save, group or membership action, exclusion/restoration, explicit pin action, or completed drag forms one undoable action. Force-layout ticks are excluded from history. Undo/redo operates only in the active session, with visible controls available to touch users. The immutable reference baseline is not stored as mutable edits. History reuses unchanged frozen content, so moving a node does not copy every embedded image or serialize all notes. Failed compound actions leave current content and prior history untouched.

Numerical conversion remains unavailable. Unit preferences choose an exact reviewed display unit without changing recorded values. Changing the unit attached to an existing numerical constant cannot silently relabel that number; the workflow must explicitly handle the old value and independently verified replacement context. Tests confirm rejection preserves the previous value, unit, and history; an independently verified replacement may be entered after explicitly removing the prior value.

## Dependency changes

The lockfile pins these new runtime dependencies for Markdown rendering and internal-reference integrity:

| Dependency | Version | Purpose |
| --- | --- | --- |
| `react-markdown` | 10.1.0 | Render Markdown as React elements with explicit component and URL handling |
| `remark-math` | 6.0.0 | Parse inline/display math for the existing KaTeX presentation |
| `mdast-util-from-markdown` | 2.1.0 | Parse note references from a Markdown syntax tree |
| `mdast-util-math` | 3.0.0 | Match math-node treatment during reference checks |
| `micromark-extension-math` | 3.1.0 | Use the same math grammar during reference checks |

The renderer and parser choices follow the official [react-markdown documentation](https://github.com/remarkjs/react-markdown), [remark-math documentation](https://github.com/remarkjs/remark-math), and [mdast parser documentation](https://github.com/syntax-tree/mdast-util-from-markdown). The renderer uses React components rather than executing document HTML; the independent reference validator shares its Markdown/math grammar.

## Acceptance and verification record

All checks below ran against the production build at `http://127.0.0.1:4175/urban-palm-tree/` on **6 October 2026**. Browser evidence is Mac automation, with desktop **1440×960** and phone **390×844** viewports. It does not substitute for Android/iPhone testing.

| M2 criterion | Result and evidence |
| --- | --- |
| Create and connect an HVACR quantity, equation, and contextual constant | Pass: domain validation and desktop/touch authoring workflows create all three, bind participants, and create typed relationships |
| Edit a unit, node name, or symbol without changing stable identity | Pass: bindings and backlinks retain IDs; unit label/LaTeX edits propagate; original source remains inspectable and restorable |
| Overlapping groups; deleting a group retains its members | Pass: group membership, primary colour/count marker, filter, deletion, and history restore |
| Undo/redo exclusion, restoration, membership, placement, and deletion | Pass: domain transactional actions plus authoring/graph browser workflows; referenced deletion is refused |
| One Save/drag is one history action; force ticks create none | Pass: edit/cancel checks, completed drag, repeated pin/unpin, cancelled drag, hidden-node restoration, and force movement |
| Notes, embedded images, internal links, and math work on desktop/phone | Pass: Chrome and WebKit render inline/display math and images; unsafe schemes/HTML remain inert; preview links cannot navigate away from an unsaved draft |
| Constant context and equation participation remain inspectable/editable | Pass: precise numerical strings, sources, assumptions, status, explicit bindings, and matching participation links |
| A numerical value's unit is never silently relabelled | Pass: incompatible change is rejected without conversion; failed edits preserve content/history |

**Build and integrity:** frozen-lockfile installation, TypeScript, formatting, deterministic QUDT regeneration/check, **57/57 tests**, and the repository-subpath production build pass. The full eligible source remains unchanged. Tests cover frozen originals, shared QUDT value aliases, exact IDs, reference-style Markdown links, compound failures, history branching/no-ops, equation binding synchronization, exclusion, deletion, unit guards, and shared immutable history content. All 331 imported constants were also checked for a successful display-name edit without losing original identity.

**Toolchain:** macOS **27.0.1 arm64**, Node **24.19.0**, pnpm **11.25.0**, Playwright **1.63.0**, installed Chrome **154.0.8037.98**, and Playwright WebKit **26.6** (build 2359). WebKit automation is not the iPhone Safari application.

**Browser workflows:** existing full-graph interaction and semantic regressions pass on desktop and touch-emulated phone. New editor workflows pass in Chrome and WebKit on both layouts, and in a fresh offline Chrome phone-sized document. Group/placement/history checks pass in Chrome on both layouts. No page errors or document horizontal overflow were reported. The final desktop Chrome and phone WebKit screenshots were visually inspected. Ordinary authoring runs block service workers to isolate the current app; offline runs explicitly enable and verify them.

Production testing exposed a touch click-through bug: switching to Inspector on `pointerup` let the subsequent native click activate the new content beneath the finger. Selection now opens Inspector from the canvas click. A phone regression verifies both the click target and retained selected identity; drag, cancellation, pinch, and pin history continue to pass.

**Offline:** build **`a3ccb9ca6434f09fef63`** prepares **67 assets / 7,206,112 bytes**, including the full baseline, layout worker, Inter, and 59 KaTeX font files. The inventory excludes incidental Finder metadata from generated output. The baseline offline harness closes all app tabs, disables networking, and opens a fresh document; both layouts reopen the full graph, unseen records, unit preferences, and local math/interface fonts. The authoring offline workflow then creates and edits content, renders an embedded image, and exercises undo/redo in a fresh phone-sized document. This verifies in-session offline authoring; it does not preserve those edits across another reload.

Single local observations: online first-graph readiness **446 ms desktop / 341 ms phone emulation**; fresh offline startup **337 ms / 623 ms**, respectively. These are developer-machine observations, not phone performance guarantees, cold browser-process starts, reboot tests, or storage-retention certification. The build reports an advisory chunk-size warning (main JavaScript about 1.12 MB, 310 kB gzip); bundle splitting and prolonged phone-memory measurements remain optimization work, not a passed performance budget.

Retained machine-readable evidence:

- [Build and integrity checks](verification/m2-build-checks.json)
- [Full graph interaction](verification/m2-browser-report.json) and [semantic browsing](verification/m2-semantic-browser-report.json)
- [Chrome authoring](verification/m2-authoring-chromium-report.json) and [WebKit authoring](verification/m2-authoring-webkit-report.json)
- [Groups, placement, and history](verification/m2-graph-browser-report.json)
- [Fresh offline baseline](verification/m2-offline-report.json) and [fresh offline authoring](verification/m2-authoring-chromium-offline-report.json)

Tested implementation commit: [`313984e3d69f1f4ed54ba59eaf5e72f9b911feec`](https://github.com/pipebrain/urban-palm-tree/commit/313984e3d69f1f4ed54ba59eaf5e72f9b911feec). The following documentation-only commit records this evidence without changing the build.

## Try M2 locally

Start the production preview using the README commands. On a phone layout, open **Search**; on desktop, use **Library**. Choose Quantity, Equation, or Constant, then **Create concept**. Use **Edit concept**, **Edit unit**, and the relationship controls to revise existing content. Enter exact participant/unit references separately from display notation. Save applies one action; Cancel discards the draft.

Create groups from the Library/Search panel and manage membership in Inspector. Exclude a concept, find it using **Excluded concepts only**, and restore it. Use the visible **Undo/Redo** buttons for edits, groups, curation, and graph placement. For a phone smoke check after a separately requested publication, repeat creation, notes/image rendering, group membership, exclusion/restoration, canvas selection, drag/pinch, and undo/redo on both devices.

## Limits and next step

- All authored content, embedded images, preferences, curation, groups, placements, and undo/redo remain in memory. **Save applies the editor action to this session; it does not save a workspace file.** Refreshing or closing loses this work. Browser warnings are not a substitute for durable saving.
- Autosave, portable workspace files, deterministic source export, and Reload from source remain **M3**. No persisted undo/redo is introduced.
- Linked images and external sources may require connectivity. Embedded image portability cannot be claimed until workspace files exist.
- Numerical unit conversion, general equation solving, CoolProp evaluation, flashcards, generated problems, and calculation visualizations remain outside M2.
- Classification and reviewed unit coverage retain M1's limits. Source constants may be historical; no calculations use them.
- M1 physical-phone acceptance does not certify M2. Public Pages remains M1 0.1.1 until a separately authorized M2 deployment.

M2 implementation and local verification are complete. The next review is physical-phone testing after an explicitly requested M2 release. The next planned implementation milestone is **M3 — persistence and reusable content**; it has not been started.
