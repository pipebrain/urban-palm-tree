import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MathText } from "../components/Math";
import { nodeRadii, type ViewNode, type ViewEdge } from "./model";

type Camera = { x: number; y: number; k: number };
type Label = { node: ViewNode; x: number; y: number };
export function Graph({
  nodes,
  edges,
  selectedId,
  onSelect,
}: {
  nodes: ViewNode[];
  edges: ViewEdge[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const worker = useRef<Worker | null>(null);
  const positions = useRef(new Float32Array());
  const camera = useRef<Camera>({ x: 0, y: 0, k: 1 });
  const autoFit = useRef(true);
  const size = useRef({ w: 1, h: 1 });
  const pending = useRef(0);
  const selected = useRef(selectedId);
  selected.current = selectedId;
  const pinned = useRef(new Set<number>());
  const [pinRevision, setPinRevision] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [labels, setLabels] = useState<Label[]>([]);
  const [stats, setStats] = useState({
    ticks: 0,
    elapsedMs: 0,
    alpha: 1,
    drawMs: 0,
  });
  const lastMetric = useRef(0);
  const indices = useMemo(
    () => new Map(nodes.map((n, i) => [n.id, i])),
    [nodes],
  );
  const radii = useMemo(() => nodeRadii(nodes, edges), [nodes, edges]);
  const links = useMemo(
    () =>
      edges
        .map((e) => [indices.get(e.source)!, indices.get(e.target)!])
        .filter((e) => e.every((i) => i !== undefined)),
    [edges, indices],
  );
  const draw = useCallback(() => {
    pending.current = 0;
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || positions.current.length !== nodes.length * 2) return;
    const start = performance.now();
    const { w, h } = size.current;
    const { x, y, k } = camera.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.translate(w / 2 + x, h / 2 + y);
    ctx.scale(k, k);
    ctx.lineWidth = 0.6 / k;
    ctx.strokeStyle = "#bed0c5";
    ctx.beginPath();
    for (const [a, b] of links) {
      ctx.moveTo(positions.current[a * 2], positions.current[a * 2 + 1]);
      ctx.lineTo(positions.current[b * 2], positions.current[b * 2 + 1]);
    }
    ctx.stroke();
    const chosen = indices.get(selected.current || "");
    if (chosen !== undefined) {
      ctx.strokeStyle = "#a76035";
      ctx.lineWidth = 1.5 / k;
      ctx.beginPath();
      for (const [a, b] of links)
        if (a === chosen || b === chosen) {
          ctx.moveTo(positions.current[a * 2], positions.current[a * 2 + 1]);
          ctx.lineTo(positions.current[b * 2], positions.current[b * 2 + 1]);
        }
      ctx.stroke();
    }
    const visibleLabels: Label[] = [];
    let renderedNodes = 0;
    // All shapes remain in the graph. Only HTML labels have a bounded detail budget.
    const order =
      chosen === undefined
        ? nodes.map((_, i) => i)
        : [chosen, ...nodes.map((_, i) => i).filter((i) => i !== chosen)];
    for (const i of order) {
      const node = nodes[i];
      const px = positions.current[i * 2];
      const py = positions.current[i * 2 + 1];
      const sx = w / 2 + x + px * k;
      const sy = h / 2 + y + py * k;
      if (sx < -30 || sy < -30 || sx > w + 30 || sy > h + 30) continue;
      renderedNodes++;
      const r = radii[i];
      ctx.beginPath();
      if (node.kind === "constant") {
        ctx.moveTo(px, py - r);
        ctx.lineTo(px + r, py);
        ctx.lineTo(px, py + r);
        ctx.lineTo(px - r, py);
        ctx.closePath();
      } else if (node.kind === "equation")
        ctx.roundRect(px - r * 1.5, py - r, r * 3, r * 2, 3);
      else ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = node.authored
        ? "#c17c45"
        : node.kind === "constant"
          ? "#75879b"
          : "#438570";
      ctx.fill();
      if (i === chosen || pinned.current.has(i)) {
        ctx.lineWidth = (i === chosen ? 2.8 : 1.6) / k;
        ctx.strokeStyle = i === chosen ? "#172f27" : "#8d4727";
        ctx.stroke();
      }
      if (
        visibleLabels.length < 60 &&
        (i === chosen ||
          (k > 2.1 && sx > 80 && sx < w - 80 && sy > 20 && sy < h - 45))
      ) {
        if (
          i === chosen ||
          !visibleLabels.some(
            (l) => Math.abs(l.x - sx) < 145 && Math.abs(l.y - sy) < 46,
          )
        )
          visibleLabels.push({ node, x: sx, y: sy + r * k + 4 });
      }
    }
    setLabels(visibleLabels);
    container.current?.setAttribute("data-zoom", k.toFixed(3));
    container.current?.setAttribute("data-pins", String(pinned.current.size));
    container.current?.setAttribute(
      "data-rendered-nodes",
      String(renderedNodes),
    );
    container.current?.setAttribute("data-camera-x", x.toFixed(2));
    container.current?.setAttribute("data-camera-y", y.toFixed(2));
    if (chosen !== undefined) {
      container.current?.setAttribute(
        "data-selected-x",
        String(w / 2 + x + positions.current[chosen * 2] * k),
      );
      container.current?.setAttribute(
        "data-selected-y",
        String(h / 2 + y + positions.current[chosen * 2 + 1] * k),
      );
    }
    if (performance.now() - lastMetric.current > 800) {
      const drawMs = performance.now() - start;
      lastMetric.current = performance.now();
      setStats((s) => ({ ...s, drawMs }));
    }
  }, [indices, links, nodes, radii]);
  const schedule = useCallback(() => {
    if (!pending.current) pending.current = requestAnimationFrame(draw);
  }, [draw]);
  const fit = useCallback(() => {
    const p = positions.current;
    if (!p.length) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (let i = 0; i < p.length; i += 2) {
      minX = Math.min(minX, p[i]);
      maxX = Math.max(maxX, p[i]);
      minY = Math.min(minY, p[i + 1]);
      maxY = Math.max(maxY, p[i + 1]);
    }
    const k = Math.min(
      (size.current.w - 80) / (maxX - minX + 30),
      (size.current.h - 100) / (maxY - minY + 30),
      3,
    );
    camera.current = {
      x: (-(minX + maxX) / 2) * k,
      y: (-(minY + maxY) / 2) * k,
      k: Math.max(0.08, k),
    };
    schedule();
  }, [schedule]);
  const scheduleRef = useRef(schedule);
  scheduleRef.current = schedule;
  const fitRef = useRef(fit);
  fitRef.current = fit;
  // Display edits must not recreate the simulation or lose manual pins/pause.
  const topologyKey = JSON.stringify([
    nodes.map((n) => n.id),
    edges.map((e) => [e.source, e.target]),
  ]);
  useEffect(() => {
    const w = new Worker(new URL("./layout.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    let first = true;
    w.onmessage = ({ data }) => {
      positions.current = data.positions;
      setStats((s) => ({
        ...s,
        ticks: data.ticks,
        elapsedMs: data.elapsedMs,
        alpha: data.alpha,
      }));
      if (first || autoFit.current) {
        fitRef.current();
        first = false;
      } else scheduleRef.current();
    };
    w.postMessage({
      type: "init",
      nodes: nodes.map((n, i) => ({ id: n.id, radius: radii[i] })),
      links: edges.map((e) => ({ source: e.source, target: e.target })),
    });
    return () => {
      w.terminate();
      if (pending.current) cancelAnimationFrame(pending.current);
      pending.current = 0;
    };
  }, [topologyKey]);
  useEffect(() => {
    schedule();
  }, [schedule]);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      size.current = {
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      };
      if (canvas.current) {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        canvas.current.width = size.current.w * dpr;
        canvas.current.height = size.current.h * dpr;
      }
      schedule();
    });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, [schedule]);
  useEffect(() => {
    const i = indices.get(selectedId || "");
    if (i !== undefined && positions.current.length) {
      autoFit.current = false;
      camera.current = {
        x: -positions.current[i * 2] * 2.8,
        y: -positions.current[i * 2 + 1] * 2.8,
        k: 2.8,
      };
      scheduleRef.current();
    }
  }, [selectedId, topologyKey]);
  const zoomAt = useCallback(
    (factor: number, sx = size.current.w / 2, sy = size.current.h / 2) => {
      autoFit.current = false;
      const c = camera.current;
      const k = Math.max(0.08, Math.min(9, c.k * factor));
      const f = k / c.k;
      camera.current = {
        k,
        x: (c.x - (sx - size.current.w / 2)) * f + (sx - size.current.w / 2),
        y: (c.y - (sy - size.current.h / 2)) * f + (sy - size.current.h / 2),
      };
      schedule();
    },
    [schedule],
  );
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(
        Math.exp(-e.deltaY * 0.0015),
        e.clientX - r.left,
        e.clientY - r.top,
      );
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [zoomAt]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<
    | {
        startX: number;
        startY: number;
        lastX: number;
        lastY: number;
        node?: number;
        moved: boolean;
        pinch?: number;
      }
    | undefined
  >(undefined);
  const hit = (x: number, y: number) => {
    const c = camera.current;
    let best: number | undefined;
    let distance = Infinity;
    nodes.forEach((_, i) => {
      const dx = positions.current[i * 2] * c.k + c.x + size.current.w / 2 - x;
      const dy =
        positions.current[i * 2 + 1] * c.k + c.y + size.current.h / 2 - y;
      const d = Math.hypot(dx, dy);
      if (d < Math.max(12, radii[i] * c.k + 4) && d < distance) {
        best = i;
        distance = d;
      }
    });
    return best;
  };
  const togglePin = () => {
    const i = indices.get(selectedId || "");
    if (i === undefined) return;
    const has = pinned.current.has(i);
    if (has) pinned.current.delete(i);
    else pinned.current.add(i);
    worker.current?.postMessage({
      type: "pin",
      index: i,
      x: has ? null : positions.current[i * 2],
      y: has ? null : positions.current[i * 2 + 1],
      paused: pausedRef.current,
    });
    setPinRevision((v) => v + 1);
    schedule();
  };
  const selectedIndex = indices.get(selectedId || "");
  return (
    <div className="graph-shell">
      <div className="graph-toolbar">
        <div>
          <span className="eyebrow">REFERENCE UNIVERSE</span>
          <strong>
            {nodes.length.toLocaleString()} learning nodes{" "}
            <span>· {edges.length.toLocaleString()} relationships</span>
          </strong>
        </div>
        <button
          onClick={() => {
            pausedRef.current = !paused;
            setPaused(!paused);
            worker.current?.postMessage({ type: paused ? "resume" : "pause" });
          }}
        >
          {paused ? "▶ Resume" : "Ⅱ Pause"}
        </button>
      </div>
      <div
        className="graph-canvas"
        ref={container}
        data-testid="graph"
        data-node-count={nodes.length}
        data-ticks={stats.ticks}
        data-draw-ms={stats.drawMs.toFixed(2)}
        data-layout-ms={stats.elapsedMs.toFixed(0)}
        data-pin-revision={pinRevision}
      >
        <canvas
          ref={canvas}
          aria-label="Interactive full QUDT graph. Use search to select nodes, or drag to pan and pinch to zoom."
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const r = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - r.left,
              y = e.clientY - r.top;
            pointers.current.set(e.pointerId, { x, y });
            if (pointers.current.size === 1)
              gesture.current = {
                startX: x,
                startY: y,
                lastX: x,
                lastY: y,
                node: hit(x, y),
                moved: false,
              };
            else {
              const a = [...pointers.current.values()];
              if (gesture.current) {
                gesture.current.pinch = Math.hypot(
                  a[0].x - a[1].x,
                  a[0].y - a[1].y,
                );
                gesture.current.moved = true;
                gesture.current.node = undefined;
              }
            }
          }}
          onPointerMove={(e) => {
            if (!pointers.current.has(e.pointerId) || !gesture.current) return;
            const r = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - r.left,
              y = e.clientY - r.top;
            pointers.current.set(e.pointerId, { x, y });
            const g = gesture.current;
            if (pointers.current.size === 2) {
              const a = [...pointers.current.values()];
              const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
              if (g.pinch)
                zoomAt(
                  d / g.pinch,
                  (a[0].x + a[1].x) / 2,
                  (a[0].y + a[1].y) / 2,
                );
              g.pinch = d;
              return;
            }
            if (Math.hypot(x - g.startX, y - g.startY) > 5) g.moved = true;
            if (g.moved) {
              autoFit.current = false;
              if (g.node !== undefined) {
                const c = camera.current;
                const px = (x - size.current.w / 2 - c.x) / c.k,
                  py = (y - size.current.h / 2 - c.y) / c.k;
                positions.current[g.node * 2] = px;
                positions.current[g.node * 2 + 1] = py;
                pinned.current.add(g.node);
                worker.current?.postMessage({
                  type: "pin",
                  index: g.node,
                  x: px,
                  y: py,
                  paused: pausedRef.current,
                });
              } else {
                camera.current.x += x - g.lastX;
                camera.current.y += y - g.lastY;
              }
              schedule();
            }
            g.lastX = x;
            g.lastY = y;
          }}
          onPointerUp={(e) => {
            const g = gesture.current;
            pointers.current.delete(e.pointerId);
            if (g && !g.moved && g.node !== undefined)
              onSelect(nodes[g.node].id);
            if (pointers.current.size) {
              const a = [...pointers.current.values()][0];
              gesture.current = {
                startX: a.x,
                startY: a.y,
                lastX: a.x,
                lastY: a.y,
                moved: true,
              };
            } else {
              gesture.current = undefined;
              setPinRevision((v) => v + 1);
            }
            schedule();
          }}
          onPointerCancel={(e) => {
            pointers.current.delete(e.pointerId);
            gesture.current = undefined;
          }}
        />
        <div className="graph-labels" aria-hidden="true">
          {labels.map((l) => (
            <div
              key={l.node.id}
              className={
                "node-label " + (l.node.id === selectedId ? "selected" : "")
              }
              style={{ left: l.x, top: l.y }}
            >
              {l.node.latex && <MathText latex={l.node.latex} />}
              <span>{l.node.label}</span>
            </div>
          ))}
        </div>
        <div className="canvas-note">
          {selectedId
            ? "Selected neighbourhood · use Fit all to return"
            : "Every eligible node is here."}
          <small>Zoom for labels · drag a node to pin it</small>
        </div>
        <div className="zoom-controls">
          <button aria-label="Zoom in" onClick={() => zoomAt(1.4)}>
            +
          </button>
          <button aria-label="Zoom out" onClick={() => zoomAt(1 / 1.4)}>
            −
          </button>
          <button
            onClick={() => {
              autoFit.current = true;
              fit();
            }}
          >
            Fit all
          </button>
          <button disabled={selectedIndex === undefined} onClick={togglePin}>
            {selectedIndex !== undefined && pinned.current.has(selectedIndex)
              ? "Unpin"
              : "Pin"}
          </button>
        </div>
      </div>
      <div className="graph-footer">
        <div className="legend">
          <span>
            <i className="quantity" />
            Quantity
          </span>
          <span>
            <i className="constant" />
            Constant
          </span>
          <span>
            <i className="equation" />
            Authored equation
          </span>
        </div>
        <span className="layout-status">
          {paused
            ? "Paused"
            : stats.alpha < 0.001
              ? "Layout settled"
              : "Arranging"}{" "}
          · {stats.drawMs.toFixed(1)} ms draw
        </span>
      </div>
    </div>
  );
}
