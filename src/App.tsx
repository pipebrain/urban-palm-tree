import { Icon } from "./components/Icon";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DockviewReact,
  DockviewDefaultTab,
  themeLight,
  type IDockviewPanelHeaderProps,
  type DockviewReadyEvent,
} from "dockview-react";
import type { Dataset } from "./domain/types";
import { example, exampleEdges, intervalUnit } from "./domain/example";
import {
  applyDisplayOverrides,
  buildGraphIndex,
  type DisplayOverrides,
} from "./domain/semantics";
import { parseDataset } from "./domain/validation";
import { getClassification } from "./domain/classifications";
import {
  browseGraph,
  defaultFilters,
  type MapFilters,
} from "./domain/browsing";
import {
  changeUnitPreference,
  type UnitPreferences,
} from "./domain/unit-preferences";
import { WorkspaceContext, type Workspace } from "./workspace/context";
import { LibraryPanel } from "./workspace/LibraryPanel";
import { MapPanel } from "./workspace/MapPanel";
import { InspectorPanel } from "./workspace/InspectorPanel";
import { UnitPanel } from "./workspace/UnitPanel";
import { prepareOfflinePreview, type OfflineStatus } from "./offline";

const components = {
  library: LibraryPanel,
  graph: MapPanel,
  inspector: InspectorPanel,
  units: UnitPanel,
};
const FixedTab = (props: IDockviewPanelHeaderProps) => (
  <DockviewDefaultTab {...props} hideClose />
);
type Visit = {
  selectedId?: string;
  unitId?: string;
  panel: "inspector" | "units";
};

