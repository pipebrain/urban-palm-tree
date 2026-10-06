export interface ViewNode {
  id: string;
  label: string;
  kind: "quantity" | "constant" | "equation";
  classificationKind?: string;
  latex?: string;
  authored?: boolean;
  color?: string;
  groupCount?: number;
}
export interface ViewEdge {
  id: string;
  source: string;
  target: string;
}
export interface Position {
  x: number;
  y: number;
}
export interface ManualPlacement extends Position {
  pinned: boolean;
}

// Group order is the explicit primary-colour rule. Overlapping membership is
// retained independently of the one fill colour a node can display.
export function groupStyles(
  groups: readonly { color: string; nodeIds: readonly string[] }[],
): Map<string, { color: string; groupCount: number }> {
  const styles = new Map<string, { color: string; groupCount: number }>();
  for (const group of groups)
    for (const id of new Set(group.nodeIds)) {
      const style = styles.get(id);
      if (style) style.groupCount++;
      else styles.set(id, { color: group.color, groupCount: 1 });
    }
  return styles;
}

// Only visible learning neighbours affect graph weight. Unit references,
// duplicate predicates, reverse assertions and self-links add no extra weight.
export function visibleNeighbourCounts(
  nodes: ViewNode[],
  edges: ViewEdge[],
): number[] {
  const neighbours = new Map(nodes.map((n) => [n.id, new Set<string>()]));
  for (const edge of edges) {
    if (
      edge.source === edge.target ||
      !neighbours.has(edge.source) ||
      !neighbours.has(edge.target)
    )
      continue;
    neighbours.get(edge.source)!.add(edge.target);
    neighbours.get(edge.target)!.add(edge.source);
  }
  return nodes.map((n) => neighbours.get(n.id)!.size);
}

export function nodeRadii(nodes: ViewNode[], edges: ViewEdge[]): number[] {
  return visibleNeighbourCounts(nodes, edges).map(
    (degree) => 4 + Math.min(6, Math.sqrt(degree)),
  );
}

// Semantic edges remain independent records; a visible pair gets one spring.
export function layoutLinks(
  nodes: ViewNode[],
  edges: ViewEdge[],
): { source: string; target: string }[] {
  const visible = new Set(nodes.map((n) => n.id));
  const pairs = new Map<string, { source: string; target: string }>();
  for (const edge of edges) {
    if (
      edge.source === edge.target ||
      !visible.has(edge.source) ||
      !visible.has(edge.target)
    )
      continue;
    const pair = [edge.source, edge.target].sort();
    pairs.set(JSON.stringify(pair), { source: pair[0], target: pair[1] });
  }
  return [...pairs.values()].sort(
    (a, b) =>
      a.source.localeCompare(b.source) || a.target.localeCompare(b.target),
  );
}

export function initialLayoutNodes(
  nodes: ViewNode[],
  radii: number[],
  positions: ReadonlyMap<string, Position>,
  pins: ReadonlySet<string>,
) {
  return nodes.map((node, i) => {
    const cached = positions.get(node.id);
    // Same seed as d3-force's initial phyllotaxis, with an explicit position
    // available even while a worker is starting or unavailable.
    const radius = 10 * Math.sqrt(0.5 + i);
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    const x = cached?.x ?? radius * Math.cos(angle);
    const y = cached?.y ?? radius * Math.sin(angle);
    return {
      id: node.id,
      radius: radii[i],
      x,
      y,
      fx: pins.has(node.id) ? x : null,
      fy: pins.has(node.id) ? y : null,
    };
  });
}
