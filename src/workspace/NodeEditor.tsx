import { useEffect, useId, useState } from "react";
import { MathText } from "../components/Math";
import type { LearningNode } from "../domain/types";
import { useWorkspace } from "./context";
import { lines, MarkdownEditor, ReferencePicker } from "./EditorFields";

function newNode(kind: LearningNode["kind"]): LearningNode {
  const id = `urn:hvacr:node:${crypto.randomUUID()}`;
  return {
    id,
    kind,
    label: "",
    unitIds: [],
    applicableUnitIds: [],
    quantityKindIds: [],
    dimensionIds: [],
    sourceTypes: [],
    provenance: {
      origin: "authored",
      sourceId: id,
      sourceUrl: "urn:hvacr:local-authoring",
    },
    ...(kind === "equation" ? { bindings: [] } : {}),
    ...(kind === "constant"
      ? {
          constantSubtype: "assumed property value",
          valueStatus: "assumed" as const,
          constantValues: [
            {
              id: `${id}:value:${crypto.randomUUID()}`,
              value: "",
              unitIds: [],
              sourceUrls: [],
            },
          ],
        }
      : {}),
  };
}
export function NodeEditor({
  node,
  kind = "quantity",
  onClose,
}: {
  node?: LearningNode;
  kind?: LearningNode["kind"];
  onClose?: () => void;
}) {
  const w = useWorkspace();
  const draftId = useId();
  const { registerDraft } = w;
  useEffect(() => {
    registerDraft(draftId, true);
    return () => registerDraft(draftId, false);
  }, [draftId, registerDraft]);
  const [draft, setDraft] = useState<LearningNode>(() =>
    structuredClone(node || newNode(kind)),
  );
  const [error, setError] = useState("");
  const set = <K extends keyof LearningNode>(key: K, value: LearningNode[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const unitsChanged = draft.constantValues?.some((value) => {
    const old = node?.constantValues?.find((v) => v.id === value.id);
    return (
      !!old?.value &&
      [...old.unitIds].sort().join("|") !== [...value.unitIds].sort().join("|")
    );
  });
  const save = () => {
    setError("");
    if (!draft.label.trim()) {
      setError("Give this concept a name.");
      return;
    }
    if (unitsChanged) {
      setError(
        "Numerical conversion is unavailable. Keep the recorded unit, or first clear the recorded value and save. Then enter an independently verified value and its unit, with updated assumptions and source.",
      );
      return;
    }
    const clean = (items: string[] | undefined) =>
      (items || []).map((v) => v.trim()).filter(Boolean);
    const classification =
      draft.classification ||
      (node?.classification
        ? {
            kind: "general-quantity",
            status: "review-needed" as const,
            rationale: "Classification cleared by author.",
            sourceUrls: [],
            origin: "authored" as const,
          }
        : undefined);
    const prepared: LearningNode = {
      ...draft,
      classification,
      label: draft.label.trim(),
      assumptions: clean(draft.assumptions),
      sourceUrls: clean(draft.sourceUrls),
      ...(draft.classification
        ? {
            classification: {
              ...draft.classification,
              sourceUrls: clean(draft.classification.sourceUrls),
            },
          }
        : {}),
      ...(draft.constantValues
        ? {
            constantValues: draft.constantValues.map((v) => ({
              ...v,
              sourceUrls: clean(v.sourceUrls),
            })),
          }
        : {}),
    };
    const {
      id,
      kind: _kind,
      provenance: _provenance,
      sourceTypes: _sourceTypes,
      ...patch
    } = prepared;
    if (!node && prepared.sourceUrls?.[0])
      prepared.provenance = {
        ...draft.provenance,
        sourceUrl: prepared.sourceUrls[0],
      };
    if (
      w.perform(
        node
          ? {
              type: "node.edit",
              id,
              patch: { ...patch, label: prepared.label },
            }
          : { type: "node.create", node: prepared },
        `${node ? "Edit" : "Create"} ${prepared.label}`,
      )
    ) {
      onClose?.();
      w.select(id);
    }
  };
  return (
    <form
      className="authoring-form node-editor"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <h3>
        {node ? "Edit" : "Create"} {draft.kind}
      </h3>
      <p className="muted">
        Save creates one undo step for this editing session. Cancel leaves the
        concept unchanged.
      </p>
      <label>
        Name
        <input
          aria-label="Concept name"
          required
          maxLength={300}
          value={draft.label}
          onChange={(e) => set("label", e.target.value)}
        />
      </label>
      <label>
        Symbol
        <input
          aria-label="Concept symbol"
          maxLength={300}
          value={draft.symbol || ""}
          onChange={(e) => set("symbol", e.target.value)}
        />
      </label>
      <label>
        LaTeX
        <textarea
          aria-label="Concept LaTeX"
          maxLength={4000}
          value={draft.latex || ""}
          onChange={(e) => set("latex", e.target.value)}
        />
      </label>
      <div className="math-card" aria-label="LaTeX preview">
        {draft.latex ? (
          <MathText latex={draft.latex} display />
        ) : (
          <span className="muted">LaTeX preview</span>
        )}
      </div>
      <label>
        Definition
        <textarea
          aria-label="Concept definition"
          rows={3}
          value={draft.description || ""}
          onChange={(e) => set("description", e.target.value)}
        />
      </label>
      {draft.kind === "quantity" && (
        <details open>
          <summary>Scientific classification</summary>
          <p className="muted">
            Classification is independent of topic groups. Leave the role blank
            when it has not been assessed.
          </p>
          <label>
            Classification role
            <input
              aria-label="Classification role"
              value={draft.classification?.kind || ""}
              placeholder="For example, thermodynamic-state-property"
              onChange={(e) =>
                set(
                  "classification",
                  e.target.value
                    ? {
                        kind: e.target.value,
                        status: draft.classification?.status || "review-needed",
                        rationale: draft.classification?.rationale || "",
                        sourceUrls: draft.classification?.sourceUrls || [],
                        context: draft.classification?.context || "",
                        origin: "authored",
                      }
                    : undefined,
                )
              }
            />
          </label>
          {draft.classification && (
            <>
              <label>
                Classification status
                <select
                  value={draft.classification.status}
                  onChange={(e) =>
                    set("classification", {
                      ...draft.classification!,
                      status: e.target.value as "review-needed" | "reviewed",
                      origin: "authored",
                    })
                  }
                >
                  <option value="review-needed">Needs review</option>
                  <option value="reviewed">Reviewed</option>
                </select>
              </label>
              <label>
                Classification rationale
                <textarea
                  value={draft.classification.rationale}
                  onChange={(e) =>
                    set("classification", {
                      ...draft.classification!,
                      rationale: e.target.value,
                      origin: "authored",
                    })
                  }
                />
              </label>
              <label>
                Classification context
                <input
                  value={draft.classification.context || ""}
                  onChange={(e) =>
                    set("classification", {
                      ...draft.classification!,
                      context: e.target.value,
                      origin: "authored",
                    })
                  }
                />
              </label>
              <label>
                Classification source URLs (one per line)
                <textarea
                  value={draft.classification.sourceUrls.join("\n")}
                  onChange={(e) =>
                    set("classification", {
                      ...draft.classification!,
                      sourceUrls: lines(e.target.value),
                      origin: "authored",
                    })
                  }
                />
              </label>
            </>
          )}
        </details>
      )}
      <details>
        <summary>Explicit unit references · {draft.unitIds.length}</summary>
        <p className="muted">
          These identify units used by this concept. Adding a unit does not
          assert conversion compatibility.
        </p>
        {draft.unitIds.map((id, i) => (
          <div className="editor-subrecord" key={i}>
            <ReferencePicker
              kind="unit"
              label={`Explicit unit ${i + 1}`}
              value={id}
              onChange={(value) =>
                set(
                  "unitIds",
                  draft.unitIds.map((v, n) => (n === i ? value : v)),
                )
              }
            />
            <button
              type="button"
              onClick={() =>
                set(
                  "unitIds",
                  draft.unitIds.filter((_, n) => n !== i),
                )
              }
            >
              Remove unit reference
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => set("unitIds", [...draft.unitIds, ""])}
        >
          Add unit reference
        </button>
      </details>
      {draft.kind === "constant" && (
        <fieldset>
          <legend>Contextual value</legend>
          <label>
            Constant subtype
            <input
              aria-label="Constant subtype"
              value={draft.constantSubtype || ""}
              onChange={(e) => set("constantSubtype", e.target.value)}
              placeholder="Physical constant, conversion factor, empirical coefficient…"
            />
          </label>
          <label>
            Value status
            <select
              aria-label="Value status"
              value={draft.valueStatus || ""}
              onChange={(e) =>
                set(
                  "valueStatus",
                  (e.target.value || undefined) as
                    "exact" | "rounded" | "assumed" | undefined,
                )
              }
            >
              <option value="">Not recorded</option>
              <option value="exact">Exact</option>
              <option value="rounded">Rounded</option>
              <option value="assumed">Assumed</option>
            </select>
          </label>
          {(draft.constantValues || []).map((value, i) => {
            const update = (patch: Partial<typeof value>) =>
              set(
                "constantValues",
                draft.constantValues!.map((v, n) =>
                  n === i ? { ...v, ...patch } : v,
                ),
              );
            return (
              <div className="editor-subrecord" key={value.id}>
                <label>
                  Recorded value {i + 1}
                  <input
                    aria-label={`Recorded value ${i + 1}`}
                    inputMode="decimal"
                    value={value.value || ""}
                    onChange={(e) => update({ value: e.target.value })}
                  />
                </label>
                {(value.unitIds.length ? value.unitIds : [""]).map(
                  (unitId, j) => (
                    <ReferencePicker
                      key={j}
                      kind="unit"
                      label={`Value ${i + 1} unit ${j + 1}`}
                      value={unitId}
                      onChange={(id) =>
                        update({
                          unitIds: value.unitIds.length
                            ? value.unitIds.map((v, n) => (n === j ? id : v))
                            : [id],
                        })
                      }
                    />
                  ),
                )}
                <label>
                  Value source URLs (one per line)
                  <textarea
                    aria-label={`Value ${i + 1} source URLs`}
                    value={value.sourceUrls.join("\n")}
                    onChange={(e) =>
                      update({ sourceUrls: lines(e.target.value) })
                    }
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "constantValues",
                      draft.constantValues!.filter((_, n) => n !== i),
                    )
                  }
                >
                  Remove recorded value
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() =>
              set("constantValues", [
                ...(draft.constantValues || []),
                {
                  id: `${draft.id}:value:${crypto.randomUUID()}`,
                  value: "",
                  unitIds: [],
                  sourceUrls: [],
                },
              ])
            }
          >
            Add recorded value
          </button>
          <p className="notice">
            No numerical conversion is available. For an existing number, clear
            its value and save before changing its unit; then record an
            independently verified value and context. A display preference never
            converts this value.
          </p>
          {unitsChanged && (
            <p className="notice">
              The recorded unit changed. Restore that unit before saving this
              edit.
            </p>
          )}
          <label>
            Derivation
            <textarea
              aria-label="Constant derivation"
              value={draft.derivation || ""}
              onChange={(e) => set("derivation", e.target.value)}
            />
          </label>
        </fieldset>
      )}
      {draft.kind === "equation" && (
        <fieldset>
          <legend>Explicit equation participants</legend>
          <p className="muted">
            Bind each symbol to a stable concept and, where needed, an exact
            unit convention. LaTeX is never parsed for meaning. Saving maintains
            the equation-participation links.
          </p>
          {(draft.bindings || []).map((binding, i) => {
            const update = (patch: Partial<typeof binding>) =>
              set(
                "bindings",
                draft.bindings!.map((b, n) =>
                  n === i ? { ...b, ...patch } : b,
                ),
              );
            return (
              <div className="editor-subrecord" key={i}>
                <label>
                  Participant {i + 1} symbol
                  <input
                    aria-label={`Participant ${i + 1} symbol`}
                    value={binding.symbol}
                    onChange={(e) => update({ symbol: e.target.value })}
                  />
                </label>
                <ReferencePicker
                  kind="node"
                  label={`Participant ${i + 1} concept`}
                  value={binding.nodeId}
                  onChange={(nodeId) => update({ nodeId })}
                />
                <ReferencePicker
                  kind="unit"
                  label={`Participant ${i + 1} unit`}
                  value={binding.unitId || ""}
                  optional
                  onChange={(unitId) => update({ unitId: unitId || undefined })}
                />
                <label>
                  Participant {i + 1} role
                  <input
                    value={binding.role || ""}
                    onChange={(e) => update({ role: e.target.value })}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "bindings",
                      draft.bindings!.filter((_, n) => n !== i),
                    )
                  }
                >
                  Remove participant {i + 1}
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() =>
              set("bindings", [
                ...(draft.bindings || []),
                { symbol: "", nodeId: "" },
              ])
            }
          >
            Add participant
          </button>
        </fieldset>
      )}
      <label>
        Conditions and assumptions (one per line)
        <textarea
          aria-label="Conditions and assumptions"
          rows={3}
          value={(draft.assumptions || []).join("\n")}
          onChange={(e) => set("assumptions", lines(e.target.value))}
        />
      </label>
      <label>
        Source URLs (one per line)
        <textarea
          aria-label="Concept source URLs"
          value={(draft.sourceUrls || []).join("\n")}
          onChange={(e) => set("sourceUrls", lines(e.target.value))}
        />
      </label>
      <MarkdownEditor
        value={draft.notes || ""}
        onChange={(value) => set("notes", value)}
      />
      <details>
        <summary>Stable identity</summary>
        <code>{draft.id}</code>
        <p className="muted">
          Name, symbol, and notation edits preserve this identity and every
          reference to it.
        </p>
      </details>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <div className="action-row editor-actions">
        <button type="submit">Save {draft.kind}</button>
        <button type="button" onClick={onClose}>
          Cancel edit
        </button>
      </div>
    </form>
  );
}
