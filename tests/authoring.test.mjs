import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createAuthoringState,
  createHistory,
  applyCommand,
  executeCommand,
  buildWorkspace,
  undo,
  redo,
  internalReferences,
} from "../src/domain/authoring.ts";
import { parseDataset } from "../src/domain/validation.ts";
import { example, exampleEdges, intervalUnit } from "../src/domain/example.ts";

const dataset = parseDataset(
  JSON.parse(
    await readFile(
      new URL("../public/data/qudt-graph.json", import.meta.url),
      "utf8",
    ),
  ),
);
const base = {
  nodes: [...dataset.nodes, example],
  edges: [...dataset.edges, ...exampleEdges],
  units: [...dataset.units, intervalUnit],
};
const q = (name) => `http://qudt.org/vocab/quantitykind/${name}`;
const u = (name) => `http://qudt.org/vocab/unit/${name}`;
function custom(id = "urn:hvacr:user:water-flow", patch = {}) {
  return {
    id,
    kind: "quantity",
    label: "Water flow",
    unitIds: [u("GAL_US-PER-MIN")],
    applicableUnitIds: [],
    quantityKindIds: [],
    dimensionIds: [],
    sourceTypes: [],
    provenance: {
      origin: "authored",
      sourceId: id,
      sourceUrl: "urn:hvacr:local-authoring",
    },
    ...patch,
  };
}
const constant = () =>
  custom("urn:hvacr:user:adopted-density", {
    kind: "constant",
    label: "Adopted water density",
    constantSubtype: "adopted property",
    valueStatus: "assumed",
    assumptions: [
      "Example condition; independently verify before calculation.",
    ],
    sourceUrls: ["https://example.org/source"],
    unitIds: [u("LB-PER-GAL_US")],
    constantValues: [
      {
        id: "urn:hvacr:value:adopted-density",
        value: "8.33",
        unitIds: [u("LB-PER-GAL_US")],
        sourceUrls: ["https://example.org/source"],
      },
    ],
  });
const command = (state, action) => applyCommand(base, state, action);
const execute = (history, action, label = action.type) =>
  executeCommand(base, history, action, label);

test("node, unit and relationship overrides preserve stable IDs and original frozen source records", () => {
  const original = JSON.stringify(base);
  let state = createAuthoringState();
  state = command(state, {
    type: "node.edit",
    id: q("Pressure"),
    patch: {
      label: "Working pressure",
      symbol: "p",
      notes: `[exact unit](unit:${encodeURIComponent(u("PSI"))})`,
    },
  });
  state = command(state, {
    type: "unit.edit",
    id: u("PSI"),
    patch: { label: "PSI", latex: "\\mathrm{psi}" },
  });
  state = command(state, {
    type: "edge.edit",
    id: base.edges[0].id,
    patch: { label: "Reviewed wording" },
  });
  const workspace = buildWorkspace(base, state);
  assert.equal(
    workspace.nodes.find((node) => node.id === q("Pressure")).label,
    "Working pressure",
  );
  assert.equal(
    workspace.units.find((unit) => unit.id === u("PSI")).label,
    "PSI",
  );
  assert.equal(workspace.edges[0].id, base.edges[0].id);
  assert.equal(JSON.stringify(base), original);
  assert.throws(() => {
    state.nodeOverrides[q("Pressure")].label = "Mutated";
  }, TypeError);
  state = command(state, { type: "node.reset", id: q("Pressure") });
  assert.equal(
    buildWorkspace(base, state).nodes.find((node) => node.id === q("Pressure")),
    base.nodes.find((node) => node.id === q("Pressure")),
  );
  assert.throws(
    () =>
      command(state, {
        type: "node.edit",
        id: q("Pressure"),
        patch: { id: "renamed" },
      }),
    /stable identity/,
  );
  assert.throws(
    () =>
      command(state, {
        type: "unit.edit",
        id: u("PSI"),
        patch: { multiplier: "2" },
      }),
    /stable identity/,
  );
});

