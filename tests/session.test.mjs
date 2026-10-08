import test from "node:test";
import assert from "node:assert/strict";
import {
  createSession,
  dispatchSession,
  historyControls,
  canUndo,
  canRedo,
} from "../src/domain/session.ts";

const concept = (id, label = id) => ({
  id,
  label,
  kind: "quantity",
  unitIds: [],
  applicableUnitIds: [],
  quantityKindIds: [],
  dimensionIds: [],
  sourceTypes: [],
  provenance: {
    origin: "authored",
    sourceId: id,
    sourceUrl: "urn:hvacr:session-test",
  },
});
const base = {
  nodes: [concept("a", "Air flow"), concept("b", "Water flow")],
  edges: [],
  units: [],
};
const dispatch = (state, action) => dispatchSession(base, state, action);
const reference = (id, panel = "inspector") => ({ selectedId: id, panel });
const visit = (state, id) =>
  dispatch(state, {
    type: "navigate",
    reference: reference(id),
    label: `Inspect ${id}`,
  });
const enableEdit = (state) =>
  dispatch(state, { type: "editMode.set", value: true });
const rename = (state, label = "Supply air flow") =>
  dispatch(state, {
    type: "author",
    command: { type: "node.edit", id: "a", patch: { label } },
    label: "Rename air flow",
  });

test("a new session defaults to browsing with immutable empty history and independent view controls", () => {
  const state = createSession();
  assert.equal(state.editMode, false);
  assert.equal(state.showStatusBar, true);
  assert.equal(state.panelsOpen, true);
  assert.equal(state.mergedTabs, false);
  assert.deepEqual(state.present.reference, { panel: "graph" });
  assert.equal(canUndo(state), false);
  assert.equal(canRedo(state), false);
  assert.deepEqual(historyControls(state).undo, {
    label: "",
    enabled: false,
    requiresEditMode: false,
  });
  assert.throws(() => state.past.push({}), TypeError);
  assert.throws(() => {
    state.present.reference.panel = "units";
  }, TypeError);
  assert.equal(dispatch(state, { type: "undo" }), state);
  assert.equal(dispatch(state, { type: "redo" }), state);
});

test("navigation and authoring share one ordered timeline with correct snapshots in both directions", () => {
  const original = JSON.stringify(base);
  let state = enableEdit(createSession());
  const initialAuthoring = state.present.authoring;
  state = visit(state, "a");
  assert.equal(state.present.authoring, initialAuthoring);
  state = rename(state);
  const editedAuthoring = state.present.authoring;
  state = visit(state, "b");
  assert.deepEqual(
    state.past.map((item) => item.kind),
    ["navigate", "author", "navigate"],
  );
  assert.equal(historyControls(state).undo.label, "Inspect b");
  state = dispatch(state, { type: "undo" });
  assert.equal(state.present.reference.selectedId, "a");
  assert.equal(state.present.authoring, editedAuthoring);
  state = dispatch(state, { type: "undo" });
  assert.equal(state.present.reference.selectedId, "a");
  assert.equal(state.present.authoring, initialAuthoring);
  state = dispatch(state, { type: "undo" });
  assert.deepEqual(state.present.reference, { panel: "graph" });
  assert.equal(state.present.authoring, initialAuthoring);
  assert.equal(state.future.length, 3);
  state = dispatch(state, { type: "redo" });
  assert.equal(state.present.reference.selectedId, "a");
  state = dispatch(state, { type: "redo" });
  assert.equal(state.present.authoring, editedAuthoring);
  state = dispatch(state, { type: "redo" });
  assert.equal(state.present.reference.selectedId, "b");
  assert.equal(state.future.length, 0);
  assert.equal(JSON.stringify(base), original);
});

