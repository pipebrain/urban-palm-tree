import type { GraphEdge, LearningNode, UnitReference } from "./types.ts";
import { validateGraphReferences } from "./validation.ts";
import { validateUnitPreference } from "./unit-preferences.ts";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mathFromMarkdown } from "mdast-util-math";
import { math } from "micromark-extension-math";

export type NodePatch = Partial<
  Omit<LearningNode, "id" | "kind" | "provenance" | "sourceTypes">
>;
export type EdgePatch = Partial<
  Pick<
    GraphEdge,
    "source" | "target" | "predicate" | "label" | "notes" | "sourceUrls"
  >
>;
export type UnitPatch = Partial<
  Pick<
    UnitReference,
    "label" | "symbol" | "latex" | "description" | "notes" | "sourceUrls"
  >
>;
export interface NodeGroup {
  id: string;
  name: string;
  color: string;
  nodeIds: string[];
}
export interface Placement {
  x: number;
  y: number;
  pinned: boolean;
}
export interface AuthoringBaseline {
  nodes: readonly LearningNode[];
  edges: readonly GraphEdge[];
  units: readonly UnitReference[];
}
/** Only authored changes belong here. Neither source records nor simulation ticks are snapshots. */
export interface AuthoringState {
  nodeOverrides: Record<string, NodePatch>;
  authoredNodes: Record<string, LearningNode>;
  edgeOverrides: Record<string, EdgePatch>;
  authoredEdges: Record<string, GraphEdge>;
  unitOverrides: Record<string, UnitPatch>;
  excludedNodeIds: string[];
  excludedEdgeIds: string[];
  groups: Record<string, NodeGroup>;
  placements: Record<string, Placement>;
  unitPreferences: Record<string, string>;
}
export type AuthoringCommand =
  | { type: "node.create"; node: LearningNode }
  | { type: "node.edit"; id: string; patch: NodePatch }
  | { type: "node.reset"; id: string }
  | { type: "node.exclude"; id: string; excluded: boolean }
  | { type: "node.delete"; id: string }
  | { type: "edge.create"; edge: GraphEdge }
  | { type: "edge.edit"; id: string; patch: EdgePatch }
  | { type: "edge.reset"; id: string }
  | { type: "edge.exclude"; id: string; excluded: boolean }
  | { type: "edge.delete"; id: string }
  | { type: "unit.edit"; id: string; patch: UnitPatch }
  | { type: "unit.reset"; id: string }
  | { type: "group.put"; group: NodeGroup }
  | { type: "group.delete"; id: string }
  | { type: "group.members"; id: string; nodeIds: string[] }
  | {
      type: "placement.set";
      id: string;
      placement: Placement;
      before?: Placement;
    }
  | { type: "placement.reset"; id: string }
  | { type: "preference.set"; id: string; unitId: string }
  | { type: "preference.reset"; id: string }
  | { type: "compound"; commands: AuthoringCommand[] };
export interface HistoryEntry {
  label: string;
  state: AuthoringState;
}
export interface AuthoringHistory {
  present: AuthoringState;
  past: HistoryEntry[];
  future: HistoryEntry[];
}

export function createAuthoringState(): AuthoringState {
  return freeze({
    nodeOverrides: {},
    authoredNodes: {},
    edgeOverrides: {},
    authoredEdges: {},
    unitOverrides: {},
    excludedNodeIds: [],
    excludedEdgeIds: [],
    groups: {},
    placements: {},
    unitPreferences: {},
  });
}
export function createHistory(
  state = createAuthoringState(),
): AuthoringHistory {
  return { present: state, past: [], future: [] };
}