test("one compound creation connects a quantity, equation and contextual constant and undoes atomically", () => {
  const quantity = custom();
  const coefficient = constant();
  const equation = custom("urn:hvacr:user:relationship", {
    kind: "equation",
    label: "Learning relation",
    latex: "x = cq",
    bindings: [
      { symbol: "q", nodeId: quantity.id },
      { symbol: "c", nodeId: coefficient.id, unitId: coefficient.unitIds[0] },
    ],
  });
  const actions = [quantity, coefficient, equation].map((node) => ({
    type: "node.create",
    node,
  }));
  const initial = createHistory();
  const edited = execute(
    initial,
    { type: "compound", commands: actions },
    "Create learning example",
  );
  assert.equal(edited.past.length, 1);
  assert.equal(edited.past[0].label, "Create learning example");
  const workspace = buildWorkspace(base, edited.present);
  assert.equal(workspace.nodes.length, base.nodes.length + 3);
  assert.equal(workspace.edges.length, base.edges.length + 2);
  assert.deepEqual(
    workspace.edges
      .slice(-2)
      .map((edge) => edge.target)
      .sort(),
    [quantity.id, coefficient.id].sort(),
  );
  assert.equal(undo(edited).present, initial.present);
  assert.equal(redo(undo(edited)).present, edited.present);
  equation.bindings[0].nodeId = "outside";
  assert.equal(
    edited.present.authoredNodes[equation.id].bindings[0].nodeId,
    quantity.id,
  );
});

test("source exclusion and restoration hide incident edges without breaking references and each undo correctly", () => {
  const id = q("TemperatureDifference");
  let history = execute(createHistory(), {
    type: "node.exclude",
    id,
    excluded: true,
  });
  let workspace = buildWorkspace(base, history.present);
  assert.ok(workspace.nodes.some((node) => node.id === id));
  assert.ok(!workspace.visibleNodes.some((node) => node.id === id));
  assert.ok(
    workspace.visibleEdges.every(
      (edge) => edge.source !== id && edge.target !== id,
    ),
  );
  const excluded = history.present;
  history = execute(history, { type: "node.exclude", id, excluded: false });
  assert.ok(
    buildWorkspace(base, history.present).visibleNodes.some(
      (node) => node.id === id,
    ),
  );
  assert.equal(undo(history).present, excluded);
  assert.throws(
    () => command(history.present, { type: "node.delete", id }),
    /Exclude this node/,
  );
  assert.throws(
    () =>
      command(history.present, { type: "edge.delete", id: base.edges[0].id }),
    /Exclude this relationship/,
  );
});

test("overlapping groups preserve membership independently and deleting a group never deletes nodes", () => {
  const ids = [q("Pressure"), q("Temperature")];
  let history = createHistory();
  for (const id of ["fluid", "system"])
    history = execute(history, {
      type: "group.put",
      group: { id, name: id, color: "#207f73", nodeIds: ids },
    });
  history = execute(history, {
    type: "group.members",
    id: "fluid",
    nodeIds: [ids[0], ids[0]],
  });
  assert.deepEqual(history.present.groups.fluid.nodeIds, [ids[0]]);
  assert.deepEqual(history.present.groups.system.nodeIds, ids);
  const before = history.present;
  history = execute(history, { type: "group.delete", id: "fluid" });
  assert.deepEqual(buildWorkspace(base, history.present).nodes, base.nodes);
  assert.equal(undo(history).present, before);
});

