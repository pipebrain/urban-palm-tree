import { Icon } from "../components/Icon";
import { useEffect, useRef, useState } from "react";
import { MathText } from "../components/Math";
import { EXAMPLE_ID, example } from "../domain/example";
import { classificationLabel } from "../domain/classifications";
import { describeRelationship } from "../domain/semantics";
import {
  getUnitOptions,
  preferredUnitId,
  unitPreferenceContext,
} from "../domain/unit-preferences";
import type { LearningNode } from "../domain/types";
import { useWorkspace } from "./context";
import {
  NodeLink,
  SourceLinks,
  TextContent,
  UnitLink,
  shortId,
} from "./common";

function DisplayOverrides({ node }: { node: LearningNode }) {
  const w = useWorkspace();
  const [label, setLabel] = useState(node.label);
  const [latex, setLatex] = useState(node.latex || "");
  const source = w.sourceNodes.get(node.id)!;
  const changed = node.label !== source.label || node.latex !== source.latex;
  return (
    <details>
      <summary>Display overrides{changed ? " · changed" : ""}</summary>
      <p className="muted">
        Name and notation only. Apply to test stable links. Changes last in this
        tab; saving and full editing arrive in later milestones.
      </p>
      <label>
        Display name
        <input
          aria-label="Display name"
          maxLength={300}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </label>
      <label>
        Display LaTeX
        <textarea
          aria-label="Display LaTeX"
          maxLength={4000}
          value={latex}
          onChange={(e) => setLatex(e.target.value)}
        />
      </label>
      <div className="action-row">
        <button
          disabled={!label.trim()}
          onClick={() => w.override(node.id, { label: label.trim(), latex })}
        >
          Apply display
        </button>
        <button
          onClick={() => {
            w.override(node.id);
            setLabel(source.label);
            setLatex(source.latex || "");
          }}
        >
          Restore source display
        </button>
      </div>
      <p className="muted">Original name: {source.label}</p>
      {source.latex && <MathText latex={source.latex} />}
    </details>
  );
}
function UnitPreference({ node }: { node: LearningNode }) {
  const w = useWorkspace();
  const options = getUnitOptions(node, w.index.unitsById);
  const selected = preferredUnitId(node, w.preferences, w.index.unitsById);
  const option = options.find((o) => o.unit.id === selected);
  return (
    <section className="unit-preference">
      <h3>Preferred display unit</h3>
      {options.length ? (
        <>
          <label className="sr-only" htmlFor="unit-preference">
            Preferred display unit
          </label>
          <select
            id="unit-preference"
            aria-label="Preferred display unit"
            value={selected || ""}
            onChange={(e) => w.setPreference(node, e.target.value)}
          >
            {!selected && <option value="">Unresolved preference</option>}
            {options.map((o) => (
              <option key={o.unit.id} value={o.unit.id}>
                {o.displayLabel}
              </option>
            ))}
          </select>
          <div className="preference-current">
            {selected && <UnitLink id={selected} />}
            <small>
              {Object.hasOwn(w.preferences, node.id)
                ? "Session choice"
                : "US customary profile"}
            </small>
          </div>
          {Object.hasOwn(w.preferences, node.id) && (
            <button
              className="text-button"
              onClick={() => w.resetPreference(node.id)}
            >
              Restore default unit
            </button>
          )}
        </>
      ) : (
        <p className="notice">
          No reviewed unit preference for this concept yet.
        </p>
      )}
      <p className="muted">{unitPreferenceContext(node)}</p>
      {option && (
        <details>
          <summary>Why this exact unit?</summary>
          <p>{option.rationale}</p>
          <code>{option.unit.id}</code>
          <SourceLinks urls={option.sourceUrls} />
        </details>
      )}
      <p className="muted">
        Display choice only. Recorded values and equation conventions are
        unchanged; no numerical conversion is performed.
      </p>
    </section>
  );
}
function Welcome() {
  const w = useWorkspace();
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
        <Icon name="arrow-both" />
        <span>Flow</span>
        <Icon name="arrow-both" />
        <span>Temperature</span>
      </div>
      <p>
        Explore the complete eligible QUDT import. Select a concept to inspect
        its meaning, source, and explicit relationships.
      </p>
      <button className="example-card" onClick={() => w.select(EXAMPLE_ID)}>
        <span className="eyebrow">TRY THE HVACR EXAMPLE</span>
        <MathText latex={example.latex!} />
        <strong>
          Sensible heat transfer <Icon name="arrow-up-right" />
        </strong>
        <small>App-authored · DOE reference</small>
      </button>
      <h3>A full universe, with context</h3>
      <p>
        {w.data.report.counts.quantityNodes.toLocaleString()} quantity kinds,{" "}
        {w.data.report.counts.constantNodes} constants, and one authored
        equation. {w.units.length.toLocaleString()} units live separately in the
        reference library.
      </p>
      <p className="muted">
        State properties are reviewed quantity subtypes, drawn as hexagons.
        Unreviewed quantities stay visibly unreviewed. Units and source metadata
        do not add graph weight.
      </p>
      <details>
        <summary>Import coverage & limitations</summary>
        <p>
          {w.data.report.counts.isolatedNodes} imported isolates;{" "}
          {w.data.report.counts.deprecatedNodes} deprecated nodes retained;{" "}
          {w.data.report.counts.nodesWithoutMathSymbol} nodes with no source
          math symbol.
        </p>
        <p>
          {w.data.report.counts.technicalRecords.toLocaleString()} technical
          records are accounted for in the retained import, outside the learning
          graph.
        </p>
        {w.data.report.gaps.map((g, i) => (
          <p key={i}>{g}</p>
        ))}
        <h3>
          Unresolved source references ·{" "}
          {w.data.report.unresolvedReferences.length}
        </h3>
        <p className="muted">
          These targets have no subject record in the retained release. External
          provenance links may still identify valid resources; no learning nodes
          are invented for them.
        </p>
        {w.data.report.unresolvedReferences.map((r, i) => (
          <div className="unresolved-reference" key={`${r.source}:${i}`}>
            <NodeLink id={r.source} />
            <code>{r.predicate}</code>
            <p>
              Target: <code>{r.target}</code>
            </p>
          </div>
        ))}
        <p>
          Authored classifications and unit choices are limited reviews. QUDT
          does not supply a complete HVACR curriculum.
        </p>
      </details>
      <a href={w.data.source.releaseUrl} target="_blank" rel="noreferrer">
        QUDT {w.data.source.version} · source release{" "}
        <Icon name="arrow-up-right" />
      </a>
      <p className="attribution">
        {w.data.source.attribution}{" "}
        <a href={w.data.source.licenseUrl} target="_blank" rel="noreferrer">
          {w.data.source.license}
        </a>
      </p>
    </section>
  );
}
export function InspectorPanel() {
  const w = useWorkspace();
  const scroll = useRef<HTMLElement>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ top: 0 });
  }, [w.selectedId]);
  const [depth, setDepth] = useState<1 | 2>(1);
  const node = w.index.nodesById.get(w.selectedId || "");
  if (!w.selectedId) return <Welcome />;
  if (!node)
    return (
      <section className="inspector panel-scroll" data-testid="inspector">
        <h2>Missing concept reference</h2>
        <code>{w.selectedId}</code>
        <p>
          This record is absent from the loaded baseline. Its identity has not
          been replaced by a similar name or symbol.
        </p>
      </section>
    );
  const related = [
    ...new Map(
      [
        ...(w.index.outgoing.get(node.id) || []),
        ...(w.index.incoming.get(node.id) || []),
      ].map((e) => [e.id, e]),
    ).values(),
  ];
  const visible = w.view.nodes.some((n) => n.id === node.id);
  const authored = node.provenance.origin === "authored";
  const unresolved = w.data.report.unresolvedReferences.filter(
    (r) => r.source === node.id,
  );
  return (
    <section
      ref={scroll}
      className="inspector panel-scroll"
      data-testid="inspector"
      data-node-id={node.id}
    >
      <div className="inspector-top">
        <span className={"badge " + (authored ? "authored" : "")}>
          {authored ? "APP-AUTHORED EXAMPLE" : `QUDT ${w.data.source.version}`}
        </span>
        <span>{node.kind}</span>
      </div>
      <h2>{node.label}</h2>
      {node.latex && (
        <div className="math-card">
          <MathText latex={node.latex} display />
        </div>
      )}
      {node.classification && (
        <div className={"classification " + node.classification.status}>
          <strong>{classificationLabel(node.classification)}</strong>
          <details>
            <summary>
              {node.classification.status === "reviewed"
                ? "Reviewed classification"
                : "Classification needs review"}
            </summary>
            <p>{node.classification.rationale}</p>
            {node.classification.context && (
              <p>{node.classification.context}</p>
            )}
            {node.classification.origin && (
              <p className="muted">
                App-authored review · {node.classification.reviewedOn}
              </p>
            )}
            <SourceLinks urls={node.classification.sourceUrls} />
          </details>
        </div>
      )}
      <div className="node-navigation">
        {!visible && (
          <p className="notice">
            This concept is outside the current map view.
          </p>
        )}
        <button onClick={() => w.showOnMap(node.id)}>Show on map</button>
        <label className="sr-only" htmlFor="neighbourhood-depth">
          Neighbourhood depth
        </label>
        <select
          id="neighbourhood-depth"
          aria-label="Neighbourhood depth"
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value) as 1 | 2)}
        >
          <option value="1">1 hop</option>
          <option value="2">2 hops</option>
        </select>
        <button onClick={() => w.focus(node.id, depth)}>
          Focus neighbourhood
        </button>
      </div>
      <TextContent
        text={
          node.description ||
          "This source record does not include a description."
        }
      />
      {!!unresolved.length && (
        <div className="notice" data-testid="unresolved-source">
          <strong>Unresolved source references · {unresolved.length}</strong>
          <p>
            These targets have no subject record in this release. Their
            identities are retained without inventing missing content.
          </p>
          {unresolved.map((r, i) => (
            <details key={i}>
              <summary>{shortId(r.predicate)}</summary>
              <code>{r.predicate}</code>
              <p>
                Missing target: <code>{r.target}</code>
              </p>
            </details>
          ))}
        </div>
      )}
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
            Explicit concept bindings, with no fixed solve direction. Units
            below are this equation's convention.
          </p>
          {node.bindings.map((b, i) => (
            <div className="binding" key={`${b.nodeId}:${i}`}>
              <button
                className="text-button"
                onClick={() => w.select(b.nodeId)}
              >
                <MathText latex={b.symbol} />
                <span>
                  {w.index.nodesById.get(b.nodeId)?.label ||
                    b.role ||
                    shortId(b.nodeId)}
                  {b.role && <small className="binding-role">{b.role}</small>}
                </span>
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
      {node.kind === "quantity" && <UnitPreference node={node} />}
      <DisplayOverrides key={node.id} node={node} />
      {!!node.applicableUnitIds.length && (
        <details>
          <summary>
            Source applicable units · {node.applicableUnitIds.length}
          </summary>
          <p className="muted">
            Raw upstream references. These are not explicit uses or a reviewed
            preference list; source inconsistencies are retained.
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
        const meaning = describeRelationship(e);
        const id = e.source === node.id ? e.target : e.source;
        return (
          <div className="relationship" key={e.id}>
            <button className="related" onClick={() => w.select(id)}>
              <span>
                {w.index.nodesById.get(id)?.label || shortId(id)}{" "}
                <Icon name="arrow-up-right" />
              </span>
              <small>
                {w.index.nodesById.get(e.source)?.label} → {meaning.label} →{" "}
                {w.index.nodesById.get(e.target)?.label} · {e.provenance.origin}
              </small>
            </button>
            <details>
              <summary>Meaning & provenance</summary>
              <p>{meaning.description}</p>
              <code>{e.predicate}</code>
              <p className="muted">Relationship ID: {e.id}</p>
              <a href={e.provenance.sourceUrl} target="_blank" rel="noreferrer">
                Relationship source <Icon name="arrow-up-right" />
              </a>
            </details>
          </div>
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
        <p>
          Origin: {node.provenance.origin}
          <br />
          Source ID: {node.provenance.sourceId}
          <br />
          Version: {node.provenance.version || "App-authored record"}
        </p>
        <p>Quantity-kind references:</p>
        {node.quantityKindIds.map((id) => (
          <NodeLink key={id} id={id} />
        ))}
        <p className="muted">
          Dimension metadata:{" "}
          {node.dimensionIds.map(shortId).join(", ") || "not supplied"}. This
          metadata does not infer relationships or compatible units.
        </p>
      </details>
      <a href={node.provenance.sourceUrl} target="_blank" rel="noreferrer">
        {authored
          ? "DOE Fundamentals Handbook · equation (2-15)"
          : "Open QUDT reference"}{" "}
        <Icon name="arrow-up-right" />
      </a>
    </section>
  );
}
