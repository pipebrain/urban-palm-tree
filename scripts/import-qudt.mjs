import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Parser, Store, DataFactory } from "n3";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = resolve(ROOT, "data/qudt");
const Q = "http://qudt.org/schema/qudt/";
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const RDFS = "http://www.w3.org/2000/01/rdf-schema#";
const OWL = "http://www.w3.org/2002/07/owl#";
const SKOS = "http://www.w3.org/2004/02/skos/core#";
const DCT = "http://purl.org/dc/terms/";
const PROV = "http://www.w3.org/ns/prov#";
const EDGE_LABELS = new Map([
  [Q + "specializationOf", "specialization of"],
  [SKOS + "broader", "has broader concept"],
  [Q + "organizedUnder", "organized under"],
  [Q + "hasQuantityKind", "has quantity kind"],
  [SKOS + "related", "related concept"],
  [PROV + "wasDerivedFrom", "derived from"],
]);
const sort = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const uniqueSorted = (values) => [...new Set(values)].sort(sort);
const sortedCounts = (entries) =>
  Object.fromEntries(Object.entries(entries).sort(([a], [b]) => sort(a, b)));
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
const compactJson = (value) => JSON.stringify(value) + "\n";
const prettyJson = (value) => JSON.stringify(value, null, 2) + "\n";
const termId = (term) =>
  term.termType === "BlankNode" ? "_:" + term.value : term.value;

/** Expanded JSON-LD needs no remote context, preserves every RDF literal and blank node. */
export function toExpandedJsonLd(quads) {
  const records = new Map();
  for (const { subject, predicate, object, graph } of quads) {
    if (graph.termType !== "DefaultGraph")
      throw new Error(
        "Named graphs need an explicit importer extension; refusing to flatten them.",
      );
    const id = termId(subject);
    const record = records.get(id) ?? { "@id": id };
    records.set(id, record);
    const key = predicate.value === RDF + "type" ? "@type" : predicate.value;
    let value;
    if (key === "@type") {
      if (object.termType !== "NamedNode")
        throw new Error("Unsupported non-IRI rdf:type object");
      value = object.value;
    } else if (
      object.termType === "NamedNode" ||
      object.termType === "BlankNode"
    )
      value = { "@id": termId(object) };
    else if (object.termType === "Literal") {
      value = { "@value": object.value };
      if (object.language) value["@language"] = object.language;
      else value["@type"] = object.datatype.value;
    } else throw new Error(`Unsupported RDF term: ${object.termType}`);
    (record[key] ??= []).push(value);
  }
  return {
    "@graph": [...records.values()]
      .sort((a, b) => sort(a["@id"], b["@id"]))
      .map((record) =>
        Object.fromEntries(
          Object.entries(record)
            .sort(([a], [b]) => sort(a, b))
            .map(([key, value]) => [
              key,
              Array.isArray(value)
                ? value.sort((a, b) =>
                    sort(JSON.stringify(a), JSON.stringify(b)),
                  )
                : value,
            ]),
        ),
      ),
  };
}