test("authored deletion removes incident authored edges, groups and placement in one reversible action", () => {
  const node = custom();
  let history = execute(createHistory(), { type: "node.create", node });
  history = execute(history, {
    type: "compound",
    commands: [
      {
        type: "edge.create",
        edge: {
          id: "urn:hvacr:edge:1",
          source: node.id,
          target: q("VolumeFlowRate"),
          predicate: "urn:hvacr:relationship:specialization",
          label: "Specialization",
          provenance: node.provenance,
        },
      },
      {
        type: "group.put",
        group: {
          id: "water",
          name: "Water",
          color: "#0077ff",
          nodeIds: [node.id, q("VolumeFlowRate")],
        },
      },
      {
        type: "placement.set",
        id: node.id,
        placement: { x: 1, y: 2, pinned: true },
      },
    ],
  });
  const before = history.present;
  const count = history.past.length;
  history = execute(
    history,
    { type: "node.delete", id: node.id },
    "Delete Water flow and its relationships",
  );
  assert.equal(history.past.length, count + 1);
  assert.ok(!history.present.authoredNodes[node.id]);
  assert.deepEqual(history.present.authoredEdges, {});
  assert.deepEqual(history.present.groups.water.nodeIds, [q("VolumeFlowRate")]);
  assert.ok(!history.present.placements[node.id]);
  assert.equal(undo(history).present, before);
  assert.equal(redo(undo(history)).present, history.present);
});

test("referenced authored deletion fails intact until explicit note and binding edits are applied atomically", () => {
  const node = custom();
  const equation = custom("urn:hvacr:equation:user", {
    kind: "equation",
    label: "Linked relation",
    bindings: [{ symbol: "q", nodeId: node.id }],
  });
  let history = execute(createHistory(), {
    type: "compound",
    commands: [
      { type: "node.create", node },
      { type: "node.create", node: equation },
      {
        type: "node.edit",
        id: q("Pressure"),
        patch: { notes: `[Water](node:${encodeURIComponent(node.id)})` },
      },
    ],
  });
  const before = history.present;
  assert.throws(
    () => execute(history, { type: "node.delete", id: node.id }),
    /Pressure.*Linked relation.*Remove its equation bindings/,
  );
  assert.equal(history.present, before);
  history = execute(history, {
    type: "compound",
    commands: [
      { type: "node.edit", id: equation.id, patch: { bindings: [] } },
      {
        type: "node.edit",
        id: q("Pressure"),
        patch: { notes: "Reference removed deliberately." },
      },
      { type: "node.delete", id: node.id },
    ],
  });
  assert.equal(undo(history).present, before);
  assert.ok(
    !buildWorkspace(base, history.present).edges.some(
      (edge) => edge.target === node.id,
    ),
  );
});

test("bad references and duplicate identities fail before any compound edit becomes visible", () => {
  const initial = createAuthoringState();
  assert.throws(
    () =>
      command(initial, {
        type: "compound",
        commands: [
          { type: "node.create", node: custom() },
          {
            type: "node.create",
            node: custom("urn:bad", { unitIds: ["not-a-unit"] }),
          },
        ],
      }),
    /unknown unit ID/,
  );
  assert.deepEqual(initial.authoredNodes, {});
  assert.throws(
    () =>
      command(initial, { type: "node.create", node: custom(q("Pressure")) }),
    /already exists/,
  );
  assert.throws(
    () =>
      command(initial, {
        type: "node.edit",
        id: q("Pressure"),
        patch: { notes: "[missing](node:urn%3Anot-known)" },
      }),
    /unknown node/,
  );
  assert.throws(
    () =>
      command(initial, {
        type: "group.put",
        group: {
          id: "bad",
          name: "Bad",
          color: "#000000",
          nodeIds: ["missing"],
        },
      }),
    /unknown node/,
  );
  assert.deepEqual(
    internalReferences(
      `[p](node:${encodeURIComponent(q("Pressure"))}) [u](unit:${encodeURIComponent(u("PSI"))})`,
    ),
    { nodeIds: [q("Pressure")], unitIds: [u("PSI")] },
  );
});

