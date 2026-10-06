import type {
  Dataset,
  GraphEdge,
  LearningNode,
  UnitReference,
} from "./types.ts";

/** A rejected replacement never yields a partially usable dataset. */
export class DatasetValidationError extends Error {
  issues: string[];

  constructor(issues: string[]) {
    super(
      `Dataset validation failed:\n${issues.slice(0, 12).join("\n")}${issues.length > 12 ? `\n… ${issues.length - 12} more issues` : ""}`,
    );
    this.name = "DatasetValidationError";
    this.issues = issues;
  }
}

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Validate references separately so authored additions can use the same boundary. */
export function validateGraphReferences(
  nodes: readonly LearningNode[],
  edges: readonly GraphEdge[],
  units: readonly UnitReference[],
): void {
  const issues: string[] = [];
  const identities = new Map<string, string>();
  function unique(id: string, path: string) {
    const previous = identities.get(id);
    if (previous)
      issues.push(
        `${path}: duplicate ID ${id}; already declared at ${previous}`,
      );
    else identities.set(id, path);
  }
  nodes.forEach((node, i) => unique(node.id, `nodes[${i}].id`));
  units.forEach((unit, i) => unique(unit.id, `units[${i}].id`));
  edges.forEach((edge, i) => unique(edge.id, `edges[${i}].id`));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const quantityIds = new Set(
    nodes.filter((node) => node.kind === "quantity").map((node) => node.id),
  );
  const unitIds = new Set(units.map((unit) => unit.id));
  const sharedValues = new Map<string, { serialized: string; path: string }>();
  function references(
    ids: readonly string[],
    available: Set<string>,
    path: string,
    noun: string,
  ) {
    ids.forEach((id, i) => {
      if (!available.has(id))
        issues.push(`${path}[${i}]: unknown ${noun} ID ${id}`);
    });
  }
  nodes.forEach((node, i) => {
    references(node.unitIds, unitIds, `nodes[${i}].unitIds`, "unit");
    references(
      node.applicableUnitIds,
      unitIds,
      `nodes[${i}].applicableUnitIds`,
      "unit",
    );
    references(
      node.quantityKindIds,
      quantityIds,
      `nodes[${i}].quantityKindIds`,
      "quantity",
    );
    const nodeValueIds = new Set<string>();
    node.constantValues?.forEach((value, j) => {
      const path = `nodes[${i}].constantValues[${j}].id`;
      // QUDT aliases can reference the very same ConstantValue record. Preserve
      // those references; only conflicting declarations or local duplicates fail.
      if (nodeValueIds.has(value.id))
        issues.push(`${path}: duplicate ID ${value.id} within this node`);
      nodeValueIds.add(value.id);
      const shared = sharedValues.get(value.id);
      const serialized = canonicalJson(value);
      if (shared && shared.serialized !== serialized)
        issues.push(
          `${path}: conflicting shared value ID ${value.id}; first declared at ${shared.path}`,
        );
      else if (!shared) {
        unique(value.id, path);
        sharedValues.set(value.id, { serialized, path });
      }
      references(
        value.unitIds,
        unitIds,
        `nodes[${i}].constantValues[${j}].unitIds`,
        "unit",
      );
    });
    node.bindings?.forEach((binding, j) => {
      references(
        [binding.nodeId],
        nodeIds,
        `nodes[${i}].bindings[${j}].nodeId`,
        "node",
      );
      if (binding.unitId !== undefined)
        references(
          [binding.unitId],
          unitIds,
          `nodes[${i}].bindings[${j}].unitId`,
          "unit",
        );
    });
  });
  units.forEach((unit, i) =>
    references(
      unit.quantityKindIds,
      quantityIds,
      `units[${i}].quantityKindIds`,
      "quantity",
    ),
  );
  edges.forEach((edge, i) => {
    if (!nodeIds.has(edge.source))
      issues.push(`edges[${i}].source: unknown node ID ${edge.source}`);
    if (!nodeIds.has(edge.target))
      issues.push(`edges[${i}].target: unknown node ID ${edge.target}`);
  });
  if (issues.length) throw new DatasetValidationError(issues);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}

