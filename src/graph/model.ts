export interface ViewNode {
  id: string;
  label: string;
  kind: "quantity" | "constant" | "equation";
  latex?: string;
  authored?: boolean;
}
export interface ViewEdge {
  id: string;
  source: string;
  target: string;
}
export function nodeRadii(nodes: ViewNode[], edges: ViewEdge[]): number[] {
  const neighbours = new Map(nodes.map((n) => [n.id, new Set<string>()]));
  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    neighbours.get(edge.source)?.add(edge.target);
    neighbours.get(edge.target)?.add(edge.source);
  }
  return nodes.map(
    (n) => 4 + Math.min(6, Math.sqrt(neighbours.get(n.id)?.size || 0)),
  );
}
