import { test } from "node:test";
import assert from "node:assert/strict";
import {
  browseGraph,
  defaultFilters,
  matchesSearch,
} from "../src/domain/browsing.ts";
const nodes = [
  {
    id: "a",
    label: "Pressure",
    kind: "quantity",
    provenance: { origin: "qudt" },
    classification: {
      kind: "thermodynamic-state-property",
      status: "reviewed",
    },
  },
  {
    id: "b",
    label: "Heat",
    kind: "quantity",
    provenance: { origin: "qudt" },
    classification: { kind: "process-transfer", status: "reviewed" },
  },
  {
    id: "c",
    label: "Unknown",
    kind: "quantity",
    provenance: { origin: "qudt" },
    deprecated: true,
  },
  {
    id: "d",
    label: "Equation",
    kind: "equation",
    provenance: { origin: "authored" },
  },
  {
    id: "isolate",
    label: "Isolate",
    kind: "constant",
    provenance: { origin: "qudt" },
  },
];
const edges = [
  { id: "ab", source: "a", target: "b", predicate: "related" },
  { id: "bc", source: "b", target: "c", predicate: "broader" },
  { id: "ad", source: "a", target: "d", predicate: "binding" },
];
test("default map retains all nodes including isolated/deprecated and only explicit edges", () => {
  assert.deepEqual(browseGraph(nodes, edges, defaultFilters), { nodes, edges });
  assert.equal(
    matchesSearch(
      { id: "urn:pressure-2", label: "Other pressure", symbol: "p" },
      "p pressure-2",
    ),
    true,
  );
});
test("neighbourhood is reversible, bounded, and respects relation/node constraints", () => {
  const one = browseGraph(nodes, edges, {
    ...defaultFilters,
    focus: { id: "a", depth: 1 },
  });
  assert.deepEqual(
    one.nodes.map((n) => n.id),
    ["a", "b", "d"],
  );
  assert.deepEqual(
    browseGraph(nodes, edges, {
      ...defaultFilters,
      focus: { id: "a", depth: 2 },
    }).nodes.map((n) => n.id),
    ["a", "b", "c", "d"],
  );
  assert.equal(
    browseGraph(nodes, edges, {
      ...defaultFilters,
      focus: { id: "a", depth: 2 },
      predicate: "binding",
    }).nodes.length,
    2,
  );
  assert.equal(
    browseGraph(nodes, edges, {
      ...defaultFilters,
      focus: { id: "a", depth: 1 },
      kind: "constant",
    }).nodes.length,
    0,
  );
  assert.deepEqual(browseGraph(nodes, edges, defaultFilters).nodes, nodes);
});
test("state properties remain quantities; unknowns and contradictory filters stay explicit", () => {
  assert.deepEqual(
    browseGraph(nodes, edges, {
      ...defaultFilters,
      classification: "thermodynamic-state-property",
    }).nodes.map((n) => n.id),
    ["a"],
  );
  assert.deepEqual(
    browseGraph(nodes, edges, {
      ...defaultFilters,
      classification: "unreviewed",
    }).nodes.map((n) => n.id),
    ["c"],
  );
  assert.equal(
    browseGraph(nodes, edges, {
      ...defaultFilters,
      classification: "unreviewed",
      includeDeprecated: false,
    }).nodes.length,
    0,
  );
  assert.equal(
    browseGraph(nodes, edges, {
      ...defaultFilters,
      classification: "thermodynamic-state-property",
      kind: "equation",
    }).nodes.length,
    0,
  );
});
