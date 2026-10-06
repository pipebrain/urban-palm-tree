import type { GraphEdge, LearningNode, UnitReference } from "./types.ts";
import { validateGraphReferences } from "./validation.ts";

export interface GraphIndex {
  nodesById: Map<string, LearningNode>;
  unitsById: Map<string, UnitReference>;
  edgesById: Map<string, GraphEdge>;
  outgoing: Map<string, GraphEdge[]>;
  incoming: Map<string, GraphEdge[]>;
  /** Distinct undirected learning neighbours; units and bindings add no weight. */
  neighbors: Map<string, Set<string>>;
  unitUseBacklinks: Map<string, LearningNode[]>;
  unitApplicableBacklinks: Map<string, LearningNode[]>;
}

export function buildGraphIndex(
  nodes: readonly LearningNode[],
  edges: readonly GraphEdge[],
  units: readonly UnitReference[],
): GraphIndex {
  validateGraphReferences(nodes, edges, units);
  const index: GraphIndex = {
    nodesById: new Map(nodes.map((node) => [node.id, node])),
    unitsById: new Map(units.map((unit) => [unit.id, unit])),
    edgesById: new Map(edges.map((edge) => [edge.id, edge])),
    outgoing: new Map(nodes.map((node) => [node.id, []])),
    incoming: new Map(nodes.map((node) => [node.id, []])),
    neighbors: new Map(nodes.map((node) => [node.id, new Set<string>()])),
    unitUseBacklinks: new Map(units.map((unit) => [unit.id, []])),
    unitApplicableBacklinks: new Map(units.map((unit) => [unit.id, []])),
  };
  for (const edge of edges) {
    index.outgoing.get(edge.source)!.push(edge);
    index.incoming.get(edge.target)!.push(edge);
    if (edge.source !== edge.target) {
      index.neighbors.get(edge.source)!.add(edge.target);
      index.neighbors.get(edge.target)!.add(edge.source);
    }
  }
  for (const node of nodes) {
    const usedUnits = new Set([
      ...node.unitIds,
      ...(node.constantValues?.flatMap((value) => value.unitIds) ?? []),
      ...(node.bindings?.flatMap((binding) =>
        binding.unitId ? [binding.unitId] : [],
      ) ?? []),
    ]);
    for (const unitId of usedUnits)
      index.unitUseBacklinks.get(unitId)!.push(node);
    for (const unitId of new Set(node.applicableUnitIds))
      index.unitApplicableBacklinks.get(unitId)!.push(node);
  }
  return index;
}

export type DisplayOverride = { label?: string; latex?: string };
export type DisplayOverrides = Record<string, DisplayOverride>;

/** Apply only presentation fields; imported records and semantic IDs stay intact. */
export function applyDisplayOverrides(
  baseNodes: readonly LearningNode[],
  overrides: DisplayOverrides,
): LearningNode[] {
  const available = new Set(baseNodes.map((node) => node.id));
  for (const [id, override] of Object.entries(overrides)) {
    if (!available.has(id))
      throw new Error(`Display override refers to unknown node ID ${id}`);
    if (!override || typeof override !== "object" || Array.isArray(override))
      throw new Error(`Display override for ${id} must be an object`);
    for (const field of Object.keys(override)) {
      if (field !== "label" && field !== "latex")
        throw new Error(`Display override for ${id} cannot change ${field}`);
    }
    if (
      override.label !== undefined &&
      (typeof override.label !== "string" || !override.label.trim())
    )
      throw new Error(
        `Display override label for ${id} must be a non-empty string`,
      );
    if (override.latex !== undefined && typeof override.latex !== "string")
      throw new Error(`Display override LaTeX for ${id} must be a string`);
  }
  return baseNodes.map((node) => {
    const override = Object.hasOwn(overrides, node.id)
      ? overrides[node.id]
      : undefined;
    if (!override) return node;
    return {
      ...node,
      ...(override.label !== undefined ? { label: override.label } : {}),
      ...(override.latex !== undefined ? { latex: override.latex } : {}),
    };
  });
}

export type RelationshipKind =
  | "specialization"
  | "broader"
  | "organization"
  | "quantity-kind"
  | "derivation"
  | "conceptual"
  | "equation-participation"
  | "assumed-value"
  | "other";
export interface RelationshipMeaning {
  kind: RelationshipKind;
  label: string;
  description: string;
}

const relationshipMeanings: Record<string, RelationshipMeaning> = {
  "http://qudt.org/schema/qudt/specializationOf": {
    kind: "specialization",
    label: "specialization of",
    description:
      "The source is asserted to be more specific than the target and commensurable with it. The record's provenance identifies who made this assertion; it is not a calculation dependency.",
  },
  "http://www.w3.org/2004/02/skos/core#broader": {
    kind: "broader",
    label: "has broader concept",
    description:
      "The target is broader in the source vocabulary. A broader-concept assertion does not by itself establish physical causation.",
  },
  "http://qudt.org/schema/qudt/organizedUnder": {
    kind: "organization",
    label: "organized under",
    description:
      "The source is organized beneath the target without asserting interchangeable quantities or inherited units. This organizational link does not imply a physical law.",
  },
  "http://qudt.org/schema/qudt/hasQuantityKind": {
    kind: "quantity-kind",
    label: "has quantity kind",
    description:
      "The target identifies the kind of quantity represented by the source.",
  },
  "http://www.w3.org/ns/prov#wasDerivedFrom": {
    kind: "derivation",
    label: "derived from",
    description:
      "The source records derivation from the target. This provenance assertion is not automatically an executable equation.",
  },
  "http://www.w3.org/2004/02/skos/core#related": {
    kind: "conceptual",
    label: "related concept",
    description:
      "An associative concept link from the source vocabulary; no causal or solve direction is asserted.",
  },
  "urn:hvacr:relationship:equation-participation": {
    kind: "equation-participation",
    label: "equation participant",
    description:
      "This concept participates in the equation through an explicit binding. The arrow identifies membership, not a fixed input or output.",
  },
  "urn:hvacr:relationship:assumed-value": {
    kind: "assumed-value",
    label: "assumed value for",
    description:
      "The source is an adopted value for the target quantity under recorded assumptions.",
  },
  "urn:hvacr:relationship:derivation": {
    kind: "derivation",
    label: "derived from",
    description:
      "An authored derivation relationship, with its own source and assumptions.",
  },
  "urn:hvacr:relationship:conceptual": {
    kind: "conceptual",
    label: "related concept",
    description:
      "An authored conceptual relationship; its rationale comes from its recorded provenance.",
  },
};

export function describeRelationship(edge: GraphEdge): RelationshipMeaning {
  return Object.hasOwn(relationshipMeanings, edge.predicate)
    ? relationshipMeanings[edge.predicate]
    : {
        kind: "other",
        label: edge.label,
        description:
          "Unrecognized relationship type; the original predicate and provenance are retained for review.",
      };
}
