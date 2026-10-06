/// <reference lib="webworker" />
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCollide,
  forceX,
  forceY,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";

const scope = self as unknown as DedicatedWorkerGlobalScope;

interface LayoutNode extends SimulationNodeDatum {
  id: string;
  radius: number;
}
type Link = SimulationLinkDatum<LayoutNode>;
let nodes: LayoutNode[] = [];
let simulation: ReturnType<typeof forceSimulation<LayoutNode>> | undefined;
let ticks = 0;
let started = 0;
function publish() {
  const positions = new Float32Array(nodes.length * 2);
  nodes.forEach((node, i) => {
    positions[i * 2] = node.x || 0;
    positions[i * 2 + 1] = node.y || 0;
  });
  scope.postMessage(
    {
      positions,
      ticks,
      elapsedMs: performance.now() - started,
      alpha: simulation?.alpha() ?? 0,
    },
    [positions.buffer],
  );
}
scope.onmessage = ({ data }) => {
  if (data.type === "init") {
    simulation?.stop();
    nodes = data.nodes;
    ticks = 0;
    started = performance.now();
    // Multiple source predicates between a pair remain separate domain edges,
    // but contribute just one equally weighted spring to this visual layout.
    const pairs = new Map<string, Link>();
    for (const link of data.links as { source: string; target: string }[]) {
      if (link.source !== link.target) {
        pairs.set(JSON.stringify([link.source, link.target].sort()), link);
      }
    }
    const links = [...pairs.values()];
    simulation = forceSimulation(nodes)
      .force(
        "link",
        forceLink<LayoutNode, Link>(links)
          .id((n) => n.id)
          .distance(40)
          .strength(0.12),
      )
      .force("charge", forceManyBody().strength(-24).theta(0.9))
      .force(
        "collision",
        forceCollide<LayoutNode>()
          .radius((n) => n.radius + 3)
          .iterations(1),
      )
      .force("x", forceX().strength(0.014))
      .force("y", forceY().strength(0.014))
      .alphaDecay(0.025)
      .on("tick", () => {
        ticks++;
        if (ticks % 4 === 0) publish();
      })
      .on("end", publish);
    publish();
  } else if (data.type === "pause") {
    simulation?.stop();
    publish();
  } else if (data.type === "resume") simulation?.alpha(0.35).restart();
  else if (data.type === "pin") {
    const node = nodes[data.index];
    if (!node) return;
    node.fx = data.x;
    node.fy = data.y;
    if (data.x != null) {
      node.x = data.x;
      node.y = data.y;
    }
    publish();
    if (!data.paused) simulation?.alpha(0.15).restart();
  }
};
