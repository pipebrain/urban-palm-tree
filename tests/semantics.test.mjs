import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  parseDataset,
  DatasetValidationError,
} from "../src/domain/validation.ts";
import {
  applyDisplayOverrides,
  buildGraphIndex,
  describeRelationship,
} from "../src/domain/semantics.ts";
import {
  getClassification,
  reviewedClassifications,
  isThermodynamicStateProperty,
} from "../src/domain/classifications.ts";
import { example, exampleEdges, intervalUnit } from "../src/domain/example.ts";

const raw = JSON.parse(
  await readFile(
    new URL("../public/data/qudt-graph.json", import.meta.url),
    "utf8",
  ),
);
const baseline = parseDataset(structuredClone(raw));
const q = (name) => `http://qudt.org/vocab/quantitykind/${name}`;
const u = (name) => `http://qudt.org/vocab/unit/${name}`;
const nodes = [...baseline.nodes, example];
const edges = [...baseline.edges, ...exampleEdges];
const units = [...baseline.units, intervalUnit];
const index = buildGraphIndex(nodes, edges, units);

function rejectsMutation(mutate, expected) {
  const candidate = structuredClone(raw);
  mutate(candidate);
  assert.throws(
    () => parseDataset(candidate),
    (error) =>
      error instanceof DatasetValidationError &&
      expected.test(error.issues.join("\n")),
  );
}

test("the full runtime boundary accepts the pinned graph and freezes its original data without discarding unknown fields", () => {
  const candidate = structuredClone(raw);
  candidate.futureExtension = {
    version: 4,
    values: ["kept", { opaque: true }],
  };
  candidate.nodes[0].unrecognizedPredicate = {
    targets: ["urn:source:retained"],
  };
  const before = JSON.stringify(candidate);
  const result = parseDataset(candidate);
  assert.equal(result, candidate);
  assert.equal(JSON.stringify(result), before);
  assert.equal(result.nodes.length, 1555);
  assert.equal(result.report.unresolvedReferences.length, 4);
  assert.ok(Object.isFrozen(result.nodes[0].unrecognizedPredicate.targets));
  assert.throws(() => {
    result.nodes[0].label = "changed";
  }, TypeError);
  assert.deepEqual(
    result.report.unresolvedReferences,
    raw.report.unresolvedReferences,
  );
});

test("malformed schema, fields, classification claims, source versions, and truncated import counts fail with actionable paths", () => {
  rejectsMutation((d) => {
    d.schemaVersion = 2;
  }, /schemaVersion: expected 1/);
  rejectsMutation((d) => {
    d.nodes[0].unitIds = "not an array";
  }, /nodes\[0\]\.unitIds/);
  rejectsMutation((d) => {
    d.nodes[0].kind = "state-property";
  }, /nodes\[0\]\.kind/);
  rejectsMutation((d) => {
    d.nodes[0].classification = {
      kind: "x",
      status: "reviewed",
      rationale: "unsupported",
      sourceUrls: [],
    };
  }, /reviewed classification needs a source/);
  rejectsMutation((d) => {
    d.nodes[0].provenance.version = "another-release";
  }, /provenance.version: expected source version/);
  rejectsMutation((d) => {
    d.report.counts.eligibleNodes -= 1;
  }, /report.counts.eligibleNodes/);
  rejectsMutation((d) => {
    d.nodes.find((n) => n.constantValues).constantValues[0].value = 6.626e-34;
  }, /constantValues\[0\]\.value/);
});

test("duplicate node, edge, unit, and constant-value identities cannot overwrite index entries", () => {
  rejectsMutation((d) => {
    d.nodes.push(structuredClone(d.nodes[0]));
  }, /duplicate ID/);
  rejectsMutation((d) => {
    d.edges.push(structuredClone(d.edges[0]));
  }, /duplicate ID/);
  rejectsMutation((d) => {
    d.units[0].id = d.nodes[0].id;
  }, /duplicate ID/);
  rejectsMutation((d) => {
    const n = d.nodes.find((n) => n.constantValues);
    n.constantValues.push(structuredClone(n.constantValues[0]));
  }, /duplicate ID/);
  rejectsMutation((d) => {
    const shared = d.nodes
      .flatMap((n) => n.constantValues ?? [])
      .filter((v) => v.id.endsWith("/Value_MagneticConstant"));
    assert.equal(shared.length, 2);
    shared[1].value = "a conflicting lexical value";
  }, /conflicting shared value ID/);
  assert.throws(
    () => buildGraphIndex([...nodes, nodes[0]], edges, units),
    /duplicate ID/,
  );
});

