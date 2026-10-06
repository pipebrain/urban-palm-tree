import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DockviewReact,
  DockviewDefaultTab,
  themeLight,
  type IDockviewPanelHeaderProps,
  type DockviewReadyEvent,
} from "dockview-react";
import type { Dataset, LearningNode, UnitReference } from "./domain/types";
import {
  EXAMPLE_ID,
  example,
  exampleEdges,
  intervalUnit,
} from "./domain/example";
import { Graph } from "./graph/Graph";
import { unitLatex, plainMath } from "./domain/notation";
import { MathText } from "./components/Math";
import { prepareOfflinePreview, type OfflineStatus } from "./offline";

type Workspace = {
  data: Dataset;
  nodes: LearningNode[];
  units: UnitReference[];
  selectedId?: string;
  unitId?: string;
  select: (id: string) => void;
  openUnit: (id?: string) => void;
  draft: LearningNode;
  setDraft: (n: LearningNode) => void;
};
const Context = createContext<Workspace | null>(null);
const useWorkspace = () => useContext(Context)!;
const short = (id: string) => id.split("/").pop() || id;
function TextContent({ text }: { text: string }) {
  // Source markup stays inert. Only bounded inline/display math is interpreted by KaTeX.
  return (
    <div className="source-text">
      {text
        .split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g)
        .map((part, i) =>
          part.startsWith("$$") ? (
            <MathText key={i} latex={part.slice(2, -2)} display />
          ) : part.startsWith("$") ? (
            <MathText key={i} latex={part.slice(1, -1)} />
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
    </div>
  );
}
function UnitLink({ id }: { id: string }) {
  const w = useWorkspace();
  const unit = w.units.find((u) => u.id === id);
  return (
    <button className="unit-link" onClick={() => w.openUnit(id)}>
      {<MathText latex={unit ? unitLatex(unit) : plainMath(short(id))} />}
    </button>
  );
}
function GraphPanel() {
  const w = useWorkspace();
  const nodes = useMemo(
    () =>
      w.nodes.map((n) => ({
        ...n,
        authored: n.provenance.origin === "authored",
      })),
    [w.nodes],
  );
  const edges = useMemo(() => [...w.data.edges, ...exampleEdges], [w.data]);
  return (
    <Graph
      nodes={nodes}
      edges={edges}
      selectedId={w.selectedId}
      onSelect={w.select}
    />
  );
}
function LibraryPanel() {
  const w = useWorkspace();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const matches = useMemo(
    () =>
      w.nodes.filter(
        (n) =>
          (kind === "all" || n.kind === kind) &&
          `${n.label} ${n.symbol || ""} ${n.id}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [w.nodes, kind, query],
  );
  return (
    <div className="library panel-scroll">
      <div className="panel-intro">
        <span className="eyebrow">EXPLORE & CONNECT</span>
        <h2>The reference library</h2>
        <p>Start with a concept. Follow its relationships.</p>
      </div>
      <label className="search">
        <span>⌕</span>
        <input
          aria-label="Search all nodes"
          placeholder="Search names or identifiers…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="filter-tabs" aria-label="Search category">
        {["all", "quantity", "constant", "equation"].map((k) => (
          <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>
            {k === "all"
              ? "All"
              : k === "quantity"
                ? "Quantities"
                : k === "constant"
                  ? "Constants"
                  : "Equations"}
          </button>
        ))}
      </div>
      <div className="list-heading">
        <span>{matches.length.toLocaleString()} results</span>
        <span>QUDT + authored</span>
      </div>
      <div className="node-list">
        {matches.slice(0, 80).map((n) => (
          <button
            key={n.id}
            className={w.selectedId === n.id ? "node-row active" : "node-row"}
            onClick={() => w.select(n.id)}
          >
            <span className={`node-dot ${n.kind}`} />
            <span>
              <strong>{n.label}</strong>
              <small>
                {n.provenance.origin === "authored"
                  ? "App-authored example"
                  : n.kind === "constant"
                    ? "Physical constant"
                    : "Quantity kind"}
              </small>
            </span>
            <span className="row-arrow">↗</span>
          </button>
        ))}
      </div>
      {matches.length > 80 && (
        <p className="muted">
          Showing the first 80 search results. Refine your search; all{" "}
          {w.nodes.length.toLocaleString()} nodes remain in the graph.
        </p>
      )}
      {matches.length === 0 && <p>No matching nodes. Try a broader term.</p>}
      <div className="library-foot">
        Unit references are kept separately.
        <br />
        Names and symbols never replace stable IDs.
      </div>
    </div>
  );
}
function UnitInspector({ unit }: { unit: UnitReference }) {
  const w = useWorkspace();
  const backlinks = w.nodes.filter((n) => n.unitIds.includes(unit.id));
  return (
    <>
      <button className="text-button" onClick={() => w.openUnit(undefined)}>
        ← Back to concept
      </button>
      <span className="eyebrow">UNIT REFERENCE</span>
      <h2>{unit.label}</h2>
      <div className="math-card">
        {<MathText latex={unitLatex(unit)} display />}
      </div>
      <TextContent
        text={unit.description || "No source definition supplied."}
      />
      <h3>Explicit uses · {backlinks.length}</h3>
      {backlinks.map((n) => (
        <button className="related" key={n.id} onClick={() => w.select(n.id)}>
          {n.label} ↗
        </button>
      ))}
      {!backlinks.length && (
        <p className="muted">No explicit uses in this baseline.</p>
      )}
      <details>
        <summary>
          Compatible quantity kinds · {unit.quantityKindIds.length}
        </summary>
        {unit.quantityKindIds.map((id) => (
          <button key={id} className="related" onClick={() => w.select(id)}>
            {w.nodes.find((n) => n.id === id)?.label || short(id)}
          </button>
        ))}
      </details>
      <details>
        <summary>Source identity & conversion metadata</summary>
        <code>{unit.id}</code>
        <p>Original symbol: {unit.symbol ?? "not supplied"}</p>
        <p>
          Multiplier: {unit.multiplier ?? "not supplied"}
          <br />
          Offset: {unit.offset ?? "not supplied"}
        </p>
        <p className="muted">
          Reference metadata only. M0 does not perform conversions or resolve
          pressure-reference context.
        </p>
      </details>
      <a href={unit.provenance.sourceUrl} target="_blank" rel="noreferrer">
        Open reference ↗
      </a>
    </>
  );
}
function InspectorPanel() {
  const w = useWorkspace();
  const node = w.nodes.find((n) => n.id === w.selectedId);
  const unit = w.units.find((u) => u.id === w.unitId);
  const edges = useMemo(() => [...w.data.edges, ...exampleEdges], [w.data]);
  if (unit)
    return (
      <section className="inspector panel-scroll">
        <UnitInspector unit={unit} />
      </section>
    );
  if (!node)
    return (
      <section className="inspector panel-scroll welcome">
        <span className="eyebrow">A MAP FOR UNDERSTANDING</span>
        <h2>
          Find the connections.
          <br />
          <em>Build the intuition.</em>
        </h2>
        <div className="welcome-diagram">
          <span>Energy</span>
          <b>↔</b>
          <span>Flow</span>
          <b>↔</b>
          <span>Temperature</span>
        </div>
        <p>
          Explore quantities and constants from the complete eligible QUDT
          import. Select a node to see its meaning, source, and relationships.
        </p>
        <button className="example-card" onClick={() => w.select(EXAMPLE_ID)}>
          <span className="eyebrow">TRY THE HVACR EXAMPLE</span>
          <MathText latex={example.latex!} />
          <strong>
            Sensible heat transfer <span>↗</span>
          </strong>
          <small>App-authored · DOE reference</small>
        </button>
        <h3>A full universe, with context</h3>
        <p>
          {w.data.report.counts.quantityNodes.toLocaleString()} quantity kinds
          and {w.data.report.counts.constantNodes} physical constants.{" "}
          {w.data.report.counts.unitReferences.toLocaleString()} unit records
          live in the reference library.
        </p>
        <p className="muted">
          Zooming reveals labels; it never removes nodes. Layout distance is a
          graph convenience, not a physical relationship.
        </p>
        <details>
          <summary>Import coverage & limitations</summary>
          <p>
            {w.data.report.counts.isolatedNodes} isolated nodes;{" "}
            {w.data.report.counts.deprecatedNodes} deprecated nodes retained;{" "}
            {w.data.report.counts.nodesWithoutMathSymbol} nodes have no math
            symbol.
          </p>
          <p>
            State-property classifications are not inferred. Quantities remain
            general pending semantic review.
          </p>
          {w.data.report.gaps.map((g, i) => (
            <p key={i}>{g}</p>
          ))}
        </details>
        <a href={w.data.source.releaseUrl} target="_blank" rel="noreferrer">
          QUDT {w.data.source.version} · source release ↗
        </a>
        <p className="attribution">
          {w.data.source.attribution}{" "}
          <a href={w.data.source.licenseUrl} target="_blank" rel="noreferrer">
            {w.data.source.license}
          </a>
        </p>
      </section>
    );
  const authored = node.provenance.origin === "authored";
  const related = edges.filter(
    (e) => e.source === node.id || e.target === node.id,
  );
  return (
    <section className="inspector panel-scroll" data-testid="inspector">
      <div className="inspector-top">
        <span className={"badge " + (authored ? "authored" : "")}>
          {authored ? "APP-AUTHORED EXAMPLE" : "QUDT " + w.data.source.version}
        </span>
        <span>{node.kind}</span>
      </div>
      <h2>{node.label}</h2>
      {node.latex && (
        <div className="math-card">
          <MathText latex={node.latex} display />
        </div>
      )}
      <TextContent
        text={
          node.description ||
          "This source record does not include a description."
        }
      />
      {node.deprecated && (
        <p className="notice">
          Upstream marks this record as deprecated. Its identity and references
          are retained.
        </p>
      )}
      {node.kind === "constant" && (
        <p className="notice">
          Imported value, not reviewed for current numerical accuracy. Some QUDT
          constants predate current SI definitions; no calculation uses these
          values.
        </p>
      )}
      {node.constantValues?.map((v) => (
        <div className="constant-value" key={v.id}>
          <strong>{v.value ?? "No numerical value"}</strong>
          {v.unitIds.map((id) => (
            <UnitLink key={id} id={id} />
          ))}
          {v.standardUncertainty && (
            <small>Standard uncertainty: {v.standardUncertainty}</small>
          )}
        </div>
      ))}
      {node.bindings && (
        <>
          <h3>Equation participants</h3>
          <p className="muted">
            Bindings refer to concepts, with no fixed solve direction.
          </p>
          {node.bindings.map((b) => (
            <div className="binding" key={b.symbol}>
              <button
                className="text-button"
                onClick={() => w.select(b.nodeId)}
              >
                <MathText latex={b.symbol} /> <span>{b.role}</span>
              </button>
              {b.unitId && <UnitLink id={b.unitId} />}
            </div>
          ))}
        </>
      )}
      {node.assumptions && (
        <details open>
          <summary>Conditions & assumptions</summary>
          <ul>
            {node.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </details>
      )}
      {authored && (
        <details>
          <summary>Try editing this example</summary>
          <p className="muted">
            M0 authoring probe. Edits last only in this open tab; saving and
            undo arrive in later milestones.
          </p>
          <label>
            Display name
            <input
              aria-label="Example display name"
              value={w.draft.label}
              onChange={(e) =>
                w.setDraft({ ...w.draft, label: e.target.value })
              }
            />
          </label>
          <label>
            LaTeX
            <textarea
              aria-label="Example LaTeX"
              value={w.draft.latex}
              onChange={(e) =>
                w.setDraft({ ...w.draft, latex: e.target.value })
              }
            />
          </label>
          <button onClick={() => w.setDraft({ ...example })}>
            Restore example
          </button>
        </details>
      )}
      {!!node.applicableUnitIds.length && (
        <details>
          <summary>Compatible units · {node.applicableUnitIds.length}</summary>
          <p className="muted">
            Upstream compatibility references; these are not explicit uses or
            verified conversion choices.
          </p>
          <div className="unit-cloud">
            {node.applicableUnitIds.map((id) => (
              <UnitLink key={id} id={id} />
            ))}
          </div>
        </details>
      )}
      <h3>Relationships · {related.length}</h3>
      {related.map((e) => {
        const id = e.source === node.id ? e.target : e.source;
        return (
          <button className="related" key={e.id} onClick={() => w.select(id)}>
            <span>{w.nodes.find((n) => n.id === id)?.label || short(id)}</span>
            <small>
              {e.source === node.id ? "Outgoing" : "Incoming"}:{" "}
              {w.nodes.find((n) => n.id === e.source)?.label} → {e.label} →{" "}
              {w.nodes.find((n) => n.id === e.target)?.label} ·{" "}
              {e.provenance.origin}
            </small>
          </button>
        );
      })}
      {!related.length && (
        <p className="muted">
          No explicit graph relationships in this source. Shared dimensions
          alone do not create a link.
        </p>
      )}
      <details>
        <summary>Stable identity & provenance</summary>
        <code>{node.id}</code>
        <p>Origin: {node.provenance.origin}</p>
        <p>
          Classification:{" "}
          {node.classification?.kind ||
            (node.kind === "quantity"
              ? "General quantity / classification not reviewed"
              : node.kind === "constant"
                ? "Physical constant (imported)"
                : "Authored equation")}
        </p>
      </details>
      <a href={node.provenance.sourceUrl} target="_blank" rel="noreferrer">
        {authored
          ? "DOE Fundamentals Handbook · equation (2-15)"
          : "Open QUDT reference"}{" "}
        ↗
      </a>
    </section>
  );
}
const components = {
  library: LibraryPanel,
  graph: GraphPanel,
  inspector: InspectorPanel,
};
const FixedTab = (props: IDockviewPanelHeaderProps) => (
  <DockviewDefaultTab {...props} hideClose />
);
function ready(event: DockviewReadyEvent) {
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
    initialWidth: 340,
  });
  event.api.getPanel("library")?.api.setSize({ width: 280 });
  event.api.getPanel("inspector")?.api.setSize({ width: 340 });
}
export function App() {
  const [data, setData] = useState<Dataset>();
  const [error, setError] = useState("");
  const [selectedId, setSelected] = useState<string>();
  const [unitId, setUnit] = useState<string>();
  const [draft, setDraft] = useState({ ...example });
  const [tab, setTab] = useState("graph");
  const [mobile, setMobile] = useState(
    matchMedia("(max-width: 800px)").matches,
  );
  const [offline, setOffline] = useState<OfflineStatus>({
    state: "preparing",
    message: "Checking offline preview…",
  });
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/qudt-graph.json`)
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Dataset request failed (${response.status})`);
        const d = (await response.json()) as Dataset;
        if (
          d.schemaVersion !== 1 ||
          d.nodes.length !== d.report.counts.eligibleNodes
        )
          throw new Error("Baseline is incompatible or incomplete.");
        setData(d);
      })
      .catch((e) => setError(String(e)));
    const m = matchMedia("(max-width: 800px)");
    const change = () => setMobile(m.matches);
    m.addEventListener("change", change);
    let cleanup: (() => void) | undefined;
    let stopped = false;
    void prepareOfflinePreview(setOffline).then((fn) => {
      if (stopped) fn();
      else cleanup = fn;
    });
    return () => {
      stopped = true;
      cleanup?.();
      m.removeEventListener("change", change);
    };
  }, []);
  const nodes = useMemo(
    () => (data ? [...data.nodes, draft] : []),
    [data, draft],
  );
  const units = useMemo(
    () => (data ? [...data.units, intervalUnit] : []),
    [data],
  );
  if (!data)
    return (
      <main className="loading">
        <span className="brand-mark">H</span>
        <h1>
          {error
            ? "The atlas could not open"
            : "Opening the reference universe…"}
        </h1>
        <p>{error || "Loading the full pinned QUDT baseline."}</p>
        {error && <button onClick={() => location.reload()}>Try again</button>}
      </main>
    );
  const select = (id: string) => {
    setSelected(id);
    setUnit(undefined);
    if (mobile) setTab("inspector");
  };
  return (
    <Context.Provider
      value={{
        data,
        nodes,
        units,
        selectedId,
        unitId,
        select,
        openUnit: setUnit,
        draft,
        setDraft,
      }}
    >
      <div className="app-shell">
        <header>
          <div className="brand">
            <span className="brand-mark">
              H<span>↗</span>
            </span>
            <div>
              <h1>
                HVACR <span>Knowledge atlas</span>
              </h1>
              <p>A working map of measurable things</p>
            </div>
          </div>
          <div className="header-meta">
            <span className="prototype">M0 · FEASIBILITY</span>
            <span>QUDT {data.source.version}</span>
          </div>
        </header>
        <div className="workspace">
          {mobile ? (
            <>
              <nav className="mobile-nav" aria-label="Workspace panels">
                {["graph", "library", "inspector"].map((t) => (
                  <button
                    key={t}
                    aria-pressed={tab === t}
                    onClick={() => setTab(t)}
                  >
                    {t === "graph"
                      ? "Map"
                      : t === "library"
                        ? "Search"
                        : "Inspector"}
                  </button>
                ))}
              </nav>
              <div className="mobile-panels">
                <div
                  className={
                    tab === "graph" ? "mobile-panel" : "mobile-panel hidden"
                  }
                >
                  <GraphPanel />
                </div>
                <div
                  className={
                    tab === "library" ? "mobile-panel" : "mobile-panel hidden"
                  }
                >
                  <LibraryPanel />
                </div>
                <div
                  className={
                    tab === "inspector" ? "mobile-panel" : "mobile-panel hidden"
                  }
                >
                  <InspectorPanel />
                </div>
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
                    ? "Local feasibility build"
                    : "Offline preview unavailable"}
          </span>
          <span title={offline.message}>
            {offline.state === "ready"
              ? "Reopening must be verified on each device."
              : "Explore · inspect · test the full import"}
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
    </Context.Provider>
  );
}
