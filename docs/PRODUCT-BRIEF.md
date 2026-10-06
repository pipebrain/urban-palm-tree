# Stage 1 product brief

Baseline v0.2 • 6 October 2026

## Purpose and audience

Create an editable HVACR knowledge map that helps an apprentice mechanic understand relationships among measurable concepts, equations, and familiar engineering constants. It is also the common information foundation for later study and calculation tools.

Primary author: Andrew, studying 313A Advanced Level III at UA Local 787 JTAC. Development machine: M2 MacBook Air. Additional authoring devices: Android phone and iPhone, with Android preferred for downloading and editing files. Later alpha testers: classmates.

The course does not require the proposed quantity/property taxonomy. It is an application design choice that must remain scientifically defensible and editable.

## Scope and sequence

1. Editable visual knowledge graph.
2. Flashcard study generator: named decks, creation/deletion, cards drawn from the node pool, editable fronts/backs, export to a lighter study app. Export target remains undecided.
3. Equation solver with a two-column proof-style Given / Find / Solve presentation.
4. Test-problem generator using saved equation templates and permissible ranges. Later implementation must enforce joint physical validity, not merely independent random bounds.
5. Calculation visualization on suitable charts, diagrams, or applets.

Only stage 1 is specified for implementation now. Equation relationships are represented now; general solving, generated questions, and calculation plotting come later.

## Confirmed technology responsibilities

| Technology | Responsibility |
| --- | --- |
| QUDT / requested qudt-all.jsonld | Reference identities, quantity kinds, units, dimensions, and relevant constants |
| CoolProp compiled to WASM | Future thermophysical property evaluation; preserve the integration boundary now |
| dockview-react | Dockable, resizable workspace panels |
| React + TypeScript | Custom interfaces and application behaviour |
| KaTeX | Render LaTeX equations, variables, units, and mathematical node labels |
| Graph renderer and force layout, to select | Draw and interact with nodes/links and implement weighted positioning |

The exact qudt-all.jsonld file has not been supplied or inspected during planning. Its official source, release, actual contents, and licensing must be recorded during M0. Do not invent its size, completeness, node count, or classification coverage.

## Domain model in plain language

### Quantities and property classifications

A quantity is the broad measurable concept. Attach more specific classifications where supported: thermodynamic state property, transfer during a process, transfer rate, flow rate, electrical characteristic, geometric characteristic, or another justified role.

Thermodynamic state properties are a subset, not a competing root category. State-property classification does not determine whether a concept can be represented or linked. Leave uncertain classifications as general Quantity with review status; retain a short rationale and source for a proposed classification.

Distinguish concepts, adopted values, and problem-specific values. Pressure as a concept is different from an example pressure reading. Specific enthalpy and total enthalpy need distinct meanings. Heat transferred and heat-transfer rate must not collapse into one numerical field.

Display names and symbols are not IDs. Repeated Q, P, W, V, H, and other symbols are permitted. Water flow and air flow can be specialized quantity nodes linked to volumetric flow rate. Avoid merging records merely because names or symbols match.

Andrew's initial examples include sensible/latent/total heat, enthalpy, voltage, current, power, volumetric/water/air flow, head, static pressure or pressure difference, brake/shaft/pump power, dry-bulb/wet-bulb/dew-point temperatures, relative humidity, humidity ratio, specific volume, inductance, capacitance, power factor, resistance, impeller/wheel diameter, and rotational speed.

These examples require semantic review; they are not an approved final scientific classification.

### Equation nodes

Equations are first-class nodes with an editable name, LaTeX presentation, Markdown explanation, source, assumptions, and explicit references to their participating quantities and constants.

Equation nodes connect to all relevant participants and tend to sit among them in the force layout. They are not permanently assigned inputs and outputs: a future solver may rearrange a relationship for different unknowns.

The app must know which concept each displayed symbol refers to. Math typography alone is insufficient to establish identity. Multiple classroom forms can be linked to a general relation, with differences in assumptions and units made explicit.

### Constant nodes

Constants have their own nodes. This user-facing category includes physical constants, conversion factors, empirical coefficients, rounded engineering factors, and assumed fixed property values. Record the subtype.

