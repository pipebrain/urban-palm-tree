import { Icon } from "../components/Icon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MathText } from "../components/Math";
import {
  initialLayoutNodes,
  layoutLinks,
  nodeRadii,
  type ManualPlacement,
  type Position,
  type ViewNode,
  type ViewEdge,
} from "./model";

type Camera = { x: number; y: number; k: number };
type Label = { node: ViewNode; x: number; y: number };
type Gesture = {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  node?: string;
  moved: boolean;
  pinch?: number;
  before?: ManualPlacement;
};
const EMPTY_PLACEMENTS: Record<string, ManualPlacement> = {};
export function Graph({
  nodes,
  edges,
  selectedId,
  onSelect,
  totalNodeCount = nodes.length,
  viewDescription,
  focusRequest,
  fitRequest,
  placements = EMPTY_PLACEMENTS,
  onPlacement,
  canEdit = true,
}: {
  nodes: ViewNode[];
  edges: ViewEdge[];
  selectedId?: string;
  onSelect: (id: string) => void;
  totalNodeCount?: number;
  viewDescription?: string;
  focusRequest?: { id: string; nonce: number };
  fitRequest?: number;
  placements?: Record<string, ManualPlacement>;
  onPlacement?: (
    id: string,
    next: ManualPlacement,
    before: ManualPlacement,
  ) => void;
  canEdit?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const worker = useRef<Worker | null>(null);
  const generation = useRef(0);
  const placementRevision = useRef(0);
  const previousPlacements = useRef<Record<string, ManualPlacement>>({});
  const positions = useRef(new Float32Array());
  const positionKey = useRef("");
  const positionCache = useRef(new Map<string, Position>());
  const pinned = useRef(new Set<string>());
  const previousTopologyKey = useRef<string | undefined>(undefined);
  const camera = useRef<Camera>({ x: 0, y: 0, k: 1 });
  const autoFit = useRef(true);
  const size = useRef({ w: 1, h: 1 });
  const pending = useRef(0);
  const selected = useRef(selectedId);
  selected.current = selectedId;
  const [pinRevision, setPinRevision] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [layoutError, setLayoutError] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);
  const [stats, setStats] = useState({
    ticks: 0,
    elapsedMs: 0,
    alpha: 1,
    drawMs: 0,
  });
  const lastMetric = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | undefined>(undefined);
  const completedTap = useRef<string | undefined>(undefined);
  const indices = useMemo(
    () => new Map(nodes.map((n, i) => [n.id, i])),
    [nodes],
  );
  const radii = useMemo(() => nodeRadii(nodes, edges), [nodes, edges]);
  const springs = useMemo(() => layoutLinks(nodes, edges), [nodes, edges]);
  const links = useMemo(
    () => springs.map((e) => [indices.get(e.source)!, indices.get(e.target)!]),
    [springs, indices],
  );
  // Names, notation, classification and provenance do not restart layout.
  const topologyKey = JSON.stringify([nodes.map((n) => n.id), springs]);

  const draw = useCallback(() => {
    pending.current = 0;
    const ctx = canvas.current?.getContext("2d");
    if (
      !ctx ||
      positionKey.current !== topologyKey ||
      positions.current.length !== nodes.length * 2
    )
      return;
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
    // Every supplied node has a shape. Only labels have a 60-item detail budget.
    const order =
      chosen === undefined
        ? nodes.map((_, i) => i)
        : [chosen, ...nodes.map((_, i) => i).filter((i) => i !== chosen)];
    for (const i of order) {
      const node = nodes[i];
      const px = positions.current[i * 2],
        py = positions.current[i * 2 + 1];
      const sx = w / 2 + x + px * k,
        sy = h / 2 + y + py * k;
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
      } else if (node.kind === "equation") {
        ctx.roundRect(px - r * 1.5, py - r, r * 3, r * 2, 3);
      } else if (node.classificationKind === "thermodynamic-state-property") {
        for (let side = 0; side < 6; side++) {
          const a = (side * Math.PI) / 3;
          if (side === 0)
            ctx.moveTo(px + r * Math.cos(a), py + r * Math.sin(a));
          else ctx.lineTo(px + r * Math.cos(a), py + r * Math.sin(a));
        }
        ctx.closePath();
      } else ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle =
        node.color ||
        (node.authored
          ? "#c17c45"
          : node.kind === "constant"
            ? "#75879b"
            : "#438570");
      ctx.fill();
      if (i === chosen || pinned.current.has(node.id)) {
        ctx.lineWidth = (i === chosen ? 2.8 : 1.6) / k;
        ctx.strokeStyle = i === chosen ? "#172f27" : "#8d4727";
        ctx.stroke();
      }
      if ((node.groupCount || 0) > 1) {
        // A separate badge makes overlap visible without changing the meaning
        // of shape, fill, or selection/pin outlines.
        const bx = px + r,
          by = py - r;
        ctx.beginPath();
        ctx.arc(bx, by, 5 / k, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.lineWidth = 1 / k;
        ctx.strokeStyle = "#20382f";
        ctx.stroke();
        if (k > 1.7) {
          ctx.font = `${8 / k}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#20382f";
          ctx.fillText(String(node.groupCount), bx, by);
        }
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
    const el = container.current;
    el?.setAttribute("data-zoom", k.toFixed(3));
    el?.setAttribute("data-pins", String(pinned.current.size));
    el?.setAttribute(
      "data-visible-pins",
      String(nodes.filter((n) => pinned.current.has(n.id)).length),
    );
    el?.setAttribute("data-rendered-nodes", String(renderedNodes));
    el?.setAttribute("data-camera-x", x.toFixed(2));
    el?.setAttribute("data-camera-y", y.toFixed(2));
    if (chosen !== undefined) {
      el?.setAttribute("data-selected-color", nodes[chosen].color || "");
      el?.setAttribute(
        "data-selected-group-count",
        String(nodes[chosen].groupCount || 0),
      );
      el?.setAttribute(
        "data-selected-x",
        String(w / 2 + x + positions.current[chosen * 2] * k),
      );
      el?.setAttribute(
        "data-selected-y",
        String(h / 2 + y + positions.current[chosen * 2 + 1] * k),
      );
      el?.setAttribute(
        "data-selected-world-x",
        String(positions.current[chosen * 2]),
      );
      el?.setAttribute(
        "data-selected-world-y",
        String(positions.current[chosen * 2 + 1]),
      );
    } else {
      for (const name of [
        "data-selected-x",
        "data-selected-y",
        "data-selected-world-x",
        "data-selected-world-y",
        "data-selected-color",
        "data-selected-group-count",
      ])
        el?.removeAttribute(name);
    }
    if (performance.now() - lastMetric.current > 800) {
      const drawMs = performance.now() - start;
      lastMetric.current = performance.now();
      setStats((s) => ({ ...s, drawMs }));
    }
  }, [indices, links, nodes, radii, topologyKey]);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const schedule = useCallback(() => {
    if (!pending.current)
      pending.current = requestAnimationFrame(() => drawRef.current());
  }, []);
  const fit = useCallback(() => {
    const p = positions.current;
    if (!p.length || size.current.w < 2 || size.current.h < 2) return;
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
    const k = Math.max(
      0.08,
      Math.min(
        Math.max(1, size.current.w - 80) / (maxX - minX + 30),
        Math.max(1, size.current.h - 100) / (maxY - minY + 30),
        3,
      ),
    );
    camera.current = {
      x: (-(minX + maxX) / 2) * k,
      y: (-(minY + maxY) / 2) * k,
      k,
    };
    schedule();
  }, [schedule]);

  const applyPlacement = useCallback(
    (id: string, next: ManualPlacement) => {
      positionCache.current.set(id, { x: next.x, y: next.y });
      if (next.pinned) pinned.current.add(id);
      else pinned.current.delete(id);
      const i = indices.get(id);
      if (i !== undefined && positionKey.current === topologyKey) {
        positions.current[i * 2] = next.x;
        positions.current[i * 2 + 1] = next.y;
        worker.current?.postMessage({
          type: "place",
          generation: generation.current,
          revision: ++placementRevision.current,
          id,
          ...next,
        });
      }
      setPinRevision((value) => value + 1);
      schedule();
    },
    [indices, topologyKey, schedule],
  );

  useEffect(() => {
    const active = gesture.current;
    if (!canEdit && active?.before && active.node) {
      if (active.moved) applyPlacement(active.node, active.before);
      gesture.current = undefined;
      completedTap.current = undefined;
      pointers.current.clear();
    }
  }, [canEdit, applyPlacement]);

  // History restores deliberate placements independently of topology. Hidden
  // nodes keep their positions and pins until they return to the current view.
  useEffect(() => {
    const previous = previousPlacements.current;
    for (const [id, next] of Object.entries(placements)) {
      const before = previous[id];
      if (
        !before ||
        before.x !== next.x ||
        before.y !== next.y ||
        before.pinned !== next.pinned
      )
        applyPlacement(id, next);
    }
    for (const id of Object.keys(previous))
      if (!placements[id]) {
        const position = positionCache.current.get(id);
        if (position) applyPlacement(id, { ...position, pinned: false });
      }
    previousPlacements.current = placements;
  }, [placements, applyPlacement]);

  useEffect(() => {
    const currentGeneration = ++generation.current;
    placementRevision.current = 0;
    if (
      previousTopologyKey.current !== undefined &&
      previousTopologyKey.current !== topologyKey
    )
      autoFit.current = false;
    previousTopologyKey.current = topologyKey;
    pointers.current.clear();
    gesture.current = undefined;
    completedTap.current = undefined;
    setLabels([]);
    setLayoutError(false);
    const seeds = initialLayoutNodes(
      nodes,
      radii,
      positionCache.current,
      pinned.current,
    );
    positionKey.current = topologyKey;
    positions.current = new Float32Array(seeds.flatMap((n) => [n.x, n.y]));
    seeds.forEach((n) => positionCache.current.set(n.id, { x: n.x, y: n.y }));
    if (autoFit.current) fit();
    schedule();
    if (!nodes.length) {
      worker.current = null;
      setStats((s) => ({ ...s, ticks: 0, elapsedMs: 0, alpha: 0 }));
      return;
    }
    let w: Worker | undefined;
    const fail = () => {
      if (generation.current !== currentGeneration) return;
      setLayoutError(true);
      w?.terminate();
      if (worker.current === w) worker.current = null;
    };
    try {
      w = new Worker(new URL("./layout.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.current = w;
      w.onerror = (event) => {
        event.preventDefault();
        fail();
      };
      w.onmessageerror = fail;
      w.onmessage = ({ data }) => {
        if (
          generation.current !== currentGeneration ||
          data.generation !== currentGeneration ||
          data.revision < placementRevision.current
        )
          return;
        if (
          !(data.positions instanceof Float32Array) ||
          data.positions.length !== nodes.length * 2 ||
          !data.positions.every(Number.isFinite)
        ) {
          fail();
          return;
        }
        positions.current = data.positions;
        nodes.forEach((n, i) =>
          positionCache.current.set(n.id, {
            x: data.positions[i * 2],
            y: data.positions[i * 2 + 1],
          }),
        );
        setStats((s) => ({
          ...s,
          ticks: data.ticks,
          elapsedMs: data.elapsedMs,
          alpha: data.alpha,
        }));
        if (autoFit.current) fit();
        else schedule();
      };
      w.postMessage({
        type: "init",
        generation: currentGeneration,
        nodes: seeds,
        links: springs,
        paused: pausedRef.current,
      });
    } catch {
      fail();
    }
    return () => {
      w?.terminate();
      if (worker.current === w) worker.current = null;
    };
    // The topology key deliberately omits display metadata. Seeds and springs
    // come from the render that changed visible node IDs / distinct link pairs.
  }, [topologyKey, fit, schedule]);
  useEffect(() => {
    schedule();
  }, [draw, schedule, selectedId]);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      size.current = {
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      };
      if (canvas.current) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.current.width = Math.max(1, Math.round(size.current.w * dpr));
        canvas.current.height = Math.max(1, Math.round(size.current.h * dpr));
      }
      if (autoFit.current) fit();
      schedule();
    });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, [fit, schedule]);
  useEffect(
    () => () => {
      generation.current++;
      if (pending.current) cancelAnimationFrame(pending.current);
      pending.current = 0;
      pointers.current.clear();
    },
    [],
  );
  const focusNode = (id?: string) => {
    const i = indices.get(id || "");
    if (
      i === undefined ||
      positionKey.current !== topologyKey ||
      positions.current.length !== nodes.length * 2
    )
      return;
    autoFit.current = false;
    camera.current = {
      x: -positions.current[i * 2] * 2.8,
      y: -positions.current[i * 2 + 1] * 2.8,
      k: 2.8,
    };
    schedule();
  };
  useEffect(() => {
    focusNode(selectedId);
  }, [selectedId]);
  useEffect(() => {
    if (focusRequest) focusNode(focusRequest.id);
  }, [focusRequest?.nonce, focusRequest?.id]);
  useEffect(() => {
    if (fitRequest !== undefined) {
      autoFit.current = true;
      fit();
    }
  }, [fitRequest, fit]);
  const zoomAt = useCallback(
    (factor: number, sx = size.current.w / 2, sy = size.current.h / 2) => {
      if (!Number.isFinite(factor) || factor <= 0) return;
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
  const hit = (x: number, y: number) => {
    if (positionKey.current !== topologyKey) return undefined;
    const c = camera.current;
    let best: string | undefined;
    let distance = Infinity;
    nodes.forEach((node, i) => {
      const d = Math.hypot(
        positions.current[i * 2] * c.k + c.x + size.current.w / 2 - x,
        positions.current[i * 2 + 1] * c.k + c.y + size.current.h / 2 - y,
      );
      if (d < Math.max(12, radii[i] * c.k + 4) && d < distance) {
        best = node.id;
        distance = d;
      }
    });
    return best;
  };
  const post = (data: Record<string, unknown>) =>
    worker.current?.postMessage({ ...data, generation: generation.current });
  const togglePin = () => {
    if (!canEdit) return;
    const i = indices.get(selectedId || "");
    if (i === undefined || !selectedId) return;
    const has = pinned.current.has(selectedId);
    const x = positions.current[i * 2],
      y = positions.current[i * 2 + 1];
    const before = { x, y, pinned: has };
    const next = { x, y, pinned: !has };
    applyPlacement(selectedId, next);
    onPlacement?.(selectedId, next, before);
  };
  const finishDrag = (g: Gesture | undefined, cancelled = false) => {
    if (!g?.moved || !g.node || !g.before) return;
    const i = indices.get(g.node);
    if (i === undefined) return;
    if (cancelled) applyPlacement(g.node, g.before);
    else
      onPlacement?.(
        g.node,
        {
          x: positions.current[i * 2],
          y: positions.current[i * 2 + 1],
          pinned: true,
        },
        g.before,
      );
  };
  const selectedIndex = indices.get(selectedId || "");
  const filtered = nodes.length !== totalNodeCount;
  return (
    <div className="graph-shell">
      <div className="graph-toolbar">
        <div>
          <span className="eyebrow">
            {filtered ? "FILTERED VIEW" : "REFERENCE UNIVERSE"}
          </span>
          <strong>
            {nodes.length.toLocaleString()}
            {filtered && ` of ${totalNodeCount.toLocaleString()}`} learning
            nodes <span>· {edges.length.toLocaleString()} relationships</span>
          </strong>
        </div>
        <button
          disabled={layoutError}
          onClick={() => {
            pausedRef.current = !pausedRef.current;
            setPaused(pausedRef.current);
            post({ type: pausedRef.current ? "pause" : "resume" });
          }}
        >
          <Icon name={paused ? "play" : "pause"} />{" "}
          {paused ? "Resume" : "Pause"}
        </button>
      </div>
      <div
        className="graph-canvas"
        ref={container}
        data-testid="graph"
        data-node-count={nodes.length}
        data-total-node-count={totalNodeCount}
        data-ticks={stats.ticks}
        data-draw-ms={stats.drawMs.toFixed(2)}
        data-layout-ms={stats.elapsedMs.toFixed(0)}
        data-pin-revision={pinRevision}
        data-layout-error={layoutError}
      >
        <canvas
          ref={canvas}
          aria-label={
            canEdit
              ? "Interactive knowledge graph. Search to select nodes; drag to pan, pinch to zoom, or drag a node to pin it."
              : "Interactive knowledge graph. Tap a node to inspect it; drag to pan or pinch to zoom."
          }
          onPointerDown={(e) => {
            completedTap.current = undefined;
            e.currentTarget.setPointerCapture(e.pointerId);
            const r = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - r.left,
              y = e.clientY - r.top;
            pointers.current.set(e.pointerId, { x, y });
            if (pointers.current.size === 1) {
              const node = hit(x, y);
              const i = indices.get(node || "");
              gesture.current = {
                startX: x,
                startY: y,
                lastX: x,
                lastY: y,
                node,
                moved: false,
                before:
                  canEdit && node && i !== undefined
                    ? {
                        x: positions.current[i * 2],
                        y: positions.current[i * 2 + 1],
                        pinned: pinned.current.has(node),
                      }
                    : undefined,
              };
            } else {
              const a = [...pointers.current.values()];
              if (gesture.current) {
                finishDrag(gesture.current, true);
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
            if (pointers.current.size >= 2) {
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
              const i = indices.get(g.node || "");
              if (canEdit && g.before && g.node && i !== undefined) {
                const c = camera.current;
                const px = (x - size.current.w / 2 - c.x) / c.k,
                  py = (y - size.current.h / 2 - c.y) / c.k;
                applyPlacement(g.node, { x: px, y: py, pinned: true });
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
            finishDrag(g);
            completedTap.current =
              g && !g.moved && g.node && indices.has(g.node)
                ? g.node
                : undefined;
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
            completedTap.current = undefined;
            finishDrag(gesture.current, true);
            pointers.current.delete(e.pointerId);
            gesture.current = undefined;
            setPinRevision((v) => v + 1);
          }}
          onClick={() => {
            // Wait for the complete tap before opening the phone inspector.
            // Changing panels on pointerup lets the following compatibility
            // click activate a control newly displayed beneath the finger.
            const id = completedTap.current;
            completedTap.current = undefined;
            if (id && indices.has(id)) onSelect(id);
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
              {(l.node.groupCount || 0) > 1 && (
                <small>{l.node.groupCount} groups</small>
              )}
            </div>
          ))}
        </div>
        {(!nodes.length || layoutError) && (
          <div className="graph-message" role="status">
            {!nodes.length
              ? "No nodes match this view. Change or clear the filters."
              : "Layout unavailable. You can still browse, zoom and drag nodes."}
          </div>
        )}
        <div className="canvas-note">
          {viewDescription ||
            (filtered
              ? "Filtered view · hidden nodes are retained"
              : "Every eligible node is included.")}
          <small>
            {canEdit
              ? "Zoom for labels · drag a node to pin it"
              : "Zoom for labels · drag to pan"}
          </small>
        </div>
        <div className="zoom-controls">
          <button aria-label="Zoom in" onClick={() => zoomAt(1.4)}>
            +
          </button>
          <button aria-label="Zoom out" onClick={() => zoomAt(1 / 1.4)}>
            −
          </button>
          <button
            disabled={!nodes.length}
            onClick={() => {
              autoFit.current = true;
              fit();
            }}
          >
            {filtered ? "Fit view" : "Fit all"}
          </button>
          {canEdit && (
            <button disabled={selectedIndex === undefined} onClick={togglePin}>
              {selectedId && pinned.current.has(selectedId) ? "Unpin" : "Pin"}
            </button>
          )}
        </div>
      </div>
      <div className="graph-footer">
        <div className="legend">
          <span>
            <i className="quantity" />
            Quantity
          </span>
          <span>
            <i className="state-property" />
            State property (quantity subtype)
          </span>
          <span>
            <i className="constant" />
            Constant
          </span>
          <span>
            <i className="equation" />
            Equation
          </span>
        </div>
        <span className="layout-status">
          {layoutError
            ? "Layout unavailable"
            : paused
              ? "Paused"
              : stats.alpha < 0.001
                ? "Layout settled"
                : "Arranging"}{" "}
          · {stats.drawMs.toFixed(1)} ms draw
        </span>
        <small className="graph-weight-note">
          Graph weight: distinct visible neighbours; radius 4–10. Duplicate
          links and internal references add no weight. Placement is not
          physical. Group colour: first listed group; a white badge marks
          multiple groups. Ungrouped: amber app-authored, green reference
          quantities, blue reference constants. Outlines: selection / pin.
        </small>
      </div>
    </div>
  );
}