export function buildWorkspace(base: AuthoringBaseline, state: AuthoringState) {
  const nodes = [
    ...base.nodes.map((node) =>
      state.nodeOverrides[node.id]
        ? { ...node, ...state.nodeOverrides[node.id] }
        : node,
    ),
    ...Object.values(state.authoredNodes),
  ];
  const edges = [
    ...base.edges.map((edge) =>
      state.edgeOverrides[edge.id]
        ? { ...edge, ...state.edgeOverrides[edge.id] }
        : edge,
    ),
    ...Object.values(state.authoredEdges),
  ];
  const units = base.units.map((unit) =>
    state.unitOverrides[unit.id]
      ? { ...unit, ...state.unitOverrides[unit.id] }
      : unit,
  );
  const excludedNodes = new Set(state.excludedNodeIds);
  const excludedEdges = new Set(state.excludedEdgeIds);
  return {
    nodes,
    edges,
    units,
    visibleNodes: nodes.filter((node) => !excludedNodes.has(node.id)),
    visibleEdges: edges.filter(
      (edge) =>
        !excludedEdges.has(edge.id) &&
        !excludedNodes.has(edge.source) &&
        !excludedNodes.has(edge.target),
    ),
  };
}

/** Matches the same explicit node:/unit: protocol used by the Markdown renderer. */
export function internalReferences(markdown: string): {
  nodeIds: string[];
  unitIds: string[];
} {
  const nodeIds = new Set<string>();
  const unitIds = new Set<string>();
  const tree = fromMarkdown(markdown, {
    extensions: [math()],
    mdastExtensions: [mathFromMarkdown()],
  });
  type MarkdownNode = {
    type: string;
    url?: string;
    identifier?: string;
    children?: MarkdownNode[];
  };
  const definitions = new Map<string, string>();
  const normalize = (id: string) =>
    id.trim().replace(/\s+/g, " ").toUpperCase().toLowerCase();
  const walk = (node: MarkdownNode, visit: (node: MarkdownNode) => void) => {
    visit(node);
    node.children?.forEach((child) => walk(child, visit));
  };
  walk(tree, (node) => {
    if (
      node.type === "definition" &&
      node.identifier &&
      node.url &&
      !definitions.has(normalize(node.identifier))
    )
      definitions.set(normalize(node.identifier), node.url);
  });
  walk(tree, (node) => {
    const url =
      node.type === "link"
        ? node.url
        : node.type === "linkReference" && node.identifier
          ? definitions.get(normalize(node.identifier))
          : undefined;
    const match = url?.match(/^(node|unit):(.*)$/i);
    if (!match) return;
    let id: string;
    try {
      id = decodeURIComponent(match[2]);
    } catch {
      throw new Error(
        "An internal Markdown link contains an invalid encoded identity.",
      );
    }
    (match[1].toLowerCase() === "node" ? nodeIds : unitIds).add(id);
  });
  return { nodeIds: [...nodeIds], unitIds: [...unitIds] };
}