export function buildDataset(turtle, source) {
  // N3's default anonymous-node counter is global to the process. A per-import
  // factory makes repeated imports deterministic as well as separate CLI runs.
  let anonymousNode = 0;
  const factory = {
    ...DataFactory,
    blankNode: (value) =>
      DataFactory.blankNode(value ?? `n3-${anonymousNode++}`),
  };
  const parser = new Parser({
    format: "Turtle",
    blankNodePrefix: "qudt-",
    factory,
  });
  const store = new Store(parser.parse(turtle));
  const quads = store.getQuads(null, null, null, null);
  if (
    !store.countQuads(
      `http://qudt.org/${source.version}/qudt-all`,
      RDF + "type",
      OWL + "Ontology",
      null,
    )
  ) {
    throw new Error(
      "The source ontology identity does not match the pinned release",
    );
  }
  const ids = uniqueSorted(quads.map((quad) => termId(quad.subject)));
  const terms = (id, predicate) => store.getObjects(id, predicate, null);
  const refs = (id, predicate) =>
    uniqueSorted(
      terms(id, predicate)
        .filter((t) => t.termType === "NamedNode" || t.termType === "BlankNode")
        .map(termId),
    );
  const strings = (id, predicate) =>
    terms(id, predicate).filter((t) => t.termType === "Literal");
  const literal = (id, predicate) =>
    strings(id, predicate)
      .sort((a, b) => {
        const rank = (t) =>
          t.language === "en"
            ? 0
            : t.language === "en-US"
              ? 1
              : !t.language
                ? 2
                : t.language.startsWith("en")
                  ? 3
                  : 4;
        return rank(a) - rank(b) || sort(a.value, b.value);
      })[0]
      ?.value.trim();
  const types = (id) => refs(id, RDF + "type");
  const hasType = (id, type) =>
    store.countQuads(id, RDF + "type", type, null) > 0;
  const sourceUrls = (id) =>
    uniqueSorted(
      [
        Q + "informativeReference",
        Q + "normativeReference",
        DCT + "source",
        "http://www.linkedmodel.org/schema/vaem#website",
      ]
        .flatMap((predicate) => terms(id, predicate).map((term) => term.value))
        .filter((value) => /^https?:\/\//.test(value)),
    );
  const provenance = (id) => ({
    origin: "qudt",
    sourceId: id,
    sourceUrl: id,
    version: source.version,
  });
  const label = (id) => literal(id, RDFS + "label") ?? id.split("/").at(-1);
  const description = (id) =>
    literal(id, Q + "plainTextDescription") ??
    literal(id, DCT + "description") ??
    literal(id, SKOS + "definition");
  const latex = (id) => {
    const value = literal(id, Q + "latexSymbol");
    if (!value) return undefined;
    return value
      .replace(/^\$\$([\s\S]*)\$\$$/, "$1")
      .replace(/^\$([\s\S]*)\$$/, "$1")
      .replace(/^\\\(([\s\S]*)\\\)$/, "$1")
      .trim();
  };
  const deprecated = (id) =>
    literal(id, OWL + "deprecated") === "true" ||
    literal(id, Q + "deprecated") === "true";
  const eligibleIds = ids.filter(
    (id) =>
      !id.startsWith("_:") &&
      (hasType(id, Q + "QuantityKind") || hasType(id, Q + "PhysicalConstant")),
  );
  const eligibleSet = new Set(eligibleIds);

  // Follow only explicit rdfs:subClassOf for Unit record inventory; no semantic guessing.
  const unitClasses = new Set([Q + "Unit"]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const quad of store.getQuads(null, RDFS + "subClassOf", null, null)) {
      if (
        quad.subject.termType === "NamedNode" &&
        unitClasses.has(quad.object.value) &&
        !unitClasses.has(quad.subject.value)
      ) {
        unitClasses.add(quad.subject.value);
        changed = true;
      }
    }
  }
  const unitIds = ids.filter(
    (id) =>
      !id.startsWith("_:") && types(id).some((type) => unitClasses.has(type)),
  );
  const nodes = eligibleIds.map((id) => {
    const values = refs(id, Q + "quantityValue").map((valueId) => ({
      id: valueId,
      value: literal(valueId, Q + "value"),
      unitIds: refs(valueId, Q + "hasUnit"),
      standardUncertainty: literal(valueId, Q + "standardUncertainty"),
      relativeStandardUncertainty: literal(
        valueId,
        Q + "relativeStandardUncertainty",
      ),
      sourceUrls: sourceUrls(valueId),
    }));
    const constant = hasType(id, Q + "PhysicalConstant");
    return {
      id,
      kind: constant ? "constant" : "quantity",
      label: label(id),
      latex: latex(id),
      symbol: literal(id, Q + "symbol"),
      description: description(id),
      unitIds: uniqueSorted([
        ...refs(id, Q + "hasUnit"),
        ...values.flatMap((value) => value.unitIds),
      ]),
      applicableUnitIds: refs(id, Q + "applicableUnit"),
      quantityKindIds: refs(id, Q + "hasQuantityKind"),
      dimensionIds: refs(id, Q + "hasDimensionVector"),
      sourceTypes: types(id),
      provenance: provenance(id),
      ...(deprecated(id) ? { deprecated: true } : {}),
      ...(constant
        ? {
            constantValues: values,
            assumptions: [
              "Imported QUDT value; numerical currency, uncertainty, and applicability require independent review before calculation.",
            ],
          }
        : {}),
    };
  });
  const units = unitIds.map((id) => ({
    id,
    label: label(id),
    symbol: literal(id, Q + "symbol"),
    latex: latex(id),
    description: description(id),
    dimensionIds: refs(id, Q + "hasDimensionVector"),
    quantityKindIds: refs(id, Q + "hasQuantityKind"),
    multiplier: literal(id, Q + "conversionMultiplier"),
    offset: literal(id, Q + "conversionOffset"),
    sourceTypes: types(id),
    provenance: provenance(id),
    ...(deprecated(id) ? { deprecated: true } : {}),
  }));
  const edges = [];
  const predicatesBetweenEligibleNodes = {};
  const retainedNonGraphPredicates = {};
  const connected = new Set();
  const unresolvedReferences = [];
  for (const quad of quads) {
    if (!eligibleSet.has(quad.subject.value)) continue;
    if (eligibleSet.has(quad.object.value)) {
      const predicate = quad.predicate.value;
      predicatesBetweenEligibleNodes[predicate] =
        (predicatesBetweenEligibleNodes[predicate] ?? 0) + 1;
      if (
        EDGE_LABELS.has(predicate) &&
        quad.subject.value !== quad.object.value
      ) {
        const sourceId = quad.subject.value;
        const target = quad.object.value;
        edges.push({
          id: `qudt-edge:${sha256(JSON.stringify([sourceId, predicate, target])).slice(0, 24)}`,
          source: sourceId,
          target,
          predicate,
          label: EDGE_LABELS.get(predicate),
          provenance: provenance(sourceId),
        });
        connected.add(sourceId);
        connected.add(target);
      } else
        retainedNonGraphPredicates[predicate] =
          (retainedNonGraphPredicates[predicate] ?? 0) + 1;
    }
    if (
      (EDGE_LABELS.has(quad.predicate.value) ||
        [
          Q + "applicableUnit",
          Q + "hasUnit",
          Q + "quantityValue",
          Q + "hasDimensionVector",
        ].includes(quad.predicate.value)) &&
      quad.object.termType === "NamedNode" &&
      !store.countQuads(quad.object, null, null, null)
    ) {
      unresolvedReferences.push({
        source: quad.subject.value,
        predicate: quad.predicate.value,
        target: quad.object.value,
      });
    }
  }
  edges.sort((a, b) => sort(a.id, b.id));
  unresolvedReferences.sort((a, b) =>
    sort(JSON.stringify(a), JSON.stringify(b)),
  );
  const typeCounts = {};
  for (const quad of store.getQuads(null, RDF + "type", null, null))
    typeCounts[quad.object.value] = (typeCounts[quad.object.value] ?? 0) + 1;
  const report = {
    counts: {
      triples: quads.length,
      records: ids.length,
      namedRecords: ids.filter((id) => !id.startsWith("_:")).length,
      blankRecords: ids.filter((id) => id.startsWith("_:")).length,
      quantityNodes: nodes.filter((node) => node.kind === "quantity").length,
      constantNodes: nodes.filter((node) => node.kind === "constant").length,
      eligibleNodes: nodes.length,
      unitReferences: units.length,
      technicalRecords: ids.length - nodes.length - units.length,
      edges: edges.length,
      isolatedNodes: nodes.length - connected.size,
      deprecatedNodes: nodes.filter((node) => node.deprecated).length,
      nodesWithoutDescription: nodes.filter((node) => !node.description).length,
      nodesWithoutMathSymbol: nodes.filter(
        (node) => !node.latex && !node.symbol,
      ).length,
    },
    types: sortedCounts(typeCounts),
    predicatesBetweenEligibleNodes: sortedCounts(
      predicatesBetweenEligibleNodes,
    ),
    retainedNonGraphPredicates: sortedCounts(retainedNonGraphPredicates),
    gaps: [
      source.requestedFormatFinding,
      "The complete selected OWL distribution is retained, including all technical records and unknown predicates. No remote owl:imports are fetched; external schema references remain external.",
      "Eligible nodes are explicit QuantityKind and PhysicalConstant individuals, including deprecated records. ConstantValue records support their parent constants; units and ontology machinery are reference data.",
      "No standalone equation nodes or thermodynamic-state-property classifications are inferred from descriptions, symbols, dimensions, or units.",
      "exactMatch, closeMatch, seeAlso, and isReplacedBy are retained in raw RDF but excluded from force edges. Broader and specialization assertions may connect the same pair; graph weight must count distinct neighbours.",
      "Upstream applicableUnit links are compatibility references, not evidence that an authored value explicitly uses the unit.",
      "QUDT release 3.5.2 includes historical values: Value_PlanckConstant is 6.62606896e-34 J s with uncertainty. Imported values are unreviewed, not automatically current calculation constants.",
      "TemperatureDifference lists K; no DELTA_DEG_F unit was found. DEG_F includes an absolute-temperature offset. No unit conversions are implemented or implied.",
      "BTU_IT-PER-LB-DEG_F has an international-Btu identity and multiplier, while its upstream prose says thermochemical. Preserve the conflicting source and review before using it.",
      "Missing descriptions, missing math symbols, deprecated records, and unresolved relevant references are counted. Source literals remain inert text; HTML and LaTeX content must not execute scripts or trusted commands.",
    ],
    unresolvedReferences,
  };
  return {
    dataset: { schemaVersion: 1, source, nodes, edges, units, report },
    jsonld: toExpandedJsonLd(quads),
  };
}