test("every explicit graph endpoint, unit use, applicable unit, quantity reference, and equation binding must resolve", () => {
  rejectsMutation((d) => {
    d.edges[0].target = "urn:missing:node";
  }, /edges\[0\]\.target: unknown node ID/);
  rejectsMutation((d) => {
    d.nodes[0].unitIds.push("urn:missing:unit");
  }, /unitIds\[.*unknown unit ID/);
  rejectsMutation((d) => {
    d.nodes[0].applicableUnitIds.push("urn:missing:unit");
  }, /applicableUnitIds\[.*unknown unit ID/);
  rejectsMutation((d) => {
    d.units[0].quantityKindIds.push("urn:missing:quantity");
  }, /quantityKindIds\[.*unknown quantity ID/);
  rejectsMutation((d) => {
    d.nodes[0].bindings = [{ symbol: "P", nodeId: "urn:missing:node" }];
  }, /bindings\[0\]\.nodeId.*unknown node ID/);
  rejectsMutation((d) => {
    d.nodes[0].bindings = [
      { symbol: "P", nodeId: q("Pressure"), unitId: "urn:missing:unit" },
    ];
  }, /bindings\[0\]\.unitId.*unknown unit ID/);
});

test("repeated symbols and renamed display fields never merge identities or retarget equations, edges, or units", () => {
  const repeated = nodes.map((node) =>
    [q("Pressure"), q("Power")].includes(node.id)
      ? { ...node, symbol: "P", latex: "P" }
      : node,
  );
  const display = applyDisplayOverrides(repeated, {
    [q("Pressure")]: { label: "Same name", latex: "x" },
    [q("Power")]: { label: "Same name", latex: "x" },
    [example.id]: { label: "Renamed equation", latex: "anything" },
  });
  const changed = buildGraphIndex(display, edges, units);
  assert.equal(changed.nodesById.size, index.nodesById.size);
  assert.notEqual(
    changed.nodesById.get(q("Pressure")),
    changed.nodesById.get(q("Power")),
  );
  assert.deepEqual(
    changed.nodesById.get(example.id).bindings,
    example.bindings,
  );
  assert.deepEqual(changed.outgoing.get(example.id), exampleEdges);
  assert.deepEqual(
    [...changed.neighbors.get(example.id)],
    [...index.neighbors.get(example.id)],
  );
  assert.equal(
    changed.nodesById.get(q("Pressure")).provenance,
    index.nodesById.get(q("Pressure")).provenance,
  );
  assert.equal(index.nodesById.get(q("Pressure")).label, "Pressure");
  assert.equal(changed.unitUseBacklinks.get(intervalUnit.id)[0].id, example.id);
  assert.throws(
    () => applyDisplayOverrides(nodes, { [example.id]: { id: "urn:renamed" } }),
    /cannot change id/,
  );
  assert.throws(
    () => applyDisplayOverrides(nodes, { "urn:missing": { label: "Missing" } }),
    /unknown node ID/,
  );
});

test("unit use backlinks include exact bindings and values once, without counting compatibility references", () => {
  assert.deepEqual(
    index.unitUseBacklinks.get(intervalUnit.id).map((n) => n.id),
    [example.id],
  );
  assert.equal(
    index.unitUseBacklinks
      .get(u("BTU_IT-PER-HR"))
      .filter((n) => n.id === example.id).length,
    1,
  );
  assert.ok(
    index.unitApplicableBacklinks
      .get(u("BTU_IT-PER-HR"))
      .some((n) => n.id === q("Power")),
  );
  assert.ok(
    !index.unitUseBacklinks
      .get(u("BTU_IT-PER-HR"))
      .some((n) => n.id === q("Power")),
  );
  const sourceConstant = nodes.find((n) => n.constantValues?.length);
  const sourceUnit = sourceConstant.constantValues[0].unitIds[0];
  const valueOnly = { ...sourceConstant, unitIds: [] };
  const withValueOnly = buildGraphIndex(
    nodes.map((n) => (n.id === valueOnly.id ? valueOnly : n)),
    edges,
    units,
  );
  assert.equal(
    withValueOnly.unitUseBacklinks
      .get(sourceUnit)
      .filter((n) => n.id === valueOnly.id).length,
    1,
  );
  const bindingOnly = { ...example, unitIds: [] };
  const withBindingOnly = buildGraphIndex(
    nodes.map((n) => (n.id === example.id ? bindingOnly : n)),
    edges,
    units,
  );
  assert.deepEqual(
    withBindingOnly.unitUseBacklinks.get(intervalUnit.id).map((n) => n.id),
    [example.id],
  );
});

test("typed relationship direction retains exact source evidence and participation does not imply solve direction", () => {
  const specialization = edges.find((edge) =>
    edge.predicate.endsWith("specializationOf"),
  );
  assert.equal(describeRelationship(specialization).kind, "specialization");
  assert.ok(index.outgoing.get(specialization.source).includes(specialization));
  assert.ok(index.incoming.get(specialization.target).includes(specialization));
  assert.equal(
    describeRelationship(exampleEdges[0]).kind,
    "equation-participation",
  );
  assert.match(
    describeRelationship(exampleEdges[0]).description,
    /not a fixed input or output/,
  );
  const custom = {
    ...specialization,
    predicate: "urn:future:relationship",
    label: "future relation",
  };
  assert.equal(describeRelationship(custom).kind, "other");
  assert.equal(describeRelationship(custom).label, "future relation");
  assert.equal(custom.predicate, "urn:future:relationship");
});

test("neighbour weight counts each visible concept once regardless of multiple predicates or explicit references", () => {
  const edge = edges[0];
  const parallel = {
    ...edge,
    id: "urn:test:parallel",
    predicate: "urn:test:additional",
  };
  const repeated = buildGraphIndex(nodes, [...edges, parallel], units);
  assert.equal(
    repeated.outgoing.get(edge.source).length,
    index.outgoing.get(edge.source).length + 1,
  );
  assert.deepEqual(
    repeated.neighbors.get(edge.source),
    index.neighbors.get(edge.source),
  );
  assert.equal(index.neighbors.get(example.id).size, 4);
  assert.ok(!index.neighbors.has(intervalUnit.id));
});

test("reviewed classifications are exact-ID, sourced quantity overlays with state, transfer, and rate distinctions", () => {
  assert.equal(Object.keys(reviewedClassifications).length, 18);
  for (const [id, classification] of Object.entries(reviewedClassifications)) {
    const node = index.nodesById.get(id);
    assert.equal(node.kind, "quantity");
    assert.equal(getClassification(node).status, "reviewed");
    assert.equal(classification.origin, "authored");
    assert.ok(classification.sourceUrls.length > 0);
    assert.equal(node.classification, undefined);
  }
  assert.ok(
    isThermodynamicStateProperty(index.nodesById.get(q("SpecificEnthalpy"))),
  );
  assert.equal(
    getClassification(index.nodesById.get(q("Heat"))).kind,
    "process-transfer",
  );
  assert.equal(
    getClassification(index.nodesById.get(q("HeatFlowRate"))).kind,
    "transfer-rate",
  );
  assert.equal(
    getClassification(index.nodesById.get(q("MassFlowRate"))).kind,
    "flow-rate",
  );
  assert.equal(
    getClassification(index.nodesById.get(q("WetBulbTemperature"))).status,
    "review-needed",
  );
  assert.equal(
    getClassification(index.nodesById.get(q("SpecificHeatCapacity"))).status,
    "review-needed",
  );
  const sameDisplayAndDimension = {
    ...index.nodesById.get(q("Temperature")),
    id: "urn:test:unreviewed",
  };
  assert.equal(
    getClassification(sameDisplayAndDimension).status,
    "review-needed",
  );
  assert.ok(!isThermodynamicStateProperty(sameDisplayAndDimension));
});
