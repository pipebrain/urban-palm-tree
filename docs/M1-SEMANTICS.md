# M1 semantic boundary

Implemented 6 October 2026. This boundary adds application interpretation around the unchanged QUDT 3.5.2 import. It does not replace the full eligible universe with the reviewed HVACR concepts.

## Source, identity, and validation

`parseDataset(unknown)` checks schema version 1, required metadata, field shapes, provenance, supported root kinds, and all graph/unit/binding references before yielding a usable dataset. Imported record versions must agree with `source.version`; reported imported node, quantity, constant, edge, and unit totals must agree with the actual records. Counts are checked against the supplied report, not hardcoded to this release. Authored additions are kept separate from the imported counts.

Accepted objects are frozen recursively in place. No normalization, reconstruction, or unknown-field filtering occurs. The imported presentation record remains available beside a label/LaTeX override; unknown fields on source metadata, records, and nested objects remain intact. Errors contain field paths and affected IDs, and validation failure returns no partial dataset.

Learning-node, unit, and relationship IDs must be unique. QUDT has five shared ConstantValue IDs used by separate constant aliases. Identical shared value declarations are permitted across parents; conflicting declarations and repeated values within one parent are rejected. For example, Permeability of Vacuum and Magnetic Constant retain distinct learning IDs while referencing the same source value record. Equality of value, label, or symbol never merges learning concepts.

Graph edges and explicit equation bindings must resolve to learning nodes. Explicit units, constant-value units, equation-binding units, and applicable-unit references must resolve to reference records. Quantity-kind references must resolve to quantity nodes. Technical dimensions and external provenance references are separate from graph endpoints: the four missing source subjects reported by M0 remain reported and preserved. A missing dimension-vector record does not become an invented learning node or invalidate otherwise complete learning connections.

The original record shown by the application is its unchanged imported index record. The complete RDF, including predicates omitted from that display projection, remains preserved in the repository's `data/qudt/QUDT-all-in-one-OWL.ttl` and lossless `data/qudt/qudt-all.jsonld`. M1 does not claim that the lightweight browser index contains all RDF triples.

## Reviewed quantity overlays

`reviewedClassifications` holds 18 exact QUDT IDs. Every entry records application authorship, review date, rationale, and consulted source URL. The source record's QUDT provenance remains separate. No regex, symbol, unit, dimension, or broader-concept inheritance assigns a classification.

| Quantity-kind IDs (final URI segment) | Reviewed role |
| --- | --- |
| Temperature, ThermodynamicTemperature, Pressure, Volume, Density, SpecificVolume | Thermodynamic state property |
| Enthalpy, SpecificEnthalpy, InternalEnergy, SpecificInternalEnergy, Entropy, SpecificEntropy | Thermodynamic state property |
| Heat, Work | Energy transfer during a process |
| HeatFlowRate, Power | Energy transfer rate |
| MassFlowRate, VolumeFlowRate | Flow rate |

State-property is a quantity subtype, with a stated scope of thermodynamic use for a specified system in equilibrium. Broad concepts such as pressure and volume also have uses outside that scope. Total and specific quantities retain separate IDs; amounts and rates retain separate classifications. The state-property hexagon does not change a record's root `kind: quantity`.

The scientific basis was checked against [ASHRAE's thermodynamics chapter, sections 1.1–1.3 and 1.7](https://handbook.ashrae.org/Handbooks/F21/IP/F21_Ch02/F21_Ch02_ip.aspx) and [DOE Fundamentals Handbook volume 1, printed pages 3–4, 6–10, 17–22 and 31](https://www.energy.gov/documents/doe-hdbk-1012-92vol1). Per-entry rationales identify the applicable source. The remaining rates use the definitions of [QUDT HeatFlowRate](https://qudt.org/vocab/quantitykind/HeatFlowRate.html), [Power](https://qudt.org/vocab/quantitykind/Power), [MassFlowRate](https://qudt.org/vocab/quantitykind/MassFlowRate.html), and [VolumeFlowRate](https://qudt.org/vocab/quantitykind/VolumeFlowRate.html), checked on the same date.

All other quantities remain general Quantity with `review-needed` status and an explicit explanation. For example, wet-bulb temperature is not automatically assigned the reviewed Temperature role, and generic SpecificHeatCapacity remains unreviewed pending the process/constraint distinction. This is incomplete classification coverage by design, not a claim that those concepts lack valid scientific classifications. These overlays are application judgments grounded in the sources, not a claim that QUDT itself supplies this taxonomy.

## Relationships, backlinks, and weights

`buildGraphIndex` builds maps keyed only by stable identities. Incoming and outgoing relationships retain their exact predicate, direction, and provenance. `describeRelationship` distinguishes specialization, broader concept, organization, quantity kind, derivation, conceptual association, equation participation, and assumed value. Unknown predicates retain their labels and a visible review explanation. The interpretation of broader and associative links follows the [W3C SKOS reference](https://www.w3.org/TR/skos-reference/#semantic-relations); QUDT's [specialization](https://qudt.org/schema/qudt/specializationOf) and [organization](https://qudt.org/schema/qudt/organizedUnder) predicates retain distinct meanings.

Equation-participation arrows mean explicit membership through bindings; they never assign a permanent input or output. Display math is not parsed to discover participants. The present learning equation has four participating quantity IDs, with units explicitly attached to the equation and its bindings.

`unitUseBacklinks` counts each using learning record once, including explicit node units, constant-value units, and binding units. `unitApplicableBacklinks` reports QUDT compatibility separately. Selecting a default display preference is a separate presentation relationship and is not retroactively attributed to QUDT as explicit use.

Distinct undirected learning neighbours determine graph degree. Multiple predicates between the same pair count once; self-links add no neighbour; units, value records, classifications, and display preferences add no force weight. Filtering uses the visible learning subgraph when calculating visible degree.

## Verification and scope

Nine semantic tests cover full-import acceptance; unknown-field retention and immutability; schema, provenance, and count failures; duplicate and dangling identities; shared-value aliases; repeated symbols and renames; binding/value use backlinks; directed relationship meaning; unique-neighbour weighting; and reviewed versus unreviewed classifications. Run `sh scripts/pnpm.sh exec node --test tests/semantics.test.mjs`.

These tests establish domain integrity. They do not establish phone usability, conversion correctness, durable editing, undo/redo, workspace loading, or source-reload behavior. Full authoring remains M2 and persistence remains M3; browser interaction verification is recorded separately.