test("constants require context and changing recorded value units is explicitly unsupported", () => {
  const first = createAuthoringState();
  assert.throws(
    () =>
      command(first, {
        type: "node.create",
        node: custom("urn:bare-number", { kind: "constant", label: "500" }),
      }),
    /Constant subtype/,
  );
  const record = constant();
  let state = command(first, { type: "node.create", node: record });
  const changed = {
    ...record.constantValues[0],
    unitIds: [u("KiloGM-PER-M3")],
  };
  assert.throws(
    () =>
      command(state, {
        type: "node.edit",
        id: record.id,
        patch: { constantValues: [changed] },
      }),
    /conversion is unavailable/,
  );
  assert.throws(
    () =>
      command(state, {
        type: "node.edit",
        id: record.id,
        patch: { constantValues: [{ ...changed, value: "999" }] },
      }),
    /conversion is unavailable/,
  );
  state = command(state, {
    type: "node.edit",
    id: record.id,
    patch: { constantValues: [{ ...record.constantValues[0], value: "" }] },
  });
  state = command(state, {
    type: "node.edit",
    id: record.id,
    patch: {
      constantValues: [{ ...changed, value: "998.2" }],
      assumptions: [
        "New independently sourced value for the explicitly stated conditions.",
      ],
    },
  });
  assert.equal(state.authoredNodes[record.id].constantValues[0].value, "998.2");
  assert.equal(record.constantValues[0].value, "8.33");
  assert.throws(
    () =>
      command(state, {
        type: "preference.set",
        id: record.id,
        unitId: u("KiloGM-PER-M3"),
      }),
    /recorded values|Recorded constant/,
  );
});

test("display preferences use reviewed exact identities and undo independently from source units", () => {
  const source = base.nodes.find((node) => node.id === q("Temperature"));
  const history = execute(createHistory(), {
    type: "preference.set",
    id: source.id,
    unitId: u("DEG_C"),
  });
  assert.equal(history.present.unitPreferences[source.id], u("DEG_C"));
  assert.deepEqual(
    buildWorkspace(base, history.present).nodes.find(
      (node) => node.id === source.id,
    ),
    source,
  );
  assert.deepEqual(undo(history).present.unitPreferences, {});
  assert.throws(
    () =>
      command(history.present, {
        type: "preference.set",
        id: source.id,
        unitId: u("LB"),
      }),
    /not a reviewed choice/,
  );
});

test("first drag is one history step restoring the real start coordinate; later drags and pins undo", () => {
  const id = q("Pressure");
  const before = { x: 10, y: 20, pinned: false };
  const placement = { x: 300, y: 200, pinned: true };
  const initial = createHistory();
  let history = execute(
    initial,
    { type: "placement.set", id, before, placement },
    "Move pressure",
  );
  assert.equal(history.past.length, 1);
  assert.deepEqual(undo(history).present.placements[id], before);
  assert.deepEqual(redo(undo(history)).present.placements[id], placement);
  history = execute(
    history,
    {
      type: "placement.set",
      id,
      before: placement,
      placement: { ...placement, pinned: false },
    },
    "Unpin pressure",
  );
  assert.deepEqual(undo(history).present.placements[id], placement);
  assert.throws(
    () =>
      command(initial.present, {
        type: "placement.set",
        id,
        placement: { x: Infinity, y: 1, pinned: true },
      }),
    /finite/,
  );
});

test("no-ops preserve redo and a new deliberate edit clears the abandoned history branch", () => {
  const initial = createHistory();
  const edited = execute(initial, {
    type: "node.exclude",
    id: q("Pressure"),
    excluded: true,
  });
  const reversed = undo(edited);
  assert.equal(
    execute(reversed, {
      type: "node.edit",
      id: q("Pressure"),
      patch: { label: "Pressure" },
    }),
    reversed,
  );
  assert.equal(
    execute(reversed, {
      type: "unit.edit",
      id: u("PSI"),
      patch: { label: base.units.find((unit) => unit.id === u("PSI")).label },
    }),
    reversed,
  );
  assert.equal(
    execute(reversed, {
      type: "node.exclude",
      id: q("Pressure"),
      excluded: false,
    }),
    reversed,
  );
  assert.equal(
    execute(reversed, {
      type: "placement.set",
      id: q("Pressure"),
      before: { x: 1, y: 1, pinned: false },
      placement: { x: 1, y: 1, pinned: false },
    }),
    reversed,
  );
  const branched = execute(reversed, {
    type: "node.edit",
    id: q("Temperature"),
    patch: { label: "Temperature reading" },
  });
  assert.equal(branched.future.length, 0);
  assert.equal(redo(branched), branched);
});