Requested starting values: 500, 1.08, 0.68, 1.1, 4840, 4.5, 4005, 6356, 3960, and 8.33. Verify meaning against the actual associated equation before filling in a record. Equal numeric values do not imply the same identity.

A node needs an identifying name, value, units or required equation units, source, applicable conditions, exact/rounded/assumed status, derivation where known, and links to use sites. An adopted water density can connect to the general density property through an assumed-value relationship.

The familiar factor may contain unit conversions and adopted properties. A change of units cannot silently retain a numerical coefficient that belongs to the old unit convention.

### Units: reference objects, not graph nodes

Every displayed unit can open an internal reference panel. Include:

- Name, definition, preferred label, and KaTeX rendering.
- Editable LaTeX source and live preview.
- QUDT reference and an optional manually reviewed Wikipedia or other source URL.
- Expandable developer information: source identity, dimensions, conversion metadata, and origin of local overrides.
- Automatically maintained internal backlinks to objects explicitly using this unit.
- A separately labelled compatible-with list if provided.

Do not populate Wikipedia links by guessing URLs. Keep backlinks distinct from every concept that could potentially use the unit.

Use an editable US customary HVACR default profile. Original preferred labels include PSI, lb, gr, F, ft, in, g, oz, Btu, Ton, GPM, FPM, and in w.g. Exact meanings must be resolved before assigning conversions; notably g, gr, lb, oz, Ton, gallon variants, and water-column conventions can require clarification. Preferred typography and scientific identity are separate.

Allow compatible alternatives. Use quantity meaning, dimensions, and conversion rules together. Keep temperature readings separate from temperature differences; gauge/absolute pressure includes reference context; mass and force are distinct. Head-to-pressure involves a physical relation, not just changing a unit label.

If example numerical values are supported in stage 1, changing their unit must convert correctly or clearly report an unsupported conversion. Never relabel the same number as if it had been converted. General arbitrary equation evaluation is outside stage 1.

## Graph import and curation

Import the complete selected QUDT source and start with the full eligible learning-node graph. Units and technical ontology objects remain reference data. Report eligibility rules and counts so that exclusions are transparent. Unsupported records should be retained or reported, not silently dropped.

A full QUDT import does not imply that every desired HVACR equation, classroom coefficient, specialized quantity, or relationship already exists. Support app-authored additions with separate provenance.

Curation is an authored selection over stable identities. Excluding nodes removes them from the chosen view and can be undone or reversed. Retain the original source and local overrides separately. Explicit deletion of custom content must account for references and be undoable.

## Relationships and layout

Only related nodes connect. Use explicit relationship types, including equation participation, specialization, assumed value, derivation, and authored conceptual relationships. Preserve source-backed versus app-authored provenance. A shared unit or dimension alone is not a sufficient physical relationship.

Provide weighted force positioning, modest growth with connection count, overlap avoidance, pause/resume, drag, pin/unpin, pan/zoom, search, filtering, and focus on a node's neighbourhood. Bound visual size and influence so hubs do not consume the canvas. Label weights as graph weights; they are unrelated to physical mass.

Default weight formula and handling of filtered links are provisional decisions. Start by evaluating equal contribution per distinct visible neighbour, with bounded growth. Keep the formula configurable. Do not imply that force placement is a physical simulation.

Proposed accepted visual convention:

| Meaning | Presentation |
| --- | --- |
| General quantity | Circle |
| Quantity classified as thermodynamic state property | Hexagon |
| Equation | Rounded rectangle |
| Constant | Diamond |
| Topic/group membership | Colour |
| Connection count | Bounded size |
| Selection or pin status | Outline or small badge |

Include a legend stating that the hexagon is a quantity subtype. Other property classifications remain inspectable. Multiple group membership must have a clear visual rule; recommended starting rule is one chosen primary colour plus membership markers.

Full formulas appear in the inspector or when graph space permits. Compact notation must still use KaTeX. Any semantic zoom or label hiding must retain the full graph and be explained, not substitute a permanently curated subset.

## Authoring and groups

Selecting any learning node opens editable structured fields and Markdown content: definitions, notes, links, images, relevant equations, provenance, and classification. Include LaTeX preview where appropriate.

