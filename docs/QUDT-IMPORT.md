# QUDT source and import — M0

The starting graph includes **all 1,555 eligible learning records** in the selected QUDT 3.5.2 OWL distribution: 1,224 quantity kinds and 331 physical constants. No curated HVACR subset replaces that universe. The app-authored HVACR example is added separately with separate provenance.

## Exact source and the requested JSON-LD filename

On 6 October 2026, the live [official GitHub release API](https://api.github.com/repos/qudt/qudt-public-repo/releases/latest) reported **v3.5.2**, published 22 September 2026. The cached web rendering of `/releases/latest` still showed 3.5.1, so the live release metadata and downloaded bytes determine the pin.

| Item | Pinned value |
| --- | --- |
| Release | [QUDT v3.5.2](https://github.com/qudt/qudt-public-repo/releases/tag/v3.5.2) |
| Download | [qudt-public-repo-3.5.2.zip](https://github.com/qudt/qudt-public-repo/releases/download/v3.5.2/qudt-public-repo-3.5.2.zip) |
| Selected original file inside ZIP | `QUDT-all-in-one-OWL.ttl` |
| Selected ontology IRI | `http://qudt.org/3.5.2/qudt-all` |
| ZIP bytes / SHA-256 | 11,411,676 / `1a42d6409f57e2d8fc4f55aac5e4378926c28a655a045309714f0014fcea3e02` |
| Turtle bytes / SHA-256 | 6,867,319 / `aa11e3a4b6f0cd60327981f992099538a00fbf23281ef679fef8ddca96e65940` |
| License | [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/), attribution to QUDT.org |
| Machine-readable pin | `data/qudt/source.json` |

The release contains OWL and SHACL all-in-one Turtle distributions, not a `qudt-all.jsonld` asset. Both `https://qudt.org/qudt-all.jsonld` and `https://qudt.org/3.5.2/qudt-all.jsonld` returned HTTP 404. Requesting `https://qudt.org/3.5.2/qudt-all` with `Accept: application/ld+json` returned HTTP 406. These observations are recorded in the source manifest.

To fulfill the intended JSON-LD boundary without inventing an upstream artifact, the importer derives `data/qudt/qudt-all.jsonld` from the exact official OWL Turtle. This is a **locally generated expanded JSON-LD serialization**, not a QUDT-published download. A triple-by-triple round-trip check confirms it preserves all 132,166 source triples, including literal datatypes, language tags, blank nodes, unknown predicates, and technical metadata. It has no remote JSON-LD context dependency. The original ZIP, Turtle, upstream README, and license are retained beside it.

“Full selected source” means the whole official OWL all-in-one distribution. The importer does not recursively fetch external `owl:imports`, merge community extensions from other files, or substitute the different SHACL distribution. External references remain recorded in the source.

## Inventory and eligibility

Counts below are unique RDF subject records, not triple counts. An RDF subject can have several types, so the full type inventory in `data/qudt/import-report.json` intentionally does not sum to the record total.

| Category | Count | Treatment |
| --- | ---: | --- |
| All subject records | 11,148 | All preserved in expanded JSON-LD and original Turtle |
| Named subject records | 5,840 | Original full IRIs retained |
| Blank-node subject records | 5,308 | Source structure retained with deterministic serialization identifiers |
| Explicit `qudt:QuantityKind` individuals | 1,224 | Visible quantity nodes |
| Explicit `qudt:PhysicalConstant` individuals | 331 | Visible constant nodes |
| Total eligible learning nodes | **1,555** | Default imported universe |
| Units | 2,932 | Internal unit references; never learning nodes |
| Other technical/reference records | 6,661 | Retained in source; not drawn as learning nodes |
| Explicit learning relationships | 1,734 | Typed, directed assertions with QUDT provenance |
| Learning nodes without a selected graph relationship | 419 | Still included; no invented links |
| Deprecated eligible nodes | 100 | Still included and flagged |
| Eligible nodes without a description | 493 | Label/identity retained; absence is not filled with invented text |
| Eligible nodes without math notation | 890 | No imported math symbol; a textual label remains available |

Eligibility uses explicit `rdf:type` membership, not names, symbols, dimensions, or existence of an HVACR application. There are no separately typed equation individuals in this selected learning universe. `qudt:ConstantValue` records (331) support their corresponding physical constant, rather than becoming duplicate constant nodes. Units are discovered through the source's explicit subclass closure of `qudt:Unit`; in this snapshot all 2,932 are also explicitly typed `qudt:Unit`.

No thermodynamic state-property classification is inferred. Classification requires reviewed scientific evidence and remains a later semantic authoring task. Quantity is the broad category. Source display symbols never determine identity.

## Relationship policy

The source contains the following selected assertions between eligible endpoints. Each edge keeps the original predicate, direction, and source identifier. These are semantic graph links, not inferred physical causes.

| Predicate | Count | Inspector wording |
| --- | ---: | --- |
| `qudt:specializationOf` | 527 | specialization of |
| `skos:broader` | 723 | has broader concept |
| `qudt:organizedUnder` | 152 | organized under |
| `qudt:hasQuantityKind` | 330 | has quantity kind |
| `skos:related` | 1 | related concept |
| `prov:wasDerivedFrom` | 1 | derived from |

The same pair may have both `specializationOf` and `broader` assertions. Preserve both meanings, but count **distinct neighbours** for degree-based weight so redundant predicates do not inflate node size or force influence. There are no self-loop force edges.

The following assertions are retained as source metadata rather than physical/conceptual layout links: 166 `qudt:exactMatch`, 39 `skos:closeMatch`, 250 `rdfs:seeAlso`, and 76 `dcterms:isReplacedBy`. Shared dimensions and shared applicable units never create learning relationships. These omissions are explicit policy, not dropped source data.

## App boundary

`src/domain/types.ts` defines the M0 projection consumed from `public/data/qudt-graph.json`. It separates semantic records from rendering coordinates and local authored examples.

- Node IDs are full QUDT IRIs; renaming a label or changing notation does not change identity. Edge IDs are deterministic hashes of source, predicate, and target.
- `unitIds` records explicit unit use, including the units on constant-value records. `applicableUnitIds` lists source compatibility references. They must not share a use-backlink count.
- Constant values, uncertainties, conversion multipliers, and offsets remain **strings with source precision**. The projection does not implement or authorize a numerical conversion engine.
- `provenance.origin` distinguishes `qudt` from `authored`. The source snapshot stays immutable; future overrides belong beside it.
- The projection contains English-preferred labels, useful descriptions, original source types, dimension/quantity-kind references, optional symbols, all unit references, and the inventory/gap report. Every original property remains recoverable from the retained RDF even when it has no projected field.
- Descriptions can contain source HTML and LaTeX. Treat them as inert data. Do not inject source HTML or enable trusted KaTeX commands. Mathematical typography is separate from semantic variable bindings.

The browser projection is 4,453,506 bytes before compression. The complete expanded JSON-LD is 13,173,979 bytes. The browser loads the complete learning projection and unit dictionary; the 35.9 MB source/import material stays in the development repository rather than being downloaded as a second rendering dataset. Later developer-reference inspection can add a deliberate source lookup without changing eligibility.

## Gaps requiring review

1. **Release version does not prove current scientific values.** QUDT 3.5.2's `Value_PlanckConstant` is `6.62606896e-34 J s` with nonzero uncertainty. The current SI defines `6.62607015e-34 J s` exactly ([NIST, SI defining constants](https://www.nist.gov/si-redefinition/meet-constants)). The original QUDT value is preserved and all imported constants carry a review-before-calculation assumption. M0 does not silently correct values or expose a solver.
2. **Temperature intervals need explicit meaning.** `TemperatureDifference` lists kelvin as an applicable unit; no `DELTA_DEG_F` identity occurs. `DEG_F` has the absolute-temperature offset 459.67. Reusing that offset for a difference would be wrong. The source permits inspection, not unreviewed conversions.
3. **An upstream unit description conflicts with its identity.** `BTU_IT-PER-LB-DEG_F` has an international-Btu label, factor identity, and multiplier, while its description discusses thermochemical Btu. Preserve the contradiction and review it before calculations.
4. **Four selected-reference targets lack a local subject record.** Three are external derivation references (an EPSG coordinate reference and two photosynthetic-light references). One is a missing QUDT dimension vector referenced by `TemperatureRelatedMolarMass`: `A-1E0L0I0M1H-1T0D0`. The report lists their exact source, predicate, and target. None produces a dangling graph edge.
5. **A full reference ontology is not an HVACR curriculum.** There are missing descriptions/symbols, deprecated concepts, isolated nodes, historical constants, and no automatic scientific classification or equation-variable binding. The small authored HVACR example is separately sourced; the familiar classroom coefficients are not assigned meanings from bare numbers.

## Reproduce and verify

Use the project's documented Node/pnpm versions and install its lockfile. No Java, Maven, Python RDF stack, or system-wide tool installation is required for this import. A normal rebuild uses the retained local source and makes no network requests:

```sh
pnpm data:import
node scripts/import-qudt.mjs --check
node --test tests/qudt-import.test.mjs
```

To acquire the same pinned source again, rather than updating it:

```sh
node scripts/import-qudt.mjs --download
```

The download route requires network access and the Mac's `unzip` command. It fetches the fixed release URL, validates the ZIP SHA-256 before saving, extracts the named source/license/README, and checks the Turtle SHA-256. Import fails before replacing the baseline if the Turtle checksum or embedded ontology version differs. Changing versions is a deliberate source-manifest change and should include a reviewed count/gap comparison.

The importer uses the pinned `n3` parser ([official N3.js project](https://github.com/rdfjs/N3.js)). It gives anonymous blank nodes a per-import counter: the library's default process-wide counter would otherwise change generated JSON-LD when importing twice in one process. Sorted records/properties/values and fixed blank-node assignment make repeated imports byte deterministic.

Seven data tests pass: source/archive hashes and license, complete RDF round trip, complete eligible universe including deprecated records, unit separation and referential integrity, explicit edge provenance/endpoints, preservation of historical constant precision/uncertainty, and deterministic regeneration plus release-mismatch rejection. These test data integrity; graph interaction and actual phone behavior require separate browser/device checks.

## Attribution

QUDT.org — QUDT 3.5.2, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). This application adapts the source into a learning graph index and preserves the original distribution. App-authored content is identified separately and is not presented as QUDT's work. The upstream license text is retained unchanged in `data/qudt/LICENSE.md`.
