import { Icon } from "../components/Icon";
import { useMemo, useState } from "react";
import { MathText } from "../components/Math";
import { matchesSearch } from "../domain/browsing";
import { unitLatex } from "../domain/notation";
import { classificationLabel } from "../domain/classifications";
import { useWorkspace } from "./context";
import { shortId } from "./common";
import { GroupsPanel } from "./GroupsPanel";
import type { LearningNode } from "../domain/types";
export function LibraryPanel() {
  const w = useWorkspace();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [dictionary, setDictionary] = useState(false);
  const [limit, setLimit] = useState(80);
  const [newKind, setNewKind] = useState<LearningNode["kind"]>("quantity");
  const [excludedOnly, setExcludedOnly] = useState(false);
  const matches = useMemo(
    () =>
      w.nodes.filter(
        (n) =>
          (kind === "all" || n.kind === kind) &&
          matchesSearch(n, query) &&
          (!excludedOnly || w.excludedIds.includes(n.id)),
      ),
    [w.nodes, kind, query, excludedOnly, w.excludedIds],
  );
  const units = useMemo(
    () => w.units.filter((u) => matchesSearch(u, query)),
    [w.units, query],
  );
  const count = dictionary ? units.length : matches.length;
  return (
    <section className="library panel-scroll">
      <div className="panel-intro">
        <span className="eyebrow">EXPLORE & AUTHOR</span>
        <h2>The reference library</h2>
        <p>Find a concept. Follow its relationships.</p>
      </div>
      <div className="create-concept">
        <label className="sr-only" htmlFor="new-concept-kind">
          New concept type
        </label>
        <select
          id="new-concept-kind"
          aria-label="New concept type"
          value={newKind}
          onChange={(e) => setNewKind(e.target.value as LearningNode["kind"])}
        >
          <option value="quantity">Quantity</option>
          <option value="equation">Equation</option>
          <option value="constant">Constant</option>
        </select>
        <button onClick={() => w.startCreate(newKind)}>Create concept</button>
      </div>
      <GroupsPanel />
      <div className="filter-tabs" aria-label="Library collection">
        <button
          aria-pressed={!dictionary}
          onClick={() => {
            setDictionary(false);
            setLimit(80);
          }}
        >
          Concepts
        </button>
        <button
          aria-pressed={dictionary}
          onClick={() => {
            setDictionary(true);
            setLimit(80);
          }}
        >
          Unit dictionary
        </button>
      </div>
      <label className="search">
        <Icon name="search" />
        <input
          aria-label={
            dictionary ? "Search unit dictionary" : "Search all nodes"
          }
          placeholder="Name, symbol, or exact ID…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(80);
          }}
        />
      </label>
      {!dictionary && (
        <div className="filter-tabs" aria-label="Search category">
          {["all", "quantity", "constant", "equation"].map((k) => (
            <button
              key={k}
              aria-pressed={kind === k}
              onClick={() => {
                setKind(k);
                setLimit(80);
              }}
            >
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
      )}
      {!dictionary && (
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={excludedOnly}
            onChange={(e) => {
              setExcludedOnly(e.target.checked);
              setLimit(80);
            }}
          />
          Excluded concepts only ({w.excludedIds.length})
        </label>
      )}
      <div className="list-heading">
        <span>{count.toLocaleString()} results</span>
        <span>{dictionary ? "Exact unit identities" : "QUDT + authored"}</span>
      </div>
      <div className="node-list">
        {dictionary
          ? units.slice(0, limit).map((u) => (
              <button
                className="node-row"
                key={u.id}
                onClick={() => w.openUnit(u.id)}
              >
                <span>
                  <strong>{u.label}</strong>
                  <small>{shortId(u.id)}</small>
                  <MathText
                    latex={unitLatex(u, w.authoring.unitOverrides[u.id]?.latex)}
                  />
                </span>
                <span className="row-arrow">
                  <Icon name="arrow-up-right" />
                </span>
              </button>
            ))
          : matches.slice(0, limit).map((n) => (
              <button
                key={n.id}
                data-node-id={n.id}
                className={
                  w.selectedId === n.id ? "node-row active" : "node-row"
                }
                onClick={() => w.select(n.id)}
              >
                <span
                  className={`node-dot ${n.kind} ${n.classification?.kind === "thermodynamic-state-property" ? "state-property" : ""}`}
                  style={{
                    backgroundColor: w.groups.find((g) =>
                      g.nodeIds.includes(n.id),
                    )?.color,
                  }}
                />
                <span>
                  <strong>{n.label}</strong>
                  <small>
                    {n.provenance.origin === "authored"
                      ? "Authored concept"
                      : n.kind === "quantity" && n.classification
                        ? classificationLabel(n.classification)
                        : "Physical constant"}
                  </small>
                  <small className="identity-hint">{shortId(n.id)}</small>
                  {w.excludedIds.includes(n.id) && (
                    <small className="excluded-label">
                      Excluded from map · available to restore
                    </small>
                  )}
                </span>
                <span className="row-arrow">
                  <Icon name="arrow-up-right" />
                </span>
              </button>
            ))}
      </div>
      {count > limit && (
        <button className="load-more" onClick={() => setLimit(limit + 80)}>
          Show more results ({Math.min(limit, count)} of {count})
        </button>
      )}
      {!count && <p>No matches. Try a broader name or an exact identifier.</p>}
      <div className="library-foot">
        Search does not filter the map.
        <br />
        Names and symbols never replace stable IDs.
      </div>
    </section>
  );
}
