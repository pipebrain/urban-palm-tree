import { isValidElement, useState } from "react";
import remarkMath from "remark-math";
import ReactMarkdown from "react-markdown";
import { MathText } from "../components/Math";
import { useWorkspace } from "./context";

/** Only inert images, web links, and explicit workspace references are rendered. */
export function markdownUrl(url: string, key: string) {
  if (key === "src")
    return /^(https?:\/\/|data:image\/(?:png|jpeg|gif|webp);base64,)/i.test(url)
      ? url
      : "";
  return /^(https?:\/\/|node:|unit:)/i.test(url) ? url : "";
}
function NoteImage({ src, alt }: { src?: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed)
    return (
      <span className="notice">
        Image unavailable{alt ? `: ${alt}` : ""}. Linked images may require a
        connection.
      </span>
    );
  return (
    <img
      src={src}
      alt={alt || "Note image"}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
export function Markdown({
  text,
  interactive = true,
}: {
  text: string;
  interactive?: boolean;
}) {
  const w = useWorkspace();
  return (
    <div className="markdown-content">
      <ReactMarkdown
        skipHtml
        remarkPlugins={[remarkMath]}
        urlTransform={markdownUrl}
        components={{
          a: ({ href, children }) => {
            if (/^(node|unit):/i.test(href || "")) {
              const isNode = href!.toLowerCase().startsWith("node:");
              let id: string;
              try {
                id = decodeURIComponent(href!.slice(5));
              } catch {
                return <span>{children} (invalid reference)</span>;
              }
              const exists = isNode
                ? w.index.nodesById.has(id)
                : w.index.unitsById.has(id);
              return (
                <button
                  type="button"
                  className="inline-link"
                  disabled={!exists || !interactive}
                  title={
                    !interactive
                      ? "Save your notes before following internal links"
                      : undefined
                  }
                  onClick={() => (isNode ? w.select(id) : w.openUnit(id))}
                >
                  {children}
                  {!exists && " (missing reference)"}
                </button>
              );
            }
            return href ? (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            );
          },
          img: ({ src, alt }) => (
            <NoteImage
              key={typeof src === "string" ? src : ""}
              src={typeof src === "string" ? src : undefined}
              alt={alt}
            />
          ),
          code: ({ className, children }) =>
            /(?:^|\s)language-math(?:\s|$)/.test(className || "") ? (
              <MathText
                latex={String(children).replace(/\n$/, "")}
                display={/(?:^|\s)math-display(?:\s|$)/.test(className || "")}
              />
            ) : (
              <code className={className}>{children}</code>
            ),
          pre: ({ children }) =>
            isValidElement<{ className?: string }>(children) &&
            /(?:^|\s)language-math(?:\s|$)/.test(
              children.props.className || "",
            ) ? (
              <div className="notes-math">{children}</div>
            ) : (
              <pre>{children}</pre>
            ),
          h1: ({ children }) => <h3>{children}</h3>,
          h2: ({ children }) => <h3>{children}</h3>,
          h3: ({ children }) => <h4>{children}</h4>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