Allow creation/editing of nodes and relationships, including locally overridden imported values. Keep original imported values available for inspection and restoration.

Groups have editable names/styles and overlapping membership. Support add/remove membership, filtering, and group deletion without deleting member nodes. Scientific classifications and user-created groups are independent.

## History, saving, and export

Undo/redo covers deliberate edits: create/delete/edit, relationships, grouping, curation, and manual layout/pinning. Automatic force movement does not become history. Use meaningful action boundaries for typing and dragging. History lives only in memory for the active editing session; it is excluded from workspace files, source exports, and autosave. Saving does not clear the active session's history, but reopening/loading a workspace or accepting a source reload starts with empty history.

Browser autosave provides recovery; explicit files provide portability. Browser storage alone is not a cross-device backup.

Provide two operations:

1. **Save/load workspace:** current content, customizations, images, groups, selection/filters, pinned positions, graph view, and panel arrangement. Do not serialize undo/redo history. Restore an appropriate phone arrangement when a desktop layout is unusable. Embedded uploaded images travel with the file; linked images retain their external dependency.
2. **Export for source:** stable curated IDs, local content/overrides, relationships, groups/styles, notation, unit defaults, source version, and assets in a deterministic reviewable format that future builds can consume. Do not require the user to rewrite exported data as application code.

Use a versioned file contract with source identifiers and clear compatibility errors. Validate a load before replacing current work. Never silently overwrite another workspace or discard unsupported content. Initial import can load as a separate workspace; merging simultaneous edits from two devices is a later decision.

## Desktop and phone experience

Desktop uses Dockview panels. Phones need a focused panel or sheet while retaining editing, search, unit references, undo/redo, import, and export. All primary actions must work through touch. Reuse the same domain state and files across devices.

## Offline use and Reload from source

Offline use is a confirmed development target, to be validated on the Mac, Android, and iPhone. After a successful initial online preparation, aim to reopen the app and use the full graph, editing, internal unit dictionary, KaTeX, local images, autosave, and workspace import/export without a network connection. Cache all required reference data and app assets, not only previously viewed nodes. Show an offline-ready indication only after preparation succeeds. First-time preparation requires connectivity; full offline use cannot be assumed before it finishes.

External websites and remotely linked images may remain unavailable offline. Preserve their references and show a clear unavailable state. Locally embedded images must remain usable. Future CoolProp-dependent features need their required WASM/data prepared before claiming offline support for those features.

Include a menu action labelled **Reload from source**. Source means the content and defaults distributed with the app release: the pinned QUDT baseline plus the curated selection, app-authored nodes, relationships, groups, notation, and unit defaults. During local development this is the local app's served baseline; after publication it is the released baseline. It does not mean fetching an unreviewed QUDT update or unpublished GitHub commits.

When online, check the app's published source version and fetch/validate a compatible complete baseline, bypassing stale cached copies. When offline, explain that a newer source cannot be fetched and offer to restore the identified cached source version. Do not claim that a cached baseline is the latest online version.

Before replacing an edited workspace, offer Save current workspace, Replace without saving, or Cancel. Validate the incoming baseline before switching. Cancellation, a failed download, or an incompatible source must leave current work usable. Default behaviour is explicit replacement, not an automatic merge with personal overrides; source reload resets authoring content/defaults to that baseline while preserving compatible panel/camera preferences where possible. Clear undo/redo only after a successful switch. App updates and source reload must not silently erase personal work.

Keep the source version visible. New app/content versions must remain compatible or fail clearly; do not combine partial releases. Source reload refreshes released content, while updating app code is a separately managed operation. Browser storage is not a guaranteed permanent backup; keep explicit workspace file export available.

The GitHub repository stays private. Serve any released default data through the chosen app deployment; do not put GitHub tokens in a browser client. Public alpha hosting remains a separate later decision.

## Completion outcome

Andrew can explore the full import, curate a useful HVACR view, author sourced nodes and equations, understand constants, edit Markdown/math and defaults, reorganize groups, undo mistakes, save a portable workspace, reopen it on another device, and export a reproducible content configuration for the next build.
