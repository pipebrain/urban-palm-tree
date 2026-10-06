import test from "node:test";
import assert from "node:assert/strict";
import {
  initialLayoutNodes,
  layoutLinks,
  nodeRadii,
  visibleNeighbourCounts,
  groupStyles,
} from "../src/graph/model.ts";

const node = (id, overrides = {}) => ({
  id,
  label: id,
  kind: "quantity",
  ...overrides,
});

test("overlapping groups retain every membership while the first listed group supplies colour", () => {
  const first = { color: "#00aabb", nodeIds: ["a", "b", "a"] };
  const second = { color: "#bb4400", nodeIds: ["a", "c"] };
  const style = groupStyles([first, second]);
  assert.deepEqual(style.get("a"), { color: "#00aabb", groupCount: 2 });
  assert.deepEqual(style.get("b"), { color: "#00aabb", groupCount: 1 });
  assert.deepEqual(style.get("c"), { color: "#bb4400", groupCount: 1 });
  assert.equal(style.get("ungrouped"), undefined);
  assert.deepEqual(groupStyles([second]).get("a"), {
    color: "#bb4400",
    groupCount: 1,
  });
  assert.deepEqual(first.nodeIds, ["a", "b", "a"]);
});
const edge = (id, source, target) => ({ id, source, target });

test("graph weight counts distinct visible learning neighbours, never duplicate, self or hidden links", () => {
  const nodes = [node("a"), node("b"), node("c")];
  const edges = [
    edge("1", "a", "b"),
    edge("2", "b", "a"),
    edge("3", "a", "b"),
    edge("4", "a", "a"),
    edge("5", "a", "hidden-unit"),
    edge("6", "a", "c"),
  ];
  assert.deepEqual(visibleNeighbourCounts(nodes, edges), [2, 1, 1]);
  assert.deepEqual(layoutLinks(nodes, edges), [
    { source: "a", target: "b" },
    { source: "a", target: "c" },
  ]);
  assert.deepEqual(visibleNeighbourCounts(nodes.slice(0, 2), edges), [1, 1]);
  assert.deepEqual(layoutLinks(nodes.slice(0, 2), edges), [
    { source: "a", target: "b" },
  ]);
  assert.deepEqual(nodeRadii([], edges), []);
});

test("hub radius is bounded while isolated nodes retain a visible shape", () => {
  const nodes = [
    node("hub"),
    ...Array.from({ length: 100 }, (_, i) => node(`n${i}`)),
    node("isolated"),
  ];
  const edges = nodes.slice(1, -1).map((n, i) => edge(String(i), "hub", n.id));
  const radii = nodeRadii(nodes, edges);
  assert.equal(radii[0], 10);
  assert.equal(radii[1], 5);
  assert.equal(radii.at(-1), 4);
  assert.ok(radii.every((r) => r >= 4 && r <= 10));
});

test("cached positions and pins follow stable IDs through filtering, reordering and display edits", () => {
  const cache = new Map([
    ["a", { x: 12.5, y: -4 }],
    ["b", { x: -90, y: 72 }],
  ]);
  const pins = new Set(["a"]);
  const filtered = initialLayoutNodes([node("b")], [4], cache, pins);
  assert.deepEqual(filtered[0], {
    id: "b",
    radius: 4,
    x: -90,
    y: 72,
    fx: null,
    fy: null,
  });
  const restored = initialLayoutNodes(
    [
      node("b"),
      node("a", {
        label: "Renamed",
        latex: "T",
        classificationKind: "thermodynamic-state-property",
      }),
    ],
    [5, 5],
    cache,
    pins,
  );
  assert.equal(restored[0].fx, null);
  assert.deepEqual(restored[1], {
    id: "a",
    radius: 5,
    x: 12.5,
    y: -4,
    fx: 12.5,
    fy: -4,
  });
  assert.deepEqual([...pins], ["a"]);
  assert.equal(cache.size, 2);
});

test("layout initialization is finite and deterministic for unseen nodes and preserves zero coordinates", () => {
  const nodes = [node("a"), node("b")];
  const cache = new Map([["a", { x: 0, y: 0 }]]);
  const first = initialLayoutNodes(nodes, [4, 4], cache, new Set());
  assert.deepEqual(first, initialLayoutNodes(nodes, [4, 4], cache, new Set()));
  assert.equal(first[0].x, 0);
  assert.equal(first[0].y, 0);
  assert.ok(first.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y)));
});
