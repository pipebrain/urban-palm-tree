import { MathText } from "../components/Math";
import { plainMath, unitLatex } from "../domain/notation";
import { useWorkspace } from "./context";
export const shortId = (id: string) => id.split("/").pop() || id;
export function TextContent({ text }: { text: string }) {
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
export function UnitLink({ id }: { id: string }) {
  const w = useWorkspace();
  const unit = w.index.unitsById.get(id);
  return (
    <button
      className="unit-link"
      title={unit ? `${unit.label} · ${id}` : `Missing unit · ${id}`}
      onClick={() => w.openUnit(id)}
    >
      <MathText latex={unit ? unitLatex(unit) : plainMath(shortId(id))} />
    </button>
  );
}
export function NodeLink({ id }: { id: string }) {
  const w = useWorkspace();
  const node = w.index.nodesById.get(id);
  return (
    <button className="related" onClick={() => w.select(id)}>
      {node?.label || shortId(id)} ↗<small>{id}</small>
    </button>
  );
}
export function SourceLinks({ urls }: { urls: string[] }) {
  return (
    <ul className="source-links">
      {[...new Set(urls)].map((url, i) => (
        <li key={url}>
          <a href={url} target="_blank" rel="noreferrer">
            Reference {i + 1} ↗
          </a>
        </li>
      ))}
    </ul>
  );
}
