import { MenuBar, type MenuAction } from "./components/MenuBar";
import appPackage from "../package.json";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DockviewReact,
  DockviewDefaultTab,
  themeLight,
  type IDockviewPanelHeaderProps,
  type DockviewReadyEvent,
} from "dockview-react";
import type { Dataset, LearningNode } from "./domain/types";
import { example, exampleEdges, intervalUnit } from "./domain/example";
import { buildGraphIndex } from "./domain/semantics";
import { buildWorkspace, type AuthoringCommand } from "./domain/authoring";
import {
  createSession,
  dispatchSession,
  historyControls,
  type SessionAction,
  type SessionReference,
  type SessionPanel as PanelId,
} from "./domain/session";
import { parseDataset } from "./domain/validation";
import { getClassification } from "./domain/classifications";
import {
  browseGraph,
  defaultFilters,
  type MapFilters,
} from "./domain/browsing";
import { changeUnitPreference } from "./domain/unit-preferences";
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

export function App() {
  const [data, setData] = useState<Dataset>();
  const [error, setError] = useState("");
  const [session, setSession] = useState(createSession);
  const sessionRef = useRef(session);
  const initialAuthoring = useRef(session.present.authoring);
  const drafts = useRef(new Set<string>());
  const [draftCount, setDraftCount] = useState(0);
  const registerDraft = useCallback((id: string, active: boolean) => {
    if (active) drafts.current.add(id);
    else drafts.current.delete(id);
    setDraftCount(drafts.current.size);
  }, []);
  const [aboutOpen, setAboutOpen] = useState(false);
  const about = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (aboutOpen && !about.current?.open) about.current?.showModal();
    else if (!aboutOpen && about.current?.open) about.current.close();
  }, [aboutOpen]);
  const edits = session.present.authoring;
  const visit = session.present.reference;
  const tab = visit.panel;
  const creating = session.creating;
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [filters, setFilters] = useState<MapFilters>(defaultFilters);
  const [focusRequest, setFocusRequest] = useState<{
    id: string;
    nonce: number;
  }>();
  const [fitRequest, setFitRequest] = useState(0);
  const [viewportMobile, setViewportMobile] = useState(
    matchMedia("(max-width: 800px)").matches,
  );
  const [mobile, setMobile] = useState(viewportMobile);
  // Switching panel trees remounts editors. Finish the draft before applying
  // a phone rotation or window resize that crosses the layout breakpoint.
  useEffect(() => {
    if (!draftCount) setMobile(viewportMobile);
  }, [viewportMobile, draftCount]);
  const dock = useRef<DockviewReadyEvent["api"] | undefined>(undefined);
  const dockLayout = useRef<
    ReturnType<DockviewReadyEvent["api"]["toJSON"]> | undefined
  >(undefined);
  const dockListeners = useRef<{ dispose(): void }[]>([]);
  const [dockGroupCount, setDockGroupCount] = useState(3);
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
    const change = () => setViewportMobile(media.matches);
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
    if (mobile || !session.panelsOpen) {
      dock.current = undefined;
      dockListeners.current.forEach((listener) => listener.dispose());
      dockListeners.current = [];
    }
  }, [mobile, session.panelsOpen]);
  useEffect(
    () => () => dockListeners.current.forEach((listener) => listener.dispose()),
    [],
  );
  const sourceNodes = useMemo(
    () => new Map([...(data?.nodes || []), example].map((n) => [n.id, n])),
    [data],
  );
  const baseline = useMemo(
    () => ({
      nodes: [...sourceNodes.values()],
      edges: [...(data?.edges || []), ...exampleEdges],
      units: [...(data?.units || []), intervalUnit],
    }),
    [data, sourceNodes],
  );
  const sourceUnits = useMemo(
    () => new Map(baseline.units.map((u) => [u.id, u])),
    [baseline],
  );
  const sourceEdges = useMemo(
    () => new Map(baseline.edges.map((e) => [e.id, e])),
    [baseline],
  );
  const authored = useMemo(
    () => (data ? buildWorkspace(baseline, edits) : undefined),
    [data, baseline, edits],
  );
  const nodes = useMemo(
    () =>
      (authored?.nodes || []).map((n) =>
        n.kind === "quantity"
          ? { ...n, classification: n.classification || getClassification(n) }
          : n,
      ),
    [authored],
  );
  const edges = authored?.edges || [];
  const units = authored?.units || [];
  const preferences = edits.unitPreferences;
  const groups = useMemo(() => Object.values(edits.groups), [edits.groups]);
  useEffect(() => {
    if (groupFilter && !edits.groups[groupFilter]) setGroupFilter(null);
  }, [groupFilter, edits.groups]);
  const send = (action: SessionAction) => {
    const next = dispatchSession(baseline, sessionRef.current, action);
    sessionRef.current = next;
    setSession(next);
    return !next.error;
  };
  const perform = (command: AuthoringCommand, label: string) => {
    const reference =
      command.type === "node.create" || command.type === "node.edit"
        ? {
            ...sessionRef.current.present.reference,
            selectedId:
              command.type === "node.create" ? command.node.id : command.id,
            panel: "inspector" as const,
          }
        : undefined;
    return send({ type: "author", command, label, reference });
  };
  const unfinishedEditor = () => {
    if (!drafts.current.size) return false;
    send({
      type: "error",
      message:
        "Save or cancel the open editor before opening another concept or unit, creating a concept, changing modes, moving tabs, or using Undo/Redo.",
    });
    return true;
  };
  const travelEdit = (direction: "undo" | "redo") => {
    if (unfinishedEditor()) return;
    send({ type: direction });
  };
  useEffect(() => {
    if (edits === initialAuthoring.current && !draftCount) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [edits, draftCount]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.altKey ||
        event.key.toLowerCase() !== "z"
      )
        return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true]"))
        return;
      event.preventDefault();
      travelEdit(event.shiftKey ? "redo" : "undo");
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  useEffect(() => {
    if (session.panelsOpen && !mobile) {
      const api = dock.current;
      const target = api?.getPanel(visit.panel);
      // Dockview already activates a panel when its text field receives focus.
      // Activating it again steals that focus before the input event arrives.
      if (target && api?.activePanel !== target) target.api.setActive();
    }
  }, [visit, mobile, session.panelsOpen]);
  // While loading, the example's participants do not exist yet; index only a complete dataset.
  const index = useMemo(
    () => (data ? buildGraphIndex(nodes, edges, units) : undefined),
    [data, nodes, edges, units],
  );
  const view = useMemo(() => {
    const excluded = new Set(edits.excludedNodeIds);
    const group = groupFilter ? edits.groups[groupFilter] : undefined;
    const eligible = nodes.filter(
      (n) => !excluded.has(n.id) && (!group || group.nodeIds.includes(n.id)),
    );
    return browseGraph(eligible, authored?.visibleEdges || [], filters);
  }, [
    nodes,
    authored,
    filters,
    edits.excludedNodeIds,
    edits.groups,
    groupFilter,
  ]);
  const activate = (panel: PanelId) => {
    send({ type: "activate", panel });
    if (!mobile) dock.current?.getPanel(panel)?.api.setActive();
  };
  const navigate = (reference: SessionReference) => {
    const current = sessionRef.current.present.reference;
    if (
      (reference.selectedId !== current.selectedId ||
        reference.unitId !== current.unitId ||
        sessionRef.current.creating) &&
      unfinishedEditor()
    )
      return;
    const label =
      reference.panel === "units"
        ? `Open ${index?.unitsById.get(reference.unitId || "")?.label || "unit reference"}`
        : `Inspect ${index?.nodesById.get(reference.selectedId || "")?.label || "concept"}`;
    send({ type: "navigate", reference, label });
  };
  const ready = (event: DockviewReadyEvent) => {
    dock.current = event.api;
    dockListeners.current.forEach((listener) => listener.dispose());
    if (dockLayout.current) event.api.fromJSON(dockLayout.current);
    else {
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
    }
    event.api
      .getPanel(sessionRef.current.present.reference.panel)
      ?.api.setActive();
    setDockGroupCount(event.api.groups.length);
    dockListeners.current = [
      event.api.onDidLayoutChange(() => {
        dockLayout.current = event.api.toJSON();
        setDockGroupCount(event.api.groups.length);
      }),
      event.api.onDidActivePanelChange(({ panel, origin }) => {
        if (origin === "user" && panel && panel.id in components)
          send({ type: "activate", panel: panel.id as PanelId });
      }),
    ];
  };
  const menuAction = (action: MenuAction) => {
    switch (action) {
      case "about":
        setAboutOpen(true);
        break;
      case "undo":
      case "redo":
        travelEdit(action);
        break;
      case "toggleStatusBar":
        send({
          type: "statusBar.set",
          value: !sessionRef.current.showStatusBar,
        });
        break;
      case "toggleEditMode":
        if (!unfinishedEditor())
          send({ type: "editMode.set", value: !sessionRef.current.editMode });
        break;
      case "closeTabs":
        if (unfinishedEditor()) break;
        if (dock.current) dockLayout.current = dock.current.toJSON();
        send({ type: "panels.closeAll" });
        break;
      case "mergeTabs": {
        if (unfinishedEditor() || mobile || !dock.current) break;
        const api = dock.current;
        const target =
          api.getPanel(sessionRef.current.present.reference.panel) ||
          api.panels[0];
        if (!target) break;
        for (const panel of [...api.panels]) {
          if (panel.api.group.id !== target.api.group.id)
            panel.api.moveTo({
              group: target.api.group,
              position: "center",
              skipSetActive: true,
            });
        }
        target.api.setActive();
        dockLayout.current = api.toJSON();
        setDockGroupCount(api.groups.length);
        send({ type: "panels.merge" });
        break;
      }
      // File items stay disabled until M3 supplies durable workspace operations.
      default:
        break;
    }
  };

  if (!data || !index)
    return (
      <main className="loading">
        <h1>
          {error
            ? "The atlas could not open"
            : "Opening the reference universe…"}
        </h1>
        <p>{error || "Validating the full pinned QUDT baseline."}</p>
        {error && <button onClick={() => location.reload()}>Try again</button>}
      </main>
    );
  const controls = historyControls(session);
  const workspace: Workspace = {
    editMode: session.editMode,
    registerDraft,
    data,
    nodes,
    edges,
    units,
    index,
    sourceNodes,
    sourceUnits,
    sourceEdges,
    authoring: edits,
    perform,
    groups,
    groupFilter,
    setGroupFilter,
    excludedIds: edits.excludedNodeIds,
    placements: edits.placements,
    place: (id, placement, before) => {
      perform(
        { type: "placement.set", id, placement, before },
        placement.pinned !== before.pinned
          ? placement.pinned
            ? "Pin concept"
            : "Unpin concept"
          : "Move concept",
      );
    },
    creating,
    startCreate: (kind) => {
      if (unfinishedEditor()) return;
      send({ type: "beginCreate", kind });
    },
    cancelCreate: () => {
      send({ type: "cancelCreate" });
    },
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
      setGroupFilter(null);
      setFitRequest((n) => n + 1);
    },
    showOnMap: (id) => {
      if (!view.nodes.some((n) => n.id === id)) {
        setFilters(defaultFilters);
        setGroupFilter(null);
      }
      setFocusRequest((old) => ({ id, nonce: (old?.nonce || 0) + 1 }));
      activate("graph");
    },
    focus: (id, depth) => {
      setGroupFilter(null);
      setFilters({ ...defaultFilters, focus: { id, depth } });
      setFitRequest((n) => n + 1);
      activate("graph");
    },
    preferences,
    setPreference: (node, id) => {
      try {
        changeUnitPreference(preferences, node, id, index.unitsById);
        perform(
          { type: "preference.set", id: node.id, unitId: id },
          "Change preferred display unit",
        );
      } catch (error) {
        send({ type: "error", message: String(error) });
      }
    },
    resetPreference: (id) => {
      perform({ type: "preference.reset", id }, "Restore default unit");
    },
    override: (id, value) => {
      const source = sourceNodes.get(id);
      if (value)
        perform({ type: "node.edit", id, patch: value }, "Edit display");
      else if (source)
        perform(
          {
            type: "node.edit",
            id,
            patch: { label: source.label, latex: source.latex || "" },
          },
          "Restore source display",
        );
    },
  };
  return (
    <WorkspaceContext.Provider value={workspace}>
      <div
        className="app-shell"
        data-testid="history-status"
        data-undo-count={session.past.length}
        data-redo-count={session.future.length}
        data-edit-mode={session.editMode}
      >
        <MenuBar
          onAction={menuAction}
          canUndo={controls.undo.enabled}
          canRedo={controls.redo.enabled}
          undoLabel={controls.undo.label}
          redoLabel={controls.redo.label}
          showStatusBar={session.showStatusBar}
          editMode={session.editMode}
          hasOpenTabs={session.panelsOpen}
          canMergeTabs={session.panelsOpen && !mobile && dockGroupCount > 1}
        />
        {session.error && (
          <div className="authoring-error" role="alert">
            <span>{session.error}</span>
            <button onClick={() => send({ type: "error.clear" })}>
              Dismiss
            </button>
          </div>
        )}
        <div className="workspace">
          {!session.panelsOpen ? (
            <div className="empty-workspace">
              <h1>All tabs are closed</h1>
              <p>Your session content is still here.</p>
              <button onClick={() => send({ type: "panels.restore" })}>
                Restore tabs
              </button>
            </div>
          ) : mobile ? (
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
                    onClick={() => activate(id as PanelId)}
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
        {session.showStatusBar && (
          <footer className="app-footer" aria-label="Status bar">
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
            <span className="session-status" title={session.message}>
              {session.editMode ? "Edit mode" : "Browse mode"} · Session only
            </span>
            <a href={data.source.licenseUrl} target="_blank" rel="noreferrer">
              QUDT · {data.source.license}
            </a>
          </footer>
        )}
        <dialog
          ref={about}
          className="about-dialog"
          aria-labelledby="about-title"
          onCancel={() => setAboutOpen(false)}
          onClose={() => setAboutOpen(false)}
        >
          <h1 id="about-title">HVACRbuild.app</h1>
          <p>A working map of measurable things.</p>
          <dl>
            <dt>Version</dt>
            <dd>{appPackage.version}</dd>
            <dt>Reference data</dt>
            <dd>QUDT {data.source.version}</dd>
          </dl>
          <p>
            Browse concepts and their relationships. Use Develop → Enter Edit
            Mode to author your atlas.
          </p>
          <p className="notice">
            Changes last for this session. Workspace saving and recovery arrive
            in M3.
          </p>
          <a href={data.source.licenseUrl} target="_blank" rel="noreferrer">
            QUDT attribution · {data.source.license}
          </a>
          <button autoFocus onClick={() => setAboutOpen(false)}>
            Close About
          </button>
        </dialog>
        <div className="sr-only" role="status" aria-live="polite">
          {session.message}
        </div>
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