/** A command is transactional: validation completes before any new state is returned. */
export function applyCommand(
  base: AuthoringBaseline,
  state: AuthoringState,
  command: AuthoringCommand,
): AuthoringState {
  // Stored records are frozen. Commands replace them rather than mutating them,
  // so retain their identities (and large embedded-image strings) across history.
  // Groups are the sole nested mutable command target: membership replaces nodeIds.
  const candidate: AuthoringState = {
    ...state,
    nodeOverrides: { ...state.nodeOverrides },
    authoredNodes: { ...state.authoredNodes },
    edgeOverrides: { ...state.edgeOverrides },
    authoredEdges: { ...state.authoredEdges },
    unitOverrides: { ...state.unitOverrides },
    excludedNodeIds: [...state.excludedNodeIds],
    excludedEdgeIds: [...state.excludedEdgeIds],
    groups: Object.fromEntries(
      Object.entries(state.groups).map(([id, group]) => [id, { ...group }]),
    ),
    placements: { ...state.placements },
    unitPreferences: { ...state.unitPreferences },
  };
  mutate(base, candidate, command);
  validateState(base, candidate);
  return equal(state, candidate) ? state : freeze(candidate);
}
export function executeCommand(
  base: AuthoringBaseline,
  history: AuthoringHistory,
  command: AuthoringCommand,
  label: string,
): AuthoringHistory {
  let before = history.present;
  // The first deliberate drag must restore its actual starting location, not a new force position.
  if (
    command.type === "placement.set" &&
    command.before &&
    !equal(before.placements[command.id], command.before)
  ) {
    validatePlacement(command.before);
    if (equal(command.before, command.placement)) return history;
    before = freeze({
      ...before,
      placements: {
        ...before.placements,
        [command.id]: structuredClone(command.before),
      },
    });
  }
  const next = applyCommand(base, before, command);
  if (next === before) return history;
  return {
    present: next,
    past: [...history.past, { label, state: before }],
    future: [],
  };
}
export function undo(history: AuthoringHistory): AuthoringHistory {
  const entry = history.past.at(-1);
  return entry
    ? {
        present: entry.state,
        past: history.past.slice(0, -1),
        future: [
          ...history.future,
          { label: entry.label, state: history.present },
        ],
      }
    : history;
}
export function redo(history: AuthoringHistory): AuthoringHistory {
  const entry = history.future.at(-1);
  return entry
    ? {
        present: entry.state,
        past: [...history.past, { label: entry.label, state: history.present }],
        future: history.future.slice(0, -1),
      }
    : history;
}