test("equation binding overrides preserve baseline relationships and reset restores the original participants", () => {
  const initial = createAuthoringState();
  const smaller = command(initial, {
    type: "node.edit",
    id: example.id,
    patch: { bindings: example.bindings.slice(1) },
  });
  const workspace = buildWorkspace(base, smaller);
  assert.equal(workspace.edges.length, base.edges.length);
  assert.ok(
    !workspace.visibleEdges.some(
      (edge) =>
        edge.source === example.id &&
        edge.target === example.bindings[0].nodeId,
    ),
  );
  const restored = command(smaller, { type: "node.reset", id: example.id });
  assert.deepEqual(buildWorkspace(base, restored).visibleEdges, base.edges);
});

test("drag after unpin and force movement restores the captured start rather than stale manual coordinates", () => {
  const id = q("Pressure");
  let history = execute(createHistory(), {
    type: "placement.set",
    id,
    placement: { x: 10, y: 20, pinned: false },
  });
  const current = { x: 450, y: -300, pinned: false };
  history = execute(history, {
    type: "placement.set",
    id,
    before: current,
    placement: { x: 600, y: 80, pinned: true },
  });
  assert.equal(history.past.length, 2);
  assert.deepEqual(undo(history).present.placements[id], current);
});

test("Markdown references match rendered CommonMark links including definitions, escapes and autolinks, excluding code, math and images", () => {
  const id = encodeURIComponent(q("Pressure"));
  const unit = encodeURIComponent(u("PSI"));
  const markdown = `[inline](node:${id}) [REF] [reference][Ref]\n\n[ref]: unit:${unit}\n\n<NODE:${id}>\n\n\`[code](node:unknown)\`\n\n\`\`\`\n[fenced](node:unknown)\n\`\`\`\n\n$[math](node:unknown)$\n\n![image](node:unknown)\n\n[unused]: node:unknown`;
  assert.deepEqual(internalReferences(markdown), {
    nodeIds: [q("Pressure")],
    unitIds: [u("PSI")],
  });
  assert.throws(
    () =>
      command(createAuthoringState(), {
        type: "node.edit",
        id: q("Pressure"),
        patch: { notes: "[Broken][id]\n\n[id]: node:unknown" },
      }),
    /unknown node/,
  );
  const created = command(createAuthoringState(), {
    type: "node.create",
    node: custom(),
  });
  for (const notes of [
    `<node:${encodeURIComponent(custom().id)}>`,
    `[flow][id]\n\n[id]: node:${encodeURIComponent(custom().id)}`,
  ]) {
    const linked = command(created, {
      type: "node.edit",
      id: q("Pressure"),
      patch: { notes },
    });
    assert.throws(
      () => command(linked, { type: "node.delete", id: custom().id }),
      /internal note links/,
    );
  }
});

test("editing equation labels or binding notation does not restore a deliberately excluded relationship", () => {
  const edge = exampleEdges[0];
  let state = command(createAuthoringState(), {
    type: "edge.exclude",
    id: edge.id,
    excluded: true,
  });
  state = command(state, {
    type: "node.edit",
    id: example.id,
    patch: { label: "My sensible-heat example", bindings: example.bindings },
  });
  assert.ok(state.excludedEdgeIds.includes(edge.id));
  state = command(state, { type: "node.reset", id: example.id });
  assert.ok(state.excludedEdgeIds.includes(edge.id));
  state = command(state, {
    type: "node.edit",
    id: example.id,
    patch: {
      bindings: example.bindings.map((binding) => ({
        ...binding,
        symbol: `${binding.symbol}_1`,
      })),
    },
  });
  assert.ok(state.excludedEdgeIds.includes(edge.id));
  assert.equal(Object.keys(state.authoredEdges).length, 0);
});