test("browse mode allows reference history but cannot author or travel across a content edit", () => {
  const initial = createSession();
  const rejected = rename(initial);
  assert.match(rejected.error, /Enable Edit mode/);
  assert.equal(rejected.present, initial.present);
  assert.equal(rejected.past, initial.past);
  assert.equal(rejected.future, initial.future);
  const createRejected = dispatch(initial, {
    type: "beginCreate",
    kind: "quantity",
  });
  assert.match(createRejected.error, /Enable Edit mode/);
  assert.equal(createRejected.creating, undefined);
  let state = visit(rename(enableEdit(visit(initial, "a"))), "b");
  state = dispatch(state, { type: "editMode.set", value: false });
  assert.equal(canUndo(state), true);
  state = dispatch(state, { type: "undo" });
  assert.equal(state.present.reference.selectedId, "a");
  assert.equal(canUndo(state), false);
  assert.equal(historyControls(state).undo.requiresEditMode, true);
  assert.equal(historyControls(state).undo.label, "Rename air flow");
  const blocked = dispatch(state, { type: "undo" });
  assert.match(blocked.error, /Enable Edit mode to undo/);
  assert.equal(blocked.present, state.present);
  assert.equal(blocked.past, state.past);
  assert.equal(blocked.future, state.future);
  state = dispatch(enableEdit(blocked), { type: "undo" });
  state = dispatch(state, { type: "editMode.set", value: false });
  assert.equal(canRedo(state), false);
  assert.equal(historyControls(state).redo.requiresEditMode, true);
  assert.match(
    dispatch(state, { type: "redo" }).error,
    /Enable Edit mode to redo/,
  );
  state = dispatch(enableEdit(state), { type: "redo" });
  assert.equal(
    state.present.authoring.nodeOverrides.a.label,
    "Supply air flow",
  );
});

test("new navigation or content edits branch history; duplicate visits and no-op edits preserve redo", () => {
  let state = rename(enableEdit(visit(createSession(), "a")));
  state = dispatch(state, { type: "undo" });
  const future = state.future;
  const past = state.past;
  state = visit(state, "a");
  assert.equal(state.future, future);
  assert.equal(state.past, past);
  state = rename(state, "Air flow");
  assert.equal(state.future, future);
  assert.equal(state.past, past);
  assert.equal(state.message, "Rename air flow");
  const navigationBranch = visit(state, "b");
  assert.equal(navigationBranch.future.length, 0);
  assert.equal(navigationBranch.past.length, past.length + 1);
  const contentBranch = rename(state, "Different air flow");
  assert.equal(contentBranch.future.length, 0);
  assert.equal(contentBranch.past.length, past.length + 1);
});

test("failed content commands and invalid post-save references preserve the entire active timeline", () => {
  let state = rename(enableEdit(visit(createSession(), "a")));
  state = dispatch(state, { type: "undo" });
  for (const action of [
    {
      type: "author",
      command: {
        type: "node.edit",
        id: "missing",
        patch: { label: "Missing" },
      },
      label: "Invalid edit",
    },
    {
      type: "author",
      command: { type: "node.create", node: concept("c", "New flow") },
      reference: reference("missing"),
      label: "Create with invalid selection",
    },
    {
      type: "author",
      command: { type: "node.create", node: concept("c", "New flow") },
      reference: { selectedId: "c", unitId: "missing-unit", panel: "units" },
      label: "Create with invalid unit",
    },
  ]) {
    const failed = dispatch(state, action);
    assert.ok(failed.error);
    assert.equal(failed.present, state.present);
    assert.equal(failed.past, state.past);
    assert.equal(failed.future, state.future);
    assert.equal(failed.present.authoring.authoredNodes.c, undefined);
  }
});

