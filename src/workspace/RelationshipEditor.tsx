import { useEffect, useId, useState } from "react";
import type { GraphEdge } from "../domain/types";
import { describeRelationship } from "../domain/semantics";
import { useWorkspace } from "./context";
import { lines, ReferencePicker } from "./EditorFields";

const relationshipTypes = [
  ["urn:hvacr:relationship:conceptual", "Related concept"],
  ["http://qudt.org/schema/qudt/specializationOf", "Specialization of"],
  ["urn:hvacr:relationship:assumed-value", "Assumed value for"],
  ["urn:hvacr:relationship:derivation", "Derived from"],
  ["http://www.w3.org/2004/02/skos/core#broader", "Has broader concept"],
  ["http://qudt.org/schema/qudt/organizedUnder", "Organized under"],
];
export function RelationshipEditor({
  edge,
  sourceId,
  onClose,
}: {
  edge?: GraphEdge;
  sourceId: string;
  onClose: () => void;
}) {
  const w = useWorkspace();
  const draftId = useId();
  const { registerDraft } = w;
  useEffect(() => {
    registerDraft(draftId, true, "inspector");
    return () => registerDraft(draftId, false, "inspector");
  }, [draftId, registerDraft]);
  const [draft, setDraft] = useState<GraphEdge>(() => {
    const id = `urn:hvacr:edge:${crypto.randomUUID()}`;
    return structuredClone(
      edge || {
        id,
        source: sourceId,
        target: "",
        predicate: relationshipTypes[0][0],
        label: relationshipTypes[0][1],
        notes: "",
        sourceUrls: [],
        provenance: {
          origin: "authored",
          sourceId: id,
          sourceUrl: "urn:hvacr:local-authoring",
        },
      },
    );
  });
  const set = <K extends keyof GraphEdge>(key: K, value: GraphEdge[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const meaning = describeRelationship(draft);
  const participation =
    draft.predicate === "urn:hvacr:relationship:equation-participation";
  const save = () => {
    const { id, provenance: _provenance, ...patch } = draft;
    const sourceUrls = (draft.sourceUrls || [])
      .map((v) => v.trim())
      .filter(Boolean);
    const next = { ...draft, label: draft.label.trim(), sourceUrls };
    if (!edge && sourceUrls[0])
      next.provenance = { ...next.provenance, sourceUrl: sourceUrls[0] };
    if (
      w.perform(
        edge
          ? {
              type: "edge.edit",
              id,
              patch: { ...patch, label: next.label, sourceUrls },
            }
          : { type: "edge.create", edge: next },
        `${edge ? "Edit" : "Create"} relationship`,
      )
    )
      onClose();
  };
  return (
    <form
      className="authoring-form relationship-editor"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <h3>{edge ? "Edit relationship" : "Create relationship"}</h3>
      {participation ? (
        <p className="notice">
          Equation participation follows explicit symbol bindings. Edit the
          equation's participants to change its endpoints.
        </p>
      ) : (
        <>
          <ReferencePicker
            kind="node"
            label="Relationship source concept"
            value={draft.source}
            onChange={(id) => set("source", id)}
          />
          <ReferencePicker
            kind="node"
            label="Relationship target concept"
            value={draft.target}
            onChange={(id) => set("target", id)}
          />
          <label>
            Relationship meaning
            <select
              aria-label="Relationship meaning"
              value={draft.predicate}
              onChange={(e) => {
                const selected = relationshipTypes.find(
                  ([id]) => id === e.target.value,
                )!;
                setDraft((d) => ({
                  ...d,
                  predicate: selected[0],
                  label: selected[1],
                }));
              }}
            >
              {!relationshipTypes.some(([id]) => id === draft.predicate) && (
                <option value={draft.predicate}>
                  {draft.label} (retained source type)
                </option>
              )}
              {relationshipTypes.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <p className="muted">{meaning.description}</p>
      <label>
        Relationship label
        <input
          aria-label="Relationship label"
          required
          value={draft.label}
          onChange={(e) => set("label", e.target.value)}
        />
      </label>
      <label>
        Relationship rationale
        <textarea
          aria-label="Relationship rationale"
          rows={3}
          value={draft.notes || ""}
          onChange={(e) => set("notes", e.target.value)}
        />
      </label>
      <label>
        Relationship source URLs (one per line)
        <textarea
          aria-label="Relationship source URLs"
          value={(draft.sourceUrls || []).join("\n")}
          onChange={(e) => set("sourceUrls", lines(e.target.value))}
        />
      </label>
      <div className="action-row">
        <button
          type="submit"
          disabled={!draft.label.trim() || !draft.source || !draft.target}
        >
          Save relationship
        </button>
        <button type="button" onClick={onClose}>
          Cancel relationship edit
        </button>
      </div>
    </form>
  );
}