test("deletion names edited baseline relationships that must be unlinked instead of erasing imported evidence", () => {
  const node = custom();
  let state = command(createAuthoringState(), { type: "node.create", node });
  state = command(state, {
    type: "edge.edit",
    id: base.edges[0].id,
    patch: { target: node.id },
  });
  assert.throws(
    () => command(state, { type: "node.delete", id: node.id }),
    (error) =>
      error.message.includes(base.edges[0].label) &&
      /source relationship endpoints/.test(error.message),
  );
  state = command(state, { type: "edge.reset", id: base.edges[0].id });
  state = command(state, { type: "node.delete", id: node.id });
  assert.equal(buildWorkspace(base, state).edges[0], base.edges[0]);
});

test("a shared imported constant value cannot silently diverge from its aliases; an independent value is explicit and reversible", () => {
  const owners = new Map();
  for (const node of base.nodes)
    for (const value of node.constantValues ?? [])
      owners.set(value.id, [...(owners.get(value.id) ?? []), node]);
  const aliases = [...owners.values()].find((nodes) => nodes.length > 1);
  assert.ok(aliases);
  const node = aliases[0];
  const shared = node.constantValues[0];
  const first = createHistory();
  assert.throws(
    () =>
      execute(first, {
        type: "node.edit",
        id: node.id,
        patch: { constantValues: [{ ...shared, value: "123" }] },
      }),
    /shared with.*Remove this recorded value and save/,
  );
  let history = execute(first, {
    type: "node.edit",
    id: node.id,
    patch: { constantValues: [] },
  });
  history = execute(history, {
    type: "node.edit",
    id: node.id,
    patch: {
      constantValues: [
        { ...shared, id: "urn:hvacr:user:independent-value", value: "123" },
      ],
    },
  });
  assert.deepEqual(
    buildWorkspace(base, history.present).nodes.find(
      (record) => record.id === aliases[1].id,
    ).constantValues,
    aliases[1].constantValues,
  );
  assert.equal(undo(undo(history)).present, first.present);
});

test("history shares unchanged immutable content, including embedded-image notes, across placement edits", () => {
  const node = custom("urn:hvacr:user:illustrated", {
    notes: `![local image](data:image/png;base64,${"A".repeat(64 * 1024)})`,
  });
  let history = execute(createHistory(), { type: "node.create", node });
  const recorded = history.present.authoredNodes[node.id];
  history = execute(history, {
    type: "placement.set",
    id: node.id,
    placement: { x: 1, y: 2, pinned: true },
  });
  history = execute(history, {
    type: "placement.set",
    id: node.id,
    placement: { x: 3, y: 4, pinned: true },
  });
  assert.equal(history.present.authoredNodes[node.id], recorded);
  assert.equal(history.past.at(-1).state.authoredNodes[node.id], recorded);
  assert.equal(history.past.at(-2).state.authoredNodes[node.id], recorded);
  assert.ok(Object.isFrozen(recorded));
});

test("copy-on-write group membership stays isolated when a later compound operation fails", () => {
  const state = command(createAuthoringState(), {
    type: "group.put",
    group: {
      id: "stable-group",
      name: "Original group",
      color: "#0077ff",
      nodeIds: [q("Pressure")],
    },
  });
  const group = state.groups["stable-group"];
  const members = group.nodeIds;
  assert.throws(
    () =>
      command(state, {
        type: "compound",
        commands: [
          { type: "group.members", id: group.id, nodeIds: [q("Temperature")] },
          {
            type: "node.create",
            node: custom("urn:broken", { unitIds: ["missing"] }),
          },
        ],
      }),
    /unknown unit/,
  );
  assert.equal(state.groups[group.id], group);
  assert.equal(group.nodeIds, members);
  assert.deepEqual(members, [q("Pressure")]);
});
