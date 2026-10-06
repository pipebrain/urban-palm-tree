# M1 — browsing and semantic foundation

Implemented and verified 6 October 2026, app **0.1.0**, QUDT **3.5.2**. The M1 source is ready for review and the next editing milestone. Andrew authorized M1 implementation after reporting acceptable rough performance on actual Android and iOS. Device/browser versions and a detailed protocol were not supplied; that feedback is M0 smoke evidence, not comprehensive M1 or offline device acceptance.

Andrew then requested M1 publication for iPhone and Android testing. The manual Pages deployment of [`7fb7d539`](https://github.com/pipebrain/urban-palm-tree/commit/7fb7d5396a30a1dafeb57e156c6aa334a206c7e8) succeeded, and the [public URL](https://pipebrain.github.io/urban-palm-tree/) now serves M1. See [deployment evidence and phone-check guidance](M1-PAGES-DEPLOYMENT.md). Actual M1 phone results remain pending.

Tested application source: [`b95c4ff`](https://github.com/pipebrain/urban-palm-tree/commit/b95c4ffadb47a7a35f3e844147f1c3b33d8da7bd); subsequent documentation commits preserve this verification record.

## Delivered behavior

The initial graph still contains **1,555 imported concepts + 1 authored equation** and **1,734 source assertions + 4 equation-participant links**. All eligible imported records, including 419 isolates and 100 deprecated records, remain available. **2,932 imported unit records + 1 authored Fahrenheit interval** live in the separate reference dictionary. Technical ontology subjects remain accounted for in the original source and import inventory.

Source records are validated and deeply frozen before opening the workspace; authored records and display overrides remain separate. Stable-ID indexes keep same-symbol concepts distinct, preserve links through renaming, and count exact unit uses once per using concept. Malformed versions, counts, duplicated identities, or dangling learning/unit references fail visibly rather than opening a partial workspace. Unknown source fields and the complete original RDF are retained. Five legitimate shared QUDT constant-value aliases remain valid.

Eighteen sourced classification overlays include **12 thermodynamic state-property quantities**, drawn as hexagons and explicitly labelled as quantity subtypes. Heat/work, transfer rates, and flow rates have distinct reviewed roles. Other quantities remain review-needed. Every relationship retains its exact predicate, direction, and source; equation participation is membership without a fixed solve direction. The four unresolved upstream subject references are visible in the import overview and affected inspectors. The Btu IT/thermochemical prose disagreement is flagged at its unit reference.

A US customary profile provides exact, reviewed unit choices for **46 quantity concepts**. Alternatives use explicit identities and contexts for readings versus intervals, pressure reference, mass versus force, gallon variants, and water-column conventions. Original source applicability, explicit uses, and default/session display choices have separately labelled backlinks. Missing metadata is visible, and no numerical conversion is implied. Values and equation unit conventions cannot be relabelled through the preference control.

Desktop has Library, Map, Inspector, and a separate Units panel. Phone views expose the same functions through four touch tabs. Search covers concepts and the complete unit dictionary, with more results available on demand. Back/forward navigation follows references. Type, classification, source, deprecation, and relationship filters produce reversible views. One/two-hop neighbourhood focus uses only explicit edges. Hidden selections remain inspectable, and Show on map returns them to view.

Canvas sizing uses `4 + min(6, sqrt(distinct visible neighbour count))`. Each visible pair supplies one layout spring regardless of duplicate/reverse assertions. Units, dimensions, value objects, classifications, and display preferences add no graph weight. The legend explains these choices and the nonphysical layout. Stable-ID positions and pins survive filtering and display edits; pause and camera survive view changes. Empty filters and worker failures have explicit feedback. Labels remain bounded to 60 KaTeX overlays.

Name/LaTeX overrides are a small identity demonstration: Apply display changes only presentation, and Restore source display recovers the original. They do not provide full M2 authoring or M3 persistence.

## Acceptance evidence

| M1 criterion | Evidence |
| --- | --- |
| Full eligible default universe, separate technical/unit records | Real-source integrity tests and both browser profiles draw all 1,556 nodes |
| Same-symbol concepts remain distinct | Domain tests plus browser selection of ElectricDipoleMoment and ForcePerArea, both using source symbol `p` |
| Rename preserves references | Domain tests; browser rename of MassFlowRate preserves equation participant and relationship identity |
| Own unit panel and correct explicit-use backlinks | Browser internal navigation and separate use/preference/applicability indexes |
| State properties are visible quantity subtypes | Exact-ID reviewed overlays, inspector labels, map hexagons and legend; screenshot review |
| Equation connections have no fixed solve direction | Typed relationship explanations and explicit participant bindings; tested without parsing display math |
| Exact compatible unit preferences, KaTeX | Ten unit tests, strict KaTeX rendering, browser reading/interval and gauge-reference checks |
| Honest unknown/missing records and conversions | Unreviewed concepts, absent descriptions, unresolved source subjects, missing metadata; invalid-baseline UI check |
| Desktop and touch-only browsing/navigation | Desktop and phone-emulated search, canvas tap, pan, pinch, drag, filters, units, and reference history; physical M1 follow-up remains |

**37 automated tests pass**: seven full-source/import tests, four service-worker integrity tests, three view-projection tests, four layout/weight tests, nine semantic-boundary tests, and ten unit tests. TypeScript, formatting, deterministic data generation/checks, the production subpath build, and an offline frozen-lockfile install pass. No dependencies were added or upgraded.

Three browser harnesses passed at `http://127.0.0.1:4174/urban-palm-tree/`: interaction/layout, semantic navigation, and fresh-document offline startup. Chrome **154.0.8037.98**, macOS **27.0.1 arm64**, desktop **1440×960**, phone emulation **390×844**. Tests use isolated contexts; interaction timing blocks service workers, while offline tests allow them. Reports show zero page errors and no horizontal overflow. Screenshots were inspected for desktop and phone map/inspector layout. Phone emulation is not Android/iPhone hardware or Safari execution.

| Observation | Desktop | Phone emulation |
| --- | ---: | ---: |
| Local navigation to graph + at least 4 worker ticks | 417 ms | 337 ms |
| Arranging rAF interval p95 | 16.7 ms | 16.8 ms |
| Sample Canvas draw callback | 0.7 ms | 0.6 ms |
| Approximate main-thread JS heap after interactions | 37.7 MiB | 18.9 MiB |
| Fresh offline document to running full graph | 376 ms | 354 ms |

These are single local observations, not phone/network performance guarantees. rAF timing is not a continuous gesture/compositing benchmark; heap excludes worker/GPU/process memory. No long-duration memory/thermal test was performed. Interaction measurements precede the final source-warning text and reference-scroll additions; the final semantic and offline checks include those additions. Selecting a different concept or unit resets its inspector scroll to the heading. See [interaction report](verification/m1-browser-report.json), [semantic browser report](verification/m1-semantic-browser-report.json), and [offline report](verification/m1-offline-report.json).

The final offline build **`40ca6a39ad76d82a123f`** prepared **65 assets / 6,671,900 bytes**, including the full node/unit index and **59 font files**. The harness verifies every asset against that inventory, closes every app tab, disables network, then opens a new page. It inspects previously unviewed constant/unit/math, changes reading and interval display preferences, and verifies that source uses and equation conventions remain unchanged. This establishes fresh-document startup within the browser context, not survival through process restart, reboot, eviction, or private-browsing policies.

## Limits and next step

- Session overrides, preferences, filters, navigation, and pins are temporary. Refresh loses them. Changing between the desktop and phone workspace layout remounts the canvas and resets its local positions/pins; applied semantic display choices remain in the active app session. Durable layout/content restoration belongs to M3.
- Classifications and unit choices deliberately cover a reviewed subset. Unknown concepts remain browseable. Source constants may be historical; no calculations use them. This is not a complete HVACR curriculum.
- Numerical conversion, general equations, CoolProp calculations, full authoring, groups, undo/redo, autosave, workspace files, source export, and Reload from source are not implemented by M1.
- M1 is published for a focused actual Android/iPhone smoke check. Record models/browser versions and revisit offline reopening, rotation, and storage behavior. Andrew's prior M0 report supports feasibility, not these new controls' device certification.
- The main JavaScript chunk remains approximately 944 kB minified / 259 kB gzip; Vite's size warning is retained. Full offline assets remain about 6.7 MB. Optimize using measured device constraints rather than reducing the required starting graph.

Next implementation milestone: **M2 — full editing, reversible curation/groups, and action-level undo/redo**, building on the stable identities and immutable reference layer. Future publication continues to use the manual Pages workflow under Andrew's release instruction.