export function App() {
  const [data, setData] = useState<Dataset>();
  const [error, setError] = useState("");
  const [overrides, setOverrides] = useState<DisplayOverrides>({});
  const [preferences, setPreferences] = useState<UnitPreferences>({});
  const [filters, setFilters] = useState<MapFilters>(defaultFilters);
  const [focusRequest, setFocusRequest] = useState<{
    id: string;
    nonce: number;
  }>();
  const [fitRequest, setFitRequest] = useState(0);
  const [history, setHistory] = useState<{ visits: Visit[]; index: number }>({
    visits: [{ panel: "inspector" }],
    index: 0,
  });
  const visit = history.visits[history.index];
  const [tab, setTab] = useState("graph");
  const [mobile, setMobile] = useState(
    matchMedia("(max-width: 800px)").matches,
  );
  const dock = useRef<DockviewReadyEvent["api"] | undefined>(undefined);
  const [offline, setOffline] = useState<OfflineStatus>({
    state: "preparing",
    message: "Checking offline preview…",
  });
  useEffect(() => {
    let stopped = false;
    fetch(`${import.meta.env.BASE_URL}data/qudt-graph.json`)
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Dataset request failed (${response.status})`);
        const parsed = parseDataset(await response.json());
        // Validate the composed authored/reference boundary before exposing a workspace.
        buildGraphIndex(
          [...parsed.nodes, example],
          [...parsed.edges, ...exampleEdges],
          [...parsed.units, intervalUnit],
        );
        if (!stopped) setData(parsed);
      })
      .catch((e) => {
        if (!stopped) setError(String(e));
      });
    const media = matchMedia("(max-width: 800px)");
    const change = () => setMobile(media.matches);
    media.addEventListener("change", change);
    let cleanup: (() => void) | undefined;
    void prepareOfflinePreview((status) => {
      if (!stopped) setOffline(status);
    }).then((fn) => {
      if (stopped) fn();
      else cleanup = fn;
    });
    return () => {
      stopped = true;
      cleanup?.();
      media.removeEventListener("change", change);
    };
  }, []);
  useEffect(() => {
    if (mobile) dock.current = undefined;
  }, [mobile]);
  const sourceNodes = useMemo(
    () => new Map([...(data?.nodes || []), example].map((n) => [n.id, n])),
    [data],
  );
  const nodes = useMemo(
    () =>
      applyDisplayOverrides([...sourceNodes.values()], overrides).map((n) =>
        n.kind === "quantity"
          ? { ...n, classification: getClassification(n) }
          : n,
      ),
    [sourceNodes, overrides],
  );
  const edges = useMemo(
    () => [...(data?.edges || []), ...exampleEdges],
    [data],
  );
  const units = useMemo(() => [...(data?.units || []), intervalUnit], [data]);
  // While loading, the example's participants do not exist yet; index only a complete dataset.
  const index = useMemo(
    () => (data ? buildGraphIndex(nodes, edges, units) : undefined),
    [data, nodes, edges, units],
  );
  const view = useMemo(
    () => browseGraph(nodes, edges, filters),
    [nodes, edges, filters],
  );
  const activate = (panel: string) => {
    setTab(panel);
    if (!mobile) dock.current?.getPanel(panel)?.api.setActive();
  };
  const navigate = (next: Visit) => {
    setHistory((old) => {
      const current = old.visits[old.index];
      if (
        current.panel === next.panel &&
        current.selectedId === next.selectedId &&
        current.unitId === next.unitId
      )
        return old;
      const visits = [...old.visits.slice(0, old.index + 1), next];
      return { visits, index: visits.length - 1 };
    });
    activate(next.panel);
  };
  const travel = (offset: number) => {
    const next = history.index + offset;
    if (next < 0 || next >= history.visits.length) return;
    setHistory({ ...history, index: next });
    activate(history.visits[next].panel);
  };
  const ready = (event: DockviewReadyEvent) => {
    dock.current = event.api;
    event.api.addPanel({
      id: "library",
      component: "library",
      title: "Library",
      initialWidth: 280,
    });
    event.api.addPanel({
      id: "graph",
      component: "graph",
      title: "Knowledge map",
      position: { referencePanel: "library", direction: "right" },
    });
    event.api.addPanel({
      id: "inspector",
      component: "inspector",
      title: "Inspector",
      position: { referencePanel: "graph", direction: "right" },
      initialWidth: 350,
    });
    event.api.addPanel({
      id: "units",
      component: "units",
      title: "Units",
      position: { referencePanel: "inspector", direction: "within" },
    });
    event.api.getPanel("library")?.api.setSize({ width: 280 });
    event.api.getPanel("inspector")?.api.setSize({ width: 350 });
    event.api.getPanel(visit.panel)?.api.setActive();
  };
  if (!data || !index)
    return (
      <main className="loading">
        <span className="brand-mark">H</span>
        <h1>
          {error
            ? "The atlas could not open"
            : "Opening the reference universe…"}
        </h1>
        <p>{error || "Validating the full pinned QUDT baseline."}</p>
        {error && <button onClick={() => location.reload()}>Try again</button>}
      </main>
    );
  const workspace: Workspace = {
    data,
    nodes,
    edges,
    units,
    index,
    sourceNodes,
    selectedId: visit.selectedId,
    unitId: visit.unitId,
    select: (id) =>
      navigate({ selectedId: id, unitId: visit.unitId, panel: "inspector" }),
    openUnit: (id) => navigate({ ...visit, unitId: id, panel: "units" }),
    showInspector: () => navigate({ ...visit, panel: "inspector" }),
    filters,
    setFilters,
    view,
    fitRequest,
    focusRequest,
    resetMap: () => {
      setFilters(defaultFilters);
      setFitRequest((n) => n + 1);
    },
    showOnMap: (id) => {
      if (!view.nodes.some((n) => n.id === id)) setFilters(defaultFilters);
      setFocusRequest((old) => ({ id, nonce: (old?.nonce || 0) + 1 }));
      activate("graph");
    },
    focus: (id, depth) => {
      setFilters({ ...defaultFilters, focus: { id, depth } });
      setFitRequest((n) => n + 1);
      activate("graph");
    },
    preferences,
    setPreference: (node, id) =>
      setPreferences((old) =>
        changeUnitPreference(old, node, id, index.unitsById),
      ),
    resetPreference: (id) =>
      setPreferences((old) => {
        const next = { ...old };
        delete next[id];
        return next;
      }),
    override: (id, value) =>
      setOverrides((old) => {
        const next = { ...old };
        if (value) next[id] = value;
        else delete next[id];
        return next;
      }),
  };
  return (
    <WorkspaceContext.Provider value={workspace}>
      <div className="app-shell">
        <header>
          <div className="brand">
            <span className="brand-mark">
              H<Icon name="arrow-up-right" />
            </span>
            <div>
              <h1>
                HVACR <span>Knowledge atlas</span>
              </h1>
              <p>A working map of measurable things</p>
            </div>
          </div>
          <div className="header-meta">
            <span className="prototype">M1 · BROWSE & CONNECT</span>
            <span>QUDT {data.source.version}</span>
          </div>
        </header>
        <div className="workspace-trail">
          <div className="history-controls">
            <button
              aria-label="Previous reference"
              title="Previous reference"
              disabled={history.index === 0}
              onClick={() => travel(-1)}
            >
              <Icon name="arrow-left" />
            </button>
            <button
              aria-label="Next reference"
              title="Next reference"
              disabled={history.index === history.visits.length - 1}
              onClick={() => travel(1)}
            >
              <Icon name="arrow-right" />
            </button>
          </div>
          <span>
            {visit.panel === "units" && visit.unitId
              ? index.unitsById.get(visit.unitId)?.label || "Missing unit"
              : index.nodesById.get(visit.selectedId || "")?.label ||
                "Full reference universe"}
          </span>
          <small>Session changes are temporary</small>
        </div>
        <div className="workspace">
          {mobile ? (
            <>
              <nav className="mobile-nav" aria-label="Workspace panels">
                {[
                  ["graph", "Map"],
                  ["library", "Search"],
                  ["inspector", "Inspector"],
                  ["units", "Units"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={tab === id}
                    onClick={() => activate(id)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              <div className="mobile-panels">
                {Object.entries(components).map(([id, Panel]) => (
                  <div
                    key={id}
                    className={
                      tab === id ? "mobile-panel" : "mobile-panel hidden"
                    }
                  >
                    <Panel />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <DockviewReact
              defaultTabComponent={FixedTab}
              components={components}
              onReady={ready}
              theme={themeLight}
            />
          )}
        </div>
        <footer className="app-footer">
          <span>
            <i className={"status-dot " + offline.state} />
            {offline.state === "ready"
              ? "Offline preview prepared"
              : offline.state === "preparing"
                ? "Preparing offline preview"
                : offline.state === "update-available"
                  ? "Preview update waiting"
                  : offline.state === "unsupported"
                    ? "Local development build"
                    : "Offline preview unavailable"}
          </span>
          <span title={offline.message}>
            {offline.state === "ready"
              ? "Verify reopening on each device."
              : "Explore · inspect · connect"}
          </span>
          <a href={data.source.licenseUrl} target="_blank" rel="noreferrer">
            QUDT · {data.source.license}
          </a>
        </footer>
        <div
          className="sr-only"
          role="status"
          data-testid="offline-status"
          data-state={offline.state}
        >
          {offline.message}
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}
