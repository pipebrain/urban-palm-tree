import type { GraphEdge, LearningNode } from "./types";

export interface MapFilters {
  kind: "all" | LearningNode["kind"];
  classification: string;
  origin: "all" | "qudt" | "authored";
  predicate: string;
  includeDeprecated: boolean;
  focus?: { id: string; depth: 1 | 2 };
}
export const defaultFilters: MapFilters = {
  kind: "all",
  classification: "all",
  origin: "all",
  predicate: "all",
  includeDeprecated: true,
};

/** A reversible projection. Only explicit edges establish neighbourhoods. */
export function browseGraph(
  nodes: readonly LearningNode[],
  edges: readonly GraphEdge[],
  filters: MapFilters,
) {
  let visibleNodes = nodes.filter(
    (n) =>
      (filters.kind === "all" || n.kind === filters.kind) &&
      (filters.origin === "all" || n.provenance.origin === filters.origin) &&
      (filters.classification === "all" ||
        (filters.classification === "unreviewed"
          ? n.kind === "quantity" && n.classification?.status !== "reviewed"
          : n.kind === "quantity" &&
            n.classification?.kind === filters.classification)) &&
      (filters.includeDeprecated || !n.deprecated),
  );
  const allowed = new Set(visibleNodes.map((n) => n.id));
  let visibleEdges = edges.filter(
    (e) =>
      allowed.has(e.source) &&
      allowed.has(e.target) &&
      (filters.predicate === "all" || e.predicate === filters.predicate),
  );
  if (filters.focus) {
    const adjacent = new Map<string, Set<string>>();
    for (const edge of visibleEdges) {
      if (!adjacent.has(edge.source)) adjacent.set(edge.source, new Set());
      if (!adjacent.has(edge.target)) adjacent.set(edge.target, new Set());
      adjacent.get(edge.source)!.add(edge.target);
      adjacent.get(edge.target)!.add(edge.source);
    }
    const found = new Set<string>();
    let frontier = allowed.has(filters.focus.id) ? [filters.focus.id] : [];
    frontier.forEach((id) => found.add(id));
    for (let depth = 0; depth < filters.focus.depth; depth++) {
      const next: string[] = [];
      for (const id of frontier)
        for (const other of adjacent.get(id) || []) {
          if (!found.has(other)) {
            found.add(other);
            next.push(other);
          }
        }
      frontier = next;
    }
    visibleNodes = visibleNodes.filter((n) => found.has(n.id));
    visibleEdges = visibleEdges.filter(
      (e) => found.has(e.source) && found.has(e.target),
    );
  }
  return { nodes: visibleNodes, edges: visibleEdges };
}

export function matchesSearch(
  record: { id: string; label: string; symbol?: string; latex?: string },
  query: string,
) {
  const haystack =
    `${record.label} ${record.symbol || ""} ${record.latex || ""} ${record.id}`.toLocaleLowerCase();
  return query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}