/** JSON source is retained verbatim, including unknown fields, and frozen in place. */
export function parseDataset(value: unknown): Dataset {
  const issues: string[] = [];
  function record(candidate: unknown, path: string): RecordValue {
    if (isRecord(candidate)) return candidate;
    issues.push(`${path}: expected an object`);
    return {};
  }
  function text(candidate: unknown, path: string, allowEmpty = false) {
    if (typeof candidate !== "string" || (!allowEmpty && !candidate.trim()))
      issues.push(
        `${path}: expected ${allowEmpty ? "a string" : "a non-empty string"}`,
      );
  }
  function array(candidate: unknown, path: string): unknown[] {
    if (Array.isArray(candidate)) return candidate;
    issues.push(`${path}: expected an array`);
    return [];
  }
  function strings(candidate: unknown, path: string) {
    array(candidate, path).forEach((entry, i) => text(entry, `${path}[${i}]`));
  }
  function optionalText(object: RecordValue, fields: string[], path: string) {
    fields.forEach((field) => {
      if (object[field] !== undefined)
        text(object[field], `${path}.${field}`, true);
    });
  }
  function provenance(candidate: unknown, path: string) {
    const source = record(candidate, path);
    if (source.origin !== "qudt" && source.origin !== "authored")
      issues.push(`${path}.origin: expected qudt or authored`);
    text(source.sourceId, `${path}.sourceId`);
    text(source.sourceUrl, `${path}.sourceUrl`);
    optionalText(source, ["version"], path);
  }
  function count(candidate: unknown, path: string) {
    if (
      typeof candidate !== "number" ||
      !Number.isSafeInteger(candidate) ||
      candidate < 0
    )
      issues.push(`${path}: expected a non-negative integer`);
  }
  function shared(candidate: unknown, path: string) {
    const object = record(candidate, path);
    text(object.id, `${path}.id`);
    text(object.label, `${path}.label`);
    optionalText(object, ["latex", "symbol", "description"], path);
    for (const field of ["dimensionIds", "quantityKindIds", "sourceTypes"])
      strings(object[field], `${path}.${field}`);
    provenance(object.provenance, `${path}.provenance`);
    if (
      object.deprecated !== undefined &&
      typeof object.deprecated !== "boolean"
    )
      issues.push(`${path}.deprecated: expected a boolean`);
    return object;
  }
  const dataset = record(value, "dataset");
  if (dataset.schemaVersion !== 1)
    issues.push(
      `schemaVersion: expected 1; received ${String(dataset.schemaVersion)}. This app cannot load that dataset version.`,
    );
  const source = record(dataset.source, "source");
  for (const field of [
    "name",
    "version",
    "releaseUrl",
    "artifactUrl",
    "originalFilename",
    "sha256",
    "license",
    "licenseUrl",
    "attribution",
    "retrievedOn",
  ])
    text(source[field], `source.${field}`);
  const nodes = array(dataset.nodes, "nodes");
  nodes.forEach((candidate, i) => {
    const path = `nodes[${i}]`;
    const node = shared(candidate, path);
    if (!["quantity", "constant", "equation"].includes(String(node.kind)))
      issues.push(`${path}.kind: expected quantity, constant, or equation`);
    strings(node.unitIds, `${path}.unitIds`);
    strings(node.applicableUnitIds, `${path}.applicableUnitIds`);
    if (node.assumptions !== undefined)
      strings(node.assumptions, `${path}.assumptions`);
    if (node.classification !== undefined) {
      const classification = record(
        node.classification,
        `${path}.classification`,
      );
      text(classification.kind, `${path}.classification.kind`);
      text(classification.rationale, `${path}.classification.rationale`);
      if (
        !["reviewed", "review-needed"].includes(String(classification.status))
      )
        issues.push(
          `${path}.classification.status: expected reviewed or review-needed`,
        );
      strings(classification.sourceUrls, `${path}.classification.sourceUrls`);
      if (
        classification.status === "reviewed" &&
        Array.isArray(classification.sourceUrls) &&
        !classification.sourceUrls.length
      )
        issues.push(
          `${path}.classification.sourceUrls: a reviewed classification needs a source`,
        );
      if (
        classification.origin !== undefined &&
        classification.origin !== "authored"
      )
        issues.push(`${path}.classification.origin: expected authored`);
      optionalText(
        classification,
        ["reviewedOn", "context", "origin"],
        `${path}.classification`,
      );
    }
    if (node.constantValues !== undefined)
      array(node.constantValues, `${path}.constantValues`).forEach(
        (candidateValue, j) => {
          const valuePath = `${path}.constantValues[${j}]`;
          const constantValue = record(candidateValue, valuePath);
          text(constantValue.id, `${valuePath}.id`);
          optionalText(
            constantValue,
            ["value", "standardUncertainty", "relativeStandardUncertainty"],
            valuePath,
          );
          strings(constantValue.unitIds, `${valuePath}.unitIds`);
          strings(constantValue.sourceUrls, `${valuePath}.sourceUrls`);
        },
      );
    if (node.bindings !== undefined)
      array(node.bindings, `${path}.bindings`).forEach(
        (candidateBinding, j) => {
          const bindingPath = `${path}.bindings[${j}]`;
          const binding = record(candidateBinding, bindingPath);
          text(binding.symbol, `${bindingPath}.symbol`);
          text(binding.nodeId, `${bindingPath}.nodeId`);
          optionalText(binding, ["unitId", "role"], bindingPath);
        },
      );
  });
  const units = array(dataset.units, "units");
  units.forEach((candidate, i) =>
    optionalText(
      shared(candidate, `units[${i}]`),
      ["multiplier", "offset"],
      `units[${i}]`,
    ),
  );
  const edges = array(dataset.edges, "edges");
  edges.forEach((candidate, i) => {
    const path = `edges[${i}]`;
    const edge = record(candidate, path);
    for (const field of ["id", "source", "target", "predicate", "label"])
      text(edge[field], `${path}.${field}`);
    provenance(edge.provenance, `${path}.provenance`);
  });
  const report = record(dataset.report, "report");
  const counts = record(report.counts, "report.counts");
  for (const field of [
    "triples",
    "records",
    "namedRecords",
    "blankRecords",
    "quantityNodes",
    "constantNodes",
    "eligibleNodes",
    "unitReferences",
    "technicalRecords",
    "edges",
    "isolatedNodes",
    "deprecatedNodes",
    "nodesWithoutDescription",
    "nodesWithoutMathSymbol",
  ])
    count(counts[field], `report.counts.${field}`);
  for (const field of [
    "types",
    "predicatesBetweenEligibleNodes",
    "retainedNonGraphPredicates",
  ])
    Object.entries(record(report[field], `report.${field}`)).forEach(
      ([key, entry]) => count(entry, `report.${field}.${key}`),
    );
  strings(report.gaps, "report.gaps");
  array(report.unresolvedReferences, "report.unresolvedReferences").forEach(
    (candidate, i) => {
      const reference = record(candidate, `report.unresolvedReferences[${i}]`);
      for (const field of ["source", "predicate", "target"])
        text(reference[field], `report.unresolvedReferences[${i}].${field}`);
    },
  );
  if (issues.length) throw new DatasetValidationError(issues);
  const valid = value as Dataset;
  validateGraphReferences(valid.nodes, valid.edges, valid.units);
  const importedNodes = valid.nodes.filter(
    (node) => node.provenance.origin === "qudt",
  );
  const importedUnits = valid.units.filter(
    (unit) => unit.provenance.origin === "qudt",
  );
  const importedEdges = valid.edges.filter(
    (edge) => edge.provenance.origin === "qudt",
  );
  for (const record of [...importedNodes, ...importedUnits, ...importedEdges]) {
    if (record.provenance.version !== valid.source.version)
      issues.push(
        `${record.id}.provenance.version: expected source version ${valid.source.version}; received ${String(record.provenance.version)}`,
      );
  }
  const expectedCounts = {
    eligibleNodes: importedNodes.length,
    quantityNodes: importedNodes.filter((node) => node.kind === "quantity")
      .length,
    constantNodes: importedNodes.filter((node) => node.kind === "constant")
      .length,
    unitReferences: importedUnits.length,
    edges: importedEdges.length,
  };
  for (const [field, expected] of Object.entries(expectedCounts)) {
    if (counts[field] !== expected)
      issues.push(
        `report.counts.${field}: reports ${String(counts[field])}, but ${expected} imported records are present`,
      );
  }
  if (issues.length) throw new DatasetValidationError(issues);
  // Technical dimension/provenance references are intentionally not graph links.
  // The pinned import's four unresolved source references stay visible in report.
  return freezeSource(valid);
}

function freezeSource<T>(value: T, visited = new WeakSet<object>()): T {
  if (value && typeof value === "object" && !visited.has(value)) {
    visited.add(value);
    Object.freeze(value);
    for (const child of Object.values(value)) freezeSource(child, visited);
  }
  return value;
}
