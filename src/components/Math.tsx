import { useMemo } from "react";
import katex from "katex";

export function MathText({
  latex,
  display = false,
}: {
  latex: string;
  display?: boolean;
}) {
  const html = useMemo(
    () =>
      katex.renderToString(latex, {
        throwOnError: false,
        strict: "ignore",
        trust: false,
        maxExpand: 500,
        maxSize: 20,
        displayMode: display,
        output: "htmlAndMathml",
      }),
    [latex, display],
  );
  return <span className="math" dangerouslySetInnerHTML={{ __html: html }} />;
}