const nodeFields = new Set([
  "label",
  "latex",
  "symbol",
  "description",
  "notes",
  "sourceUrls",
  "unitIds",
  "applicableUnitIds",
  "quantityKindIds",
  "dimensionIds",
  "classification",
  "deprecated",
  "constantValues",
  "assumptions",
  "bindings",
  "constantSubtype",
  "valueStatus",
  "derivation",
]);
const edgeFields = new Set([
  "source",
  "target",
  "predicate",
  "label",
  "notes",
  "sourceUrls",
]);
const unitFields = new Set([
  "label",
  "symbol",
  "latex",
  "description",
  "notes",
  "sourceUrls",
]);
function patchFields(patch: object, allowed: Set<string>) {
  for (const key of Object.keys(patch))
    if (!allowed.has(key))
      throw new Error(
        `Cannot edit ${key}; stable identity and source provenance are preserved.`,
      );
}
/** Avoid history entries and source overrides for fields already at their original value. */
function setOverride<P extends object>(
  overrides: Record<string, P>,
  id: string,
  patch: P,
  original: object,
) {
  const next = { ...overrides[id], ...structuredClone(patch) } as Record<
    string,
    unknown
  >;
  for (const key of Object.keys(next))
    if (equal(next[key], (original as Record<string, unknown>)[key]))
      delete next[key];
  if (Object.keys(next).length) overrides[id] = next as P;
  else delete overrides[id];
}
function requireRecord<T extends { id: string }>(
  records: readonly T[],
  id: string,
  noun: string,
): T {
  const record = records.find((item) => item.id === id);
  if (!record) throw new Error(`Unknown ${noun} identity: ${id}`);
  return record;
}
function toggle(ids: string[], id: string, selected: boolean): string[] {
  return selected
    ? [...new Set([...ids, id])]
    : ids.filter((value) => value !== id);
}
function mutate(
  base: AuthoringBaseline,
  state: AuthoringState,
  command: AuthoringCommand,
): void {
  if (command.type === "compound") {
    for (const child of command.commands) mutate(base, state, child);
    return;
  }
  const current = buildWorkspace(base, state);
  const node = (id: string) => requireRecord(current.nodes, id, "node");
  const edge = (id: string) => requireRecord(current.edges, id, "relationship");
  const unit = (id: string) => requireRecord(current.units, id, "unit");
  switch (command.type) {
    case "node.create": {
      if (
        [...current.nodes, ...current.edges, ...current.units].some(
          (record) => record.id === command.node.id,
        )
      )
        throw new Error(
          `Identity ${command.node.id} already exists; create a new stable ID.`,
        );
      if (command.node.provenance.origin !== "authored")
        throw new Error("A new node must have authored provenance.");
      validateNode(command.node, true);
      state.authoredNodes[command.node.id] = structuredClone(command.node);
      syncBindings(base, state, command.node);
      break;
    }
    case "node.edit": {
      const previous = node(command.id);
      patchFields(command.patch, nodeFields);
      const next = { ...previous, ...structuredClone(command.patch) };
      guardValueUnits(previous, next);
      for (const value of next.constantValues ?? []) {
        const aliases = current.nodes.filter(
          (other) =>
            other.id !== next.id &&
            other.constantValues?.some(
              (shared) => shared.id === value.id && !equal(shared, value),
            ),
        );
        if (aliases.length)
          throw new Error(
            `This recorded value is shared with ${aliases.map((other) => `“${other.label}”`).join(", ")}. Remove this recorded value and save, then use Add recorded value to create an independent local value with its units and source. The original shared source value stays unchanged.`,
          );
      }
      validateNode(next, Boolean(state.authoredNodes[command.id]));
      if (state.authoredNodes[command.id])
        state.authoredNodes[command.id] = next;
      else
        setOverride(
          state.nodeOverrides,
          command.id,
          command.patch,
          requireRecord(base.nodes, command.id, "original node"),
        );
      if (Object.hasOwn(command.patch, "bindings"))
        syncBindings(base, state, next, previous);
      break;
    }
    case "node.reset": {
      const previous = node(command.id);
      requireRecord(base.nodes, command.id, "original node");
      delete state.nodeOverrides[command.id];
      syncBindings(
        base,
        state,
        requireRecord(base.nodes, command.id, "original node"),
        previous,
      );
      break;
    }
    case "node.exclude":
      node(command.id);
      state.excludedNodeIds = toggle(
        state.excludedNodeIds,
        command.id,
        command.excluded,
      );
      break;
    case "node.delete": {
      const deleting = node(command.id);
      if (!state.authoredNodes[command.id])
        throw new Error(
          "Source nodes are preserved. Exclude this node instead; it can be restored later.",
        );
      const owners = [
        ...current.nodes.filter(
          (record) =>
            record.id !== command.id &&
            (record.bindings?.some(
              (binding) => binding.nodeId === command.id,
            ) ||
              record.quantityKindIds.includes(command.id) ||
              internalReferences(record.notes ?? "").nodeIds.includes(
                command.id,
              )),
        ),
        ...current.units.filter(
          (record) =>
            record.quantityKindIds.includes(command.id) ||
            internalReferences(record.notes ?? "").nodeIds.includes(command.id),
        ),
        ...current.edges.filter(
          (record) =>
            (!state.authoredEdges[record.id] &&
              (record.source === command.id || record.target === command.id)) ||
            (record.source !== command.id &&
              record.target !== command.id &&
              internalReferences(record.notes ?? "").nodeIds.includes(
                command.id,
              )),
        ),
      ];
      if (owners.length)
        throw new Error(
          `Cannot delete “${deleting.label}”: referenced by ${owners.map((record) => `“${record.label}”`).join(", ")}. Remove its equation bindings, quantity references, source relationship endpoints, or internal note links first; exclusion keeps these references intact.`,
        );
      delete state.authoredNodes[command.id];
      delete state.placements[command.id];
      delete state.unitPreferences[command.id];
      state.excludedNodeIds = state.excludedNodeIds.filter(
        (id) => id !== command.id,
      );
      for (const [id, relationship] of Object.entries(state.authoredEdges))
        if (
          relationship.source === command.id ||
          relationship.target === command.id
        ) {
          delete state.authoredEdges[id];
          state.excludedEdgeIds = state.excludedEdgeIds.filter(
            (value) => value !== id,
          );
        }
      for (const group of Object.values(state.groups))
        group.nodeIds = group.nodeIds.filter((id) => id !== command.id);
      break;
    }
    case "edge.create":
      if (
        [...current.nodes, ...current.edges, ...current.units].some(
          (record) => record.id === command.edge.id,
        )
      )
        throw new Error(`Identity ${command.edge.id} already exists.`);
      if (command.edge.provenance.origin !== "authored")
        throw new Error("A new relationship must have authored provenance.");
      validateEdge(command.edge);
      state.authoredEdges[command.edge.id] = structuredClone(command.edge);
      break;
    case "edge.edit": {
      const previous = edge(command.id);
      patchFields(command.patch, edgeFields);
      const next = { ...previous, ...structuredClone(command.patch) };
      validateEdge(next);
      if (state.authoredEdges[command.id])
        state.authoredEdges[command.id] = next;
      else
        setOverride(
          state.edgeOverrides,
          command.id,
          command.patch,
          requireRecord(base.edges, command.id, "original relationship"),
        );
      break;
    }
    case "edge.reset":
      requireRecord(base.edges, command.id, "original relationship");
      delete state.edgeOverrides[command.id];
      break;
    case "edge.exclude":
      edge(command.id);
      state.excludedEdgeIds = toggle(
        state.excludedEdgeIds,
        command.id,
        command.excluded,
      );
      break;
    case "edge.delete":
      edge(command.id);
      if (!state.authoredEdges[command.id])
        throw new Error(
          "Source relationships are preserved. Exclude this relationship instead.",
        );
      delete state.authoredEdges[command.id];
      state.excludedEdgeIds = state.excludedEdgeIds.filter(
        (id) => id !== command.id,
      );
      break;
    case "unit.edit": {
      const previous = unit(command.id);
      patchFields(command.patch, unitFields);
      const next = { ...previous, ...command.patch };
      text(next.label, "Unit name");
      setOverride(
        state.unitOverrides,
        command.id,
        command.patch,
        requireRecord(base.units, command.id, "original unit"),
      );
      break;
    }
    case "unit.reset":
      unit(command.id);
      delete state.unitOverrides[command.id];
      break;
    case "group.put": {
      text(command.group.id, "Group identity");
      text(command.group.name, "Group name");
      if (!/^#[0-9a-f]{6}$/i.test(command.group.color))
        throw new Error("Group color must be a six-digit hex color.");
      state.groups[command.group.id] = {
        ...structuredClone(command.group),
        nodeIds: [...new Set(command.group.nodeIds)],
      };
      break;
    }
    case "group.delete":
      delete state.groups[command.id];
      break;
    case "group.members": {
      const group = state.groups[command.id];
      if (!group) throw new Error("This group no longer exists.");
      group.nodeIds = [...new Set(command.nodeIds)];
      break;
    }
    case "placement.set":
      node(command.id);
      validatePlacement(command.placement);
      state.placements[command.id] = structuredClone(command.placement);
      break;
    case "placement.reset":
      node(command.id);
      delete state.placements[command.id];
      break;
    case "preference.set": {
      const result = validateUnitPreference(
        node(command.id),
        command.unitId,
        current.units,
      );
      if (!result.valid) throw new Error(result.reason);
      state.unitPreferences[command.id] = command.unitId;
      break;
    }
    case "preference.reset":
      node(command.id);
      delete state.unitPreferences[command.id];
      break;
  }
}

const participant = "urn:hvacr:relationship:equation-participation";
function bindingPrefix(id: string) {
  return `${id}:binding:`;
}
function syncBindings(
  base: AuthoringBaseline,
  state: AuthoringState,
  node: LearningNode,
  previous?: LearningNode,
) {
  if (node.kind !== "equation") return;
  const desired = new Set(
    node.bindings?.map((binding) => binding.nodeId) ?? [],
  );
  const existing = new Set(
    previous?.bindings?.map((binding) => binding.nodeId) ?? [],
  );
  const prefix = bindingPrefix(node.id);
  for (const [id, edge] of Object.entries(state.authoredEdges))
    if (
      id.startsWith(prefix) &&
      edge.source === node.id &&
      !desired.has(edge.target)
    ) {
      delete state.authoredEdges[id];
      state.excludedEdgeIds = state.excludedEdgeIds.filter(
        (value) => value !== id,
      );
    }
  for (const edge of base.edges.filter(
    (edge) => edge.source === node.id && edge.predicate === participant,
  ))
    if (desired.has(edge.target) !== existing.has(edge.target))
      state.excludedEdgeIds = toggle(
        state.excludedEdgeIds,
        edge.id,
        !desired.has(edge.target),
      );
  const current = buildWorkspace(base, state);
  for (const target of desired) {
    if (existing.has(target)) continue;
    if (
      current.edges.some(
        (edge) =>
          edge.source === node.id &&
          edge.target === target &&
          edge.predicate === participant &&
          !state.excludedEdgeIds.includes(edge.id),
      )
    )
      continue;
    const id = `${prefix}${encodeURIComponent(target)}`;
    if (
      [...current.nodes, ...current.units, ...current.edges].some(
        (record) => record.id === id,
      )
    )
      throw new Error(
        `Generated binding relationship conflicts with identity ${id}. Restore or rename the conflicting authored relationship.`,
      );
    state.authoredEdges[id] = {
      id,
      source: node.id,
      target,
      predicate: participant,
      label: "equation participant",
      provenance: {
        origin: "authored",
        sourceId: id,
        sourceUrl: node.sourceUrls?.[0] || node.provenance.sourceUrl,
      },
    };
  }
}

function validateState(base: AuthoringBaseline, state: AuthoringState) {
  const current = buildWorkspace(base, state);
  validateGraphReferences(current.nodes, current.edges, current.units);
  const nodeIds = new Set(current.nodes.map((node) => node.id));
  const unitIds = new Set(current.units.map((unit) => unit.id));
  for (const record of [
    ...Object.values(state.authoredNodes),
    ...Object.keys(state.nodeOverrides).map((id) =>
      requireRecord(current.nodes, id, "node"),
    ),
    ...Object.keys(state.unitOverrides).map((id) =>
      requireRecord(current.units, id, "unit"),
    ),
    ...Object.values(state.authoredEdges),
    ...Object.keys(state.edgeOverrides).map((id) =>
      requireRecord(current.edges, id, "relationship"),
    ),
  ]) {
    const references = internalReferences(record.notes ?? "");
    for (const id of references.nodeIds)
      if (!nodeIds.has(id))
        throw new Error(
          `“${record.label}” has an internal note link to unknown node ${id}.`,
        );
    for (const id of references.unitIds)
      if (!unitIds.has(id))
        throw new Error(
          `“${record.label}” has an internal note link to unknown unit ${id}.`,
        );
    if (record.sourceUrls)
      urls(record.sourceUrls, `Sources for “${record.label}”`);
  }
  for (const group of Object.values(state.groups))
    for (const id of group.nodeIds)
      if (!nodeIds.has(id))
        throw new Error(
          `Group “${group.name}” refers to an unknown node ${id}.`,
        );
}
function guardValueUnits(before: LearningNode, after: LearningNode) {
  for (const [index, previous] of (before.constantValues ?? []).entries()) {
    const next =
      after.constantValues?.find((value) => value.id === previous.id) ??
      after.constantValues?.[index];
    if (
      previous.value?.trim() &&
      next?.value?.trim() &&
      !equal(previous.unitIds, next.unitIds)
    )
      throw new Error(
        "Numerical unit conversion is unavailable. Clear the recorded value and save before entering an independently verified value with different units and its source/context. Renaming a unit label does not convert a value.",
      );
  }
}
function validateNode(node: LearningNode, authored: boolean) {
  text(node.id, "Node identity");
  text(node.label, "Node name");
  if (!["quantity", "equation", "constant"].includes(node.kind))
    throw new Error("Choose quantity, equation, or constant as the node kind.");
  for (const [name, values] of Object.entries({
    unitIds: node.unitIds,
    applicableUnitIds: node.applicableUnitIds,
    quantityKindIds: node.quantityKindIds,
    dimensionIds: node.dimensionIds,
    sourceTypes: node.sourceTypes,
  }))
    strings(values, name);
  for (const name of [
    "latex",
    "symbol",
    "description",
    "notes",
    "constantSubtype",
    "derivation",
  ] as const)
    if (node[name] !== undefined && typeof node[name] !== "string")
      throw new Error(`${name} must be text.`);
  if (node.sourceUrls) urls(node.sourceUrls, "Node sources");
  if (node.assumptions) strings(node.assumptions, "Assumptions");
  if (node.classification) {
    text(node.classification.kind, "Classification kind");
    text(node.classification.rationale, "Classification rationale");
    if (!["reviewed", "review-needed"].includes(node.classification.status))
      throw new Error(
        "Classification status must be reviewed or review-needed.",
      );
    urls(node.classification.sourceUrls, "Classification sources");
    if (
      node.classification.status === "reviewed" &&
      !node.classification.sourceUrls.length
    )
      throw new Error("A reviewed classification needs a source.");
  }
  for (const binding of node.bindings ?? []) {
    text(binding.symbol, "Binding symbol");
    text(binding.nodeId, "Binding node identity");
  }
  for (const value of node.constantValues ?? []) {
    text(value.id, "Constant value identity");
    strings(value.unitIds, "Constant value units");
    urls(value.sourceUrls, "Constant value sources");
    if (
      value.value !== undefined &&
      value.value.trim() &&
      !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(
        value.value.trim(),
      )
    )
      throw new Error(
        "A recorded value must be a decimal number, optionally with an exponent; put explanatory notation in LaTeX or notes.",
      );
    if (value.value?.trim() && !value.unitIds.length)
      throw new Error(
        "A recorded constant value needs exact units; use the dimensionless unit identity when appropriate.",
      );
  }
  if (authored && node.kind === "constant") {
    text(node.constantSubtype, "Constant subtype");
    if (
      !node.valueStatus ||
      !["exact", "rounded", "assumed"].includes(node.valueStatus)
    )
      throw new Error(
        "Choose exact, rounded, or assumed status for the constant.",
      );
    if (!node.assumptions?.length)
      throw new Error(
        "A contextual constant needs at least one condition or assumption.",
      );
    if (!(
      node.sourceUrls?.length ||
      node.constantValues?.some((value) => value.sourceUrls.length)
    ))
      throw new Error(
        "A contextual constant needs a source URL, recorded separately from its bare number.",
      );
  }
}
function validateEdge(edge: GraphEdge) {
  for (const [name, value] of Object.entries({
    identity: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.predicate,
    label: edge.label,
  }))
    text(value, `Relationship ${name}`);
  if (edge.sourceUrls) urls(edge.sourceUrls, "Relationship sources");
}
function validatePlacement(placement: Placement) {
  if (
    !Number.isFinite(placement.x) ||
    !Number.isFinite(placement.y) ||
    typeof placement.pinned !== "boolean"
  )
    throw new Error(
      "Manual placement needs finite x/y coordinates and a pin state.",
    );
}
function text(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${name} must not be empty.`);
}
function strings(values: unknown, name: string): asserts values is string[] {
  if (!Array.isArray(values)) throw new Error(`${name} must be a list.`);
  for (const value of values) text(value, name);
}
function urls(values: string[], name: string) {
  strings(values, name);
  for (const value of values) {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`${name} must contain complete http(s) URLs.`);
    }
    if (!["https:", "http:"].includes(parsed.protocol))
      throw new Error(`${name} must contain http(s) URLs.`);
  }
}
function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every(
    (key) =>
      Object.hasOwn(b, key) &&
      equal(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
  );
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}
