import { useMemo, useState } from "react";
import { MathText } from "../components/Math";
import { matchesSearch } from "../domain/browsing";
import { unitLatex } from "../domain/notation";
import { classificationLabel } from "../domain/classifications";
import { useWorkspace } from "./context";
import { shortId } from "./common";
export function LibraryPanel() {
  const w = useWorkspace();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [dictionary, setDictionary] = useState(false);
  const [limit, setLimit] = useState(80);
  const matches = useMemo(
    () =>
      w.nodes.filter(
        (n) => (kind === "all" || n.kind === kind) && matchesSearch(n, query),
      ),
    [w.nodes, kind, query],
  );
  const units = useMemo(
    () => w.units.filter((u) => matchesSearch(u, query)),
    [w.units, query],
  );
  const count = dictionary ? units.length : matches.length;
  return (
    <section className="library panel-scroll">
      <div className="panel-intro">
        <span className="eyebrow">EXPLORE & CONNECT</span>
        <h2>The reference library</h2>
        <p>Find a concept. Follow its relationships.</p>
      </div>
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
        <span>⌕</span>
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
                  <MathText latex={unitLatex(u)} />
                </span>
                <span className="row-arrow">↗</span>
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
                />
                <span>
                  <strong>{n.label}</strong>
                  <small>
                    {n.provenance.origin === "authored"
                      ? "App-authored example"
                      : n.kind === "quantity" && n.classification
                        ? classificationLabel(n.classification)
                        : "Physical constant"}
                  </small>
                  <small className="identity-hint">{shortId(n.id)}</small>
                </span>
                <span className="row-arrow">↗</span>
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
