import { Icon } from "../components/Icon";
import { useEffect, useMemo, useRef } from "react";
import { MathText } from "../components/Math";
import { unitLatex } from "../domain/notation";
import {
  preferredUnitId,
  unitConversionStatus,
} from "../domain/unit-preferences";
import { useWorkspace } from "./context";
import { NodeLink, TextContent } from "./common";
export function UnitPanel() {
  const w = useWorkspace();
  const scroll = useRef<HTMLElement>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ top: 0 });
  }, [w.unitId]);
  const unit = w.index.unitsById.get(w.unitId || "");
  const preferredBy = useMemo(
    () =>
      unit
        ? w.nodes.filter(
            (n) =>
              preferredUnitId(n, w.preferences, w.index.unitsById) === unit.id,
          )
        : [],
    [unit, w.nodes, w.preferences, w.index],
  );
  const uses = unit ? w.index.unitUseBacklinks.get(unit.id) || [] : [];
  const applicable = unit
    ? w.index.unitApplicableBacklinks.get(unit.id) || []
    : [];
  return (
    <section
      ref={scroll}
      className="unit-inspector panel-scroll"
      data-testid="unit-inspector"
    >
      <button className="text-button" onClick={w.showInspector}>
        <Icon name="arrow-left" /> Back to concept
      </button>
      <span className="eyebrow">UNIT REFERENCE</span>
      {!unit ? (
        <>
          <h2>
            {w.unitId
              ? "Missing unit reference"
              : "A dictionary of exact units"}
          </h2>
          <p>
            {w.unitId
              ? "This identity is not present in the loaded baseline. No replacement unit has been inferred."
              : "Open any unit link, or search the unit dictionary in the Library."}
          </p>
          {w.unitId && <code>{w.unitId}</code>}
          <p>
            {w.units.length.toLocaleString()} unit records, kept separately from
            learning nodes.
          </p>
        </>
      ) : (
        <>
          <h2>{unit.label}</h2>
          <div className="math-card">
            <MathText latex={unitLatex(unit)} display />
          </div>
          <span
            className={
              "badge " +
              (unit.provenance.origin === "authored" ? "authored" : "")
            }
          >
            {unit.provenance.origin === "authored"
              ? "APP-AUTHORED UNIT"
              : `QUDT ${unit.provenance.version || w.data.source.version}`}
          </span>
          <TextContent
            text={unit.description || "No source definition supplied."}
          />
          {unit.id === "http://qudt.org/vocab/unit/BTU_IT-PER-LB-DEG_F" && (
            <p className="notice">
              Source inconsistency: this record's identity is International
              Table (IT), but its retained description says thermochemical. The
              app preserves the IT identity and flags the prose conflict; no
              conversion is inferred from the description.
            </p>
          )}
          {unit.deprecated && (
            <p className="notice">Upstream marks this unit as deprecated.</p>
          )}
          <h3>Explicit uses · {uses.length}</h3>
          <p className="muted">
            Recorded values, explicit unit references, and equation conventions.
            Each concept is counted once.
          </p>
          {uses.map((n) => (
            <NodeLink key={n.id} id={n.id} />
          ))}
          {!uses.length && (
            <p className="muted">No explicit uses in this baseline.</p>
          )}
          <details>
            <summary>Display preferences · {preferredBy.length}</summary>
            <p className="muted">
              US customary defaults and this session's display choices. These
              are separate from source or equation uses.
            </p>
            {preferredBy.map((n) => (
              <NodeLink key={n.id} id={n.id} />
            ))}
          </details>
          <details>
            <summary>Source applicability · {applicable.length}</summary>
            <p className="muted">
              Upstream references only. These are neither explicit uses nor a
              reviewed conversion list.
            </p>
            {applicable.map((n) => (
              <NodeLink key={n.id} id={n.id} />
            ))}
          </details>
          <details>
            <summary>
              Unit's quantity-kind references · {unit.quantityKindIds.length}
            </summary>
            {unit.quantityKindIds.map((id) => (
              <NodeLink key={id} id={id} />
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
            <p>{unitConversionStatus(unit)}</p>
            <p className="muted">
              Absent offset metadata is not interpreted as zero. Pressure
              reference and temperature-interval context remain explicit.
            </p>
          </details>
          <a href={unit.provenance.sourceUrl} target="_blank" rel="noreferrer">
            Open reference <Icon name="arrow-up-right" />
          </a>
        </>
      )}
    </section>
  );
}