test("Save and selection of a newly created concept form one atomic undo step", () => {
  let state = enableEdit(visit(createSession(), "a"));
  state = dispatch(state, { type: "beginCreate", kind: "quantity" });
  const before = state.present;
  const beforeCount = state.past.length;
  state = dispatch(state, {
    type: "author",
    command: { type: "node.create", node: concept("c", "New flow") },
    reference: reference("c"),
    label: "Create New flow",
  });
  assert.equal(state.past.length, beforeCount + 1);
  assert.equal(state.creating, undefined);
  assert.equal(state.present.reference.selectedId, "c");
  assert.ok(state.present.authoring.authoredNodes.c);
  state = visit(state, "c");
  assert.equal(state.past.length, beforeCount + 1);
  state = dispatch(state, { type: "undo" });
  assert.equal(state.present.reference.selectedId, "a");
  assert.equal(state.present.authoring, before.authoring);
  assert.equal(state.present.authoring.authoredNodes.c, undefined);
  state = dispatch(state, { type: "redo" });
  assert.equal(state.present.reference.selectedId, "c");
  assert.ok(state.present.authoring.authoredNodes.c);
});

test("manual-placement history preserves captured first-drag and later unpinned force positions", () => {
  let state = enableEdit(visit(createSession(), "a"));
  const first = { x: 20, y: -30, pinned: false };
  const moved = { x: 40, y: 15, pinned: true };
  state = dispatch(state, {
    type: "author",
    command: {
      type: "placement.set",
      id: "a",
      before: first,
      placement: moved,
    },
    label: "Move air flow",
  });
  assert.deepEqual(state.present.authoring.placements.a, moved);
  state = dispatch(state, { type: "undo" });
  assert.deepEqual(state.present.authoring.placements.a, first);
  state = dispatch(state, { type: "redo" });
  assert.deepEqual(state.present.authoring.placements.a, moved);
  state = dispatch(state, {
    type: "author",
    command: {
      type: "placement.set",
      id: "a",
      before: moved,
      placement: { ...moved, pinned: false },
    },
    label: "Unpin air flow",
  });
  const forcePosition = { x: 150, y: -100, pinned: false };
  state = dispatch(state, {
    type: "author",
    command: {
      type: "placement.set",
      id: "a",
      before: forcePosition,
      placement: { ...forcePosition, pinned: true },
    },
    label: "Pin air flow",
  });
  state = dispatch(state, { type: "undo" });
  assert.deepEqual(state.present.authoring.placements.a, forcePosition);
  const past = state.past;
  const future = state.future;
  state = dispatch(state, {
    type: "author",
    command: {
      type: "placement.set",
      id: "a",
      before: forcePosition,
      placement: forcePosition,
    },
    label: "No movement",
  });
  assert.equal(state.past, past);
  assert.equal(state.future, future);
});

test("mode, status, panel arrangement, creation drafts and notices never add or discard history", () => {
  let state = visit(visit(createSession(), "a"), "b");
  state = dispatch(state, { type: "undo" });
  const past = state.past;
  const future = state.future;
  const authoring = state.present.authoring;
  for (const action of [
    { type: "statusBar.set", value: false },
    { type: "panels.closeAll" },
    { type: "panels.merge" },
    { type: "panels.restore" },
    { type: "activate", panel: "library" },
    { type: "editMode.set", value: true },
    { type: "beginCreate", kind: "equation" },
    { type: "cancelCreate" },
    { type: "notice", message: "View ready" },
    { type: "error", message: "Example error" },
    { type: "error.clear" },
  ]) {
    state = dispatch(state, action);
    assert.equal(state.past, past);
    assert.equal(state.future, future);
    assert.equal(state.present.authoring, authoring);
  }
  assert.equal(state.showStatusBar, false);
  assert.equal(state.mergedTabs, false);
  assert.equal(state.panelsOpen, true);
  state = dispatch(state, { type: "beginCreate", kind: "constant" });
  state = dispatch(state, { type: "editMode.set", value: false });
  assert.equal(state.creating, undefined);
  assert.equal(state.future, future);
  state = dispatch(state, { type: "redo" });
  assert.equal(state.present.reference.selectedId, "b");
  assert.equal(state.present.reference.panel, "inspector");
});
