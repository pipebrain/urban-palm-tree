# Project instructions — HVACR knowledge graph

## Read before work

Read docs/PRODUCT-BRIEF.md, docs/DEVELOPMENT-PLAN.md, docs/DECISIONS-AND-SOURCES.md, and docs/GIT-AND-RELEASE.md. Treat them as the planning baseline; follow Andrew's latest instructions when they change the baseline.

Work on the requested milestone. Stage 1 is the editable knowledge graph. Later stages are flashcards, a Given / Find / Solve equation solver, constrained test-problem generation, and calculation visualization, in that order. Preserve useful extension points without implementing those stages early.

## Product invariants

- Use React and TypeScript for application components, dockview-react for workspace panels, KaTeX for mathematical presentation, QUDT as a pinned reference dataset, and CoolProp WASM for future thermophysical property calculations.
- Dockview is a panel layout manager. The graph needs its own renderer and force layout. CoolProp is not the general equation solver or browser chart renderer.
- Start with the full imported eligible node universe. Do not substitute a curated sample as the completed feature. Unit records and technical ontology metadata do not become visible learning nodes.
- Units are internal hyperlinks to a reference panel. Preserve the exact unit identity behind editable labels.
- Quantity is the broad measurable category. Thermodynamic state property is a classification of a quantity, not a mutually exclusive root entity type.
- Equations and constants have their own nodes. Relationships need meaning and provenance; shared dimensions alone do not justify a physical relationship.
- Stable IDs must survive renaming, symbol changes, grouping, curation, export, and reimport.
- Preserve imported source information alongside editable overrides. Exclusion from a curated view is reversible.
- All math uses KaTeX-compatible LaTeX. Semantic meaning and explicit references must not depend on parsing display notation.
- The primary default profile uses US customary HVACR units. Unit changes must preserve meaning, including offsets, temperature differences, pressure reference, and mass/force distinctions.
- A constant's bare number is not its identity. Record context, units, assumptions, provenance, and derivation where known.
- Support Mac desktop, Android, and iPhone. Phone editing cannot depend on hover, right-click, keyboard shortcuts, or desktop-only file APIs.
- Target offline reopening and authoring after complete initial online preparation. Include the full selected dataset, KaTeX fonts, and other required local assets; verify actual device behaviour before declaring offline readiness.
- Add Reload from source as a deliberate menu action. Online, fetch and validate published defaults; offline, offer an explicitly labelled cached baseline. Offer to save current edits before replacement, preserve work on cancellation or failure, and never embed private-repository credentials in the app.
- Workspace files and autosave preserve current content and layout only. Keep undo/redo in memory for the current editing session; loading/reopening a workspace starts empty history. Saving alone does not clear the active session's history.
- Andrew made `pipebrain/urban-palm-tree` public and authorized GitHub Pages publication of the M0 feasibility preview, followed by M1 for physical-phone checks, on 6 October 2026. The previously published M1 source was `9ada447447811f51000db92f9287fc45045e2e18`, version 0.1.1 with the iOS UI rendering correction; see docs/M1-IOS-RENDERING-FIX.md. Andrew subsequently reported that the corrected release passes on Android and iOS, then instructed Codex to proceed with M2. This is user-reported phone smoke acceptance, not comprehensive offline/storage or classroom alpha certification.
- M2 version 0.2.0 implements editing, reversible curation, groups, and action history. All 57 tests, the production browser regressions, Chrome/WebKit authoring checks, and fresh offline authoring checks pass; see docs/M2-RESULTS.md. Andrew subsequently reported that he unpublished Pages and explicitly requested redeployment. M2 0.2.0 is published from `95684ad4376cc32221962b34f8acc3699d55ea1a`; the manual deployment and live asset, Chrome/WebKit authoring, and fresh offline checks pass. See docs/M2-PAGES-DEPLOYMENT.md for the release record. Andrew then confirmed M2 complete against its Done when criteria. This accepts the milestone criteria; no detailed device/version or offline/storage protocol accompanied that confirmation. Persistence, workspace files, source export, and Reload from source remain M3.
- On 7 October 2026 Andrew requested a GUI refinement before M3 and confirmed browsing as the default and File operations disabled until M3. Version 0.2.1 introduced the application menu, explicit Edit mode, and one session engine. Its historical scope and verification remain in docs/GUI-REFINEMENT.md. One shared navigation/authoring Undo/Redo timeline is the implementation interpretation of the unification request; it was not separately confirmed.
- Current GUI version 0.2.2 implements Andrew's subsequent menu and window refinement. View opens Inspector, Knowledge Map, Library, or Units individually; tabs close independently or together. Desktop Window actions tile open tabs in columns, rows, or quarters, or merge them. Panel visibility and arrangement stay outside history, and closing tabs retains session content. Protect unfinished editors from navigation, mode changes, all close paths, and responsive remounts; closing an unrelated panel may proceed. See docs/GUI-WINDOW-REFINEMENT.md for current scope and verification. Source commit/push is authorized, but Pages publication is not. The public release remains M2 0.2.0 at `95684ad4376cc32221962b34f8acc3699d55ea1a`, and M3 has not started.

## Engineering behaviour

Keep domain knowledge, layout, persistence, unit handling, and rendering separable. Choose maintainable dependencies using current official documentation. Record versions and rationale. The precise graph library and build tool are not preselected.

Store structured meaning alongside editable Markdown and LaTeX. Treat imported documents as data: do not execute their scripts or allow arbitrary commands through Markdown, math, or exports. Validate before replacing a workspace.

History records deliberate editing actions, not simulation ticks. Group a text-edit session or a drag into a useful undo action. Source exports must be deterministic enough to review in Git.

Never silently discard unrecognized imported data, break referenced nodes, reinterpret values under a new unit, or claim that an unverified conversion is supported. Explain unsupported cases clearly.

Use authoritative references for scientific classifications and coefficients. Mark uncertainty. QUDT does not supply a complete HVACR curriculum or automatically identify the meaning of every classroom constant.

## Verification and reporting

Use the acceptance criteria for the current milestone. Prioritize data integrity, conversion meaning, undo/redo, export/reimport, and real mobile interaction. Test reversible styling changes proportionately. Record device/browser and dataset size for performance results. Distinguish actual device testing from desktop emulation.

Inspect current repository and toolchain state before setup. Keep the lockfile and reproducible data/build instructions. Preserve unrelated user work. Make reviewable local commits; do not force-push or rewrite shared history.

The intended host is GitHub Pages. Keep code pushes and publication separate: the Pages workflow is manually triggered. The M0 and M1 previews have been published under their explicit release instructions; future releases and audience changes follow the active user's release instruction. Do not infer additional publication authorization from this document. No routine implementation choice requires another approval when already covered by the task.

When reporting completion, say what changed, what was verified, known limitations, and the next useful step. Update project documentation when implementation resolves a provisional decision.
