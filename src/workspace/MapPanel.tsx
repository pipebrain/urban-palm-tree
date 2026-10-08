import { useMemo } from "react";
import { Graph } from "../graph/Graph";
import { groupStyles } from "../graph/model";
import { describeRelationship } from "../domain/semantics";
import type { MapFilters } from "../domain/browsing";
import { useWorkspace } from "./context";
export function MapPanel() {
  const w = useWorkspace();
  const styles = useMemo(() => groupStyles(w.groups), [w.groups]);
  const nodes = useMemo(
    () =>
      w.view.nodes.map((n) => ({
        ...n,
        authored: n.provenance.origin === "authored",
        classificationKind: n.classification?.kind,
        ...styles.get(n.id),
      })),
    [w.view.nodes, styles],
  );
  const relations = useMemo(
    () =>
      [
        ...new Map(
          w.edges.map((e) => [e.predicate, describeRelationship(e).label]),
        ).entries(),
      ].sort((a, b) => a[1].localeCompare(b[1])),
    [w.edges],
  );
  const set = <K extends keyof MapFilters>(key: K, value: MapFilters[K]) =>
    w.setFilters({ ...w.filters, [key]: value });
  const filtered =
    w.filters.kind !== "all" ||
    w.filters.classification !== "all" ||
    w.filters.origin !== "all" ||
    w.filters.predicate !== "all" ||
    !w.filters.includeDeprecated ||
    !!w.filters.focus ||
    !!w.groupFilter;
  const curated = w.excludedIds.length > 0;
  const selectedGroup = w.groups.find((g) => g.id === w.groupFilter);
  return (
    <div className="map-panel">
      <details className="map-filters">
        <summary>
          Map filters{" "}
          <span>
            {filtered || curated
              ? `${nodes.length.toLocaleString()} of ${w.nodes.length.toLocaleString()}`
              : "Full universe"}
          </span>
        </summary>
        <div className="map-filter-grid">
          <label>
            Group
            <select
              aria-label="Map group"
              value={w.groupFilter || ""}
              onChange={(e) => w.setGroupFilter(e.target.value || null)}
            >
              <option value="">All groups and ungrouped</option>
              {w.groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select
              aria-label="Map node type"
              value={w.filters.kind}
              onChange={(e) =>
                set("kind", e.target.value as MapFilters["kind"])
              }
            >
              <option value="all">All types</option>
              <option value="quantity">Quantities</option>
              <option value="constant">Constants</option>
              <option value="equation">Equations</option>
            </select>
          </label>
          <label>
            Quantity subtype
            <select
              aria-label="Map classification"
              value={w.filters.classification}
              onChange={(e) => set("classification", e.target.value)}
            >
              <option value="all">All classifications</option>
              <option value="thermodynamic-state-property">
                State properties
              </option>
              <option value="process-transfer">Process transfers</option>
              <option value="transfer-rate">Transfer rates</option>
              <option value="flow-rate">Flow rates</option>
              <option value="unreviewed">Not yet reviewed</option>
            </select>
          </label>
          <label>
            Source
            <select
              aria-label="Map source"
              value={w.filters.origin}
              onChange={(e) =>
                set("origin", e.target.value as MapFilters["origin"])
              }
            >
              <option value="all">All sources</option>
              <option value="qudt">QUDT</option>
              <option value="authored">App-authored</option>
            </select>
          </label>
          <label>
            Relationships
            <select
              aria-label="Map relationship"
              value={w.filters.predicate}
              onChange={(e) => set("predicate", e.target.value)}
            >
              <option value="all">All explicit links</option>
              {relations.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={w.filters.includeDeprecated}
            onChange={(e) => set("includeDeprecated", e.target.checked)}
          />
          Include deprecated records
        </label>
        <p className="muted">
          Filters change this view only. A relationship filter keeps matching
          nodes, including isolates.{" "}
          {curated &&
            `${w.excludedIds.length} excluded nodes remain available in Search / Library.`}
        </p>
      </details>
      {filtered && (
        <div className="view-context">
          <span>
            {w.filters.focus
              ? `${w.filters.focus.depth}-hop neighbourhood · ${w.index.nodesById.get(w.filters.focus.id)?.label || "Missing concept"}`
              : selectedGroup
                ? `Group · ${selectedGroup.name}`
                : "Filtered map"}
          </span>
          <button onClick={w.resetMap}>Reset map</button>
        </div>
      )}
      <div className="map-canvas">
        <Graph
          nodes={nodes}
          edges={w.view.edges}
          selectedId={w.selectedId}
          onSelect={w.select}
          placements={w.placements}
          onPlacement={w.place}
          canEdit={w.editMode}
          totalNodeCount={w.nodes.length}
          viewDescription={
            w.filters.focus
              ? "Focused neighbourhood"
              : selectedGroup
                ? `Group · ${selectedGroup.name}`
                : filtered
                  ? "Filtered map"
                  : curated
                    ? "Curated map · exclusions are reversible"
                    : "Full imported universe"
          }
          focusRequest={w.focusRequest}
          fitRequest={w.fitRequest}
        />
      </div>
    </div>
  );
}