async function download(source) {
  const response = await fetch(source.artifactUrl);
  if (!response.ok) throw new Error(`QUDT download failed: ${response.status}`);
  const archive = Buffer.from(await response.arrayBuffer());
  if (sha256(archive) !== source.archiveSha256)
    throw new Error(
      "Downloaded ZIP checksum does not match the pinned release",
    );
  const path = resolve(DATA, source.archiveFilename);
  await writeFile(path, archive);
  for (const [entry, output] of [
    [source.originalFilename, source.originalFilename],
    ["LICENSE.md", "LICENSE.md"],
    ["README.md", "UPSTREAM-README.md"],
  ]) {
    const bytes = execFileSync("unzip", ["-p", path, entry], {
      maxBuffer: 30 * 1024 * 1024,
    });
    if (entry === source.originalFilename && sha256(bytes) !== source.sha256)
      throw new Error("Extracted Turtle checksum does not match the pin");
    await writeFile(resolve(DATA, output), bytes);
  }
}

async function main() {
  const source = JSON.parse(
    await readFile(resolve(DATA, "source.json"), "utf8"),
  );
  if (process.argv.includes("--download")) await download(source);
  const bytes = await readFile(resolve(DATA, source.originalFilename));
  if (sha256(bytes) !== source.sha256)
    throw new Error(
      "QUDT Turtle checksum mismatch; refusing to replace the generated baseline",
    );
  const { dataset, jsonld } = buildDataset(bytes.toString("utf8"), source);
  const artifacts = [
    [resolve(DATA, "qudt-all.jsonld"), compactJson(jsonld)],
    [resolve(DATA, "import-report.json"), prettyJson(dataset.report)],
    [resolve(ROOT, "public/data/qudt-graph.json"), compactJson(dataset)],
  ];
  const check = process.argv.includes("--check");
  for (const [path, content] of artifacts) {
    if (check) {
      if ((await readFile(path, "utf8")) !== content)
        throw new Error(`Generated data is stale: ${path}`);
    } else {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content);
    }
  }
  console.log(
    `${check ? "Verified" : "Imported"} QUDT ${source.version}: ${dataset.report.counts.eligibleNodes} learning nodes, ${dataset.edges.length} explicit edges, ${dataset.units.length} unit references; ${dataset.report.counts.triples} source triples retained.`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
