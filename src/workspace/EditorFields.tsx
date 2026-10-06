import { useId, useMemo, useRef, useState } from "react";
import { Markdown } from "./Markdown";
import { useWorkspace } from "./context";

export const lines = (value: string) => value.split("\n");
export function ReferencePicker({
  label,
  value,
  onChange,
  kind,
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  kind: "node" | "unit";
  optional?: boolean;
}) {
  const w = useWorkspace();
  const id = useId();
  const [query, setQuery] = useState("");
  const entries = kind === "node" ? w.nodes : w.units;
  const choices = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const found = entries
      .filter(
        (entry) =>
          !needle ||
          `${entry.label} ${entry.symbol || ""} ${entry.id}`
            .toLowerCase()
            .includes(needle),
      )
      .slice(0, 30);
    const current = entries.find((entry) => entry.id === value);
    return current && !found.some((entry) => entry.id === value)
      ? [current, ...found]
      : found;
  }, [entries, query, value]);
  return (
    <div className="reference-picker">
      <label htmlFor={`${id}-search`}>
        Find {label.toLowerCase()}
        <input
          id={`${id}-search`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${kind === "node" ? "concepts" : "units"}`}
        />
      </label>
      <label htmlFor={id}>
        {label}
        <select
          aria-label={label}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{optional ? "None" : "Choose a reference"}</option>
          {choices.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label} · {entry.id.split("/").pop()}
            </option>
          ))}
        </select>
      </label>
      {value && <small className="reference-id">{value}</small>}
      <small className="muted">
        Search narrows the list to 30 matches. Identity stays fixed when a label
        changes.
      </small>
    </div>
  );
}
export function MarkdownEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [error, setError] = useState("");
  const currentValue = useRef(value);
  currentValue.current = value;
  const [linkId, setLinkId] = useState("");
  const w = useWorkspace();
  const addImage = async (file: File | undefined) => {
    setError("");
    if (!file) return;
    if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) {
      setError("Choose a PNG, JPEG, GIF, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose an image smaller than 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () =>
      setError("The image could not be read. Your notes are unchanged.");
    reader.onload = () => {
      const alt = file.name.replace(/[\[\]\\\n\r]/g, " ");
      onChange(
        `${currentValue.current}${currentValue.current ? "\n\n" : ""}![${alt}](${String(reader.result)})`,
      );
    };
    reader.readAsDataURL(file);
  };
  return (
    <section className="markdown-editor">
      <label>
        Notes (Markdown)
        <textarea
          aria-label="Notes (Markdown)"
          rows={7}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Explanation, links, and images. Use $...$ for inline math."
        />
      </label>
      <p className="muted">
        Supports Markdown, $math$, web links, and internal references. HTML is
        not rendered. Embedded images remain in this editing session; workspace
        saving arrives in M3.
      </p>
      <label className="file-input-label">
        Embed an image
        <input
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={(e) => {
            void addImage(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      <details>
        <summary>Insert a concept link</summary>
        <ReferencePicker
          kind="node"
          label="Linked concept"
          value={linkId}
          onChange={setLinkId}
        />
        <button
          type="button"
          disabled={!linkId}
          onClick={() => {
            const label = (
              w.index.nodesById.get(linkId)?.label || "Concept"
            ).replace(/[\[\]\\]/g, "");
            onChange(
              `${value}${value ? "\n" : ""}[${label}](node:${encodeURIComponent(linkId)})`,
            );
          }}
        >
          Insert internal link
        </button>
      </details>
      <details open>
        <summary>Notes preview</summary>
        {value ? (
          <Markdown text={value} interactive={false} />
        ) : (
          <p className="muted">Your notes preview will appear here.</p>
        )}
      </details>
    </section>
  );
}
