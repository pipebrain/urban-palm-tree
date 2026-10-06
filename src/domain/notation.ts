import type { UnitReference } from "./types";

/** Display preferences keyed by exact identity, never inferred conversions. */
const unitOverrides: Record<string, string> = {
  "http://qudt.org/vocab/unit/DEG_F": "{}^{\\circ}\\mathrm{F}",
  "http://qudt.org/vocab/unit/DEG_C": "{}^{\\circ}\\mathrm{C}",
  "http://qudt.org/vocab/unit/DEG_R": "{}^{\\circ}\\mathrm{R}",
  "http://qudt.org/vocab/unit/LB": "\\mathrm{lb}_{\\mathrm{m}}",
  "http://qudt.org/vocab/unit/LB_F": "\\mathrm{lb}_{\\mathrm{f}}",
  "http://qudt.org/vocab/unit/PSI": "\\mathrm{psi}",
  "http://qudt.org/vocab/unit/IN_H2O_39dot2DEG_F":
    "\\mathrm{in\\,H_2O}\\;(39.2{}^{\\circ}\\mathrm{F})",
  "http://qudt.org/vocab/unit/IN_H2O_60DEG_F":
    "\\mathrm{in\\,H_2O}\\;(60{}^{\\circ}\\mathrm{F})",
  "http://qudt.org/vocab/unit/FT2": "\\mathrm{ft}^{2}",
  "http://qudt.org/vocab/unit/IN2": "\\mathrm{in}^{2}",
  "http://qudt.org/vocab/unit/M2": "\\mathrm{m}^{2}",
  "http://qudt.org/vocab/unit/FT3": "\\mathrm{ft}^{3}",
  "http://qudt.org/vocab/unit/M3": "\\mathrm{m}^{3}",
  "http://qudt.org/vocab/unit/FT3-PER-MIN": "\\mathrm{ft}^{3}/\\mathrm{min}",
  "http://qudt.org/vocab/unit/M3-PER-SEC": "\\mathrm{m}^{3}/\\mathrm{s}",
  "http://qudt.org/vocab/unit/LB-PER-FT3":
    "\\mathrm{lb}_{\\mathrm{m}}/\\mathrm{ft}^{3}",
  "http://qudt.org/vocab/unit/KiloGM-PER-M3": "\\mathrm{kg}/\\mathrm{m}^{3}",
  "http://qudt.org/vocab/unit/FT3-PER-LB":
    "\\mathrm{ft}^{3}/\\mathrm{lb}_{\\mathrm{m}}",
  "http://qudt.org/vocab/unit/M3-PER-KiloGM": "\\mathrm{m}^{3}/\\mathrm{kg}",
  "http://qudt.org/vocab/unit/OHM": "\\Omega",
  "http://qudt.org/vocab/unit/KiloOHM": "\\mathrm{k}\\Omega",
  "http://qudt.org/vocab/unit/MegaOHM": "\\mathrm{M}\\Omega",
  "http://qudt.org/vocab/unit/MicroFARAD": "\\mu\\mathrm{F}",
  "http://qudt.org/vocab/unit/UNITLESS": "1",
  "http://qudt.org/vocab/unit/GAL_US": "\\mathrm{gal}_{\\mathrm{US}}",
  "http://qudt.org/vocab/unit/GAL_UK": "\\mathrm{gal}_{\\mathrm{UK}}",
  "http://qudt.org/vocab/unit/GAL_US-PER-MIN":
    "\\mathrm{gal}_{\\mathrm{US}}/\\mathrm{min}",
  "http://qudt.org/vocab/unit/GAL_UK-PER-MIN":
    "\\mathrm{gal}_{\\mathrm{UK}}/\\mathrm{min}",
  "http://qudt.org/vocab/unit/BTU_IT": "\\mathrm{Btu}_{\\mathrm{IT}}",
  "http://qudt.org/vocab/unit/BTU_IT-PER-LB":
    "\\mathrm{Btu}_{\\mathrm{IT}}/\\mathrm{lb}_{\\mathrm{m}}",
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
export function unitLatex(unit: UnitReference, editedLatex?: string): string {
  if (editedLatex !== undefined)
    return editedLatex || plainMath(unit.symbol || unit.label);
  return (
    unitOverrides[unit.id] || unit.latex || plainMath(unit.symbol || unit.label)
  );
}
