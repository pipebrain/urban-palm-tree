import type { UnitReference } from "./types";

/** Display preferences keyed by exact identity, never inferred conversions. */
const unitOverrides: Record<string, string> = {
  "http://qudt.org/vocab/unit/BTU_IT-PER-HR":
    "\\mathrm{Btu}_{\\mathrm{IT}}/\\mathrm{h}",
  "http://qudt.org/vocab/unit/LB-PER-HR":
    "\\mathrm{lb}_{\\mathrm{m}}/\\mathrm{h}",
  "http://qudt.org/vocab/unit/BTU_IT-PER-LB-DEG_F":
    "\\frac{\\mathrm{Btu}_{\\mathrm{IT}}}{\\mathrm{lb}_{\\mathrm{m}}\\,{}^{\\circ}\\mathrm{F}}",
};
export function plainMath(text: string): string {
  const escapes: Record<string, string> = {
    "\\": "\\textbackslash{}",
    "{": "\\{",
    "}": "\\}",
    $: "\\$",
    "&": "\\&",
    "#": "\\#",
    "%": "\\%",
    _: "\\_",
    "^": "\\textasciicircum{}",
    "~": "\\textasciitilde{}",
  };
  return `\\text{${Array.from(text)
    .map((c) => escapes[c] || c)
    .join("")}}`;
}
export function unitLatex(unit: UnitReference): string {
  return (
    unitOverrides[unit.id] || unit.latex || plainMath(unit.symbol || unit.label)
  );
}
