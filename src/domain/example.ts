import type { LearningNode, GraphEdge, UnitReference } from "./types";

export const EXAMPLE_ID = "urn:hvacr:equation:steady-sensible-heat";
const sourceUrl = "https://www.energy.gov/documents/doe-hdbk-1012-92vol2";
const q = (name: string) => `http://qudt.org/vocab/quantitykind/${name}`;
const u = (name: string) => `http://qudt.org/vocab/unit/${name}`;
export const intervalUnit: UnitReference = {
  id: "urn:hvacr:unit:fahrenheit-interval",
  label: "Fahrenheit temperature interval",
  latex: "\\Delta{}^{\\circ}\\mathrm{F}",
  symbol: "Δ°F",
  description:
    "App-authored interval reference. A difference of 1 °F equals 5/9 K. No temperature-reading offset applies. This is separate from QUDT DEG_F, which represents temperature readings with an offset. M0 performs no conversions.",
  dimensionIds: [],
  quantityKindIds: [q("TemperatureDifference")],
  sourceTypes: [],
  provenance: {
    origin: "authored",
    sourceId: "urn:hvacr:unit:fahrenheit-interval",
    sourceUrl,
  },
};
export const example: LearningNode = {
  id: EXAMPLE_ID,
  kind: "equation",
  label: "Sensible heat transfer",
  latex: "\\dot{Q} = \\dot{m}\\,c_p\\,\\Delta T",
  description:
    "A steady stream gains or loses sensible thermal energy as its temperature changes. This learning example adapts DOE Fundamentals Handbook, volume 2, equation (2-15), printed page 45. It is authored for this app; it is not a QUDT equation.",
  unitIds: [
    u("BTU_IT-PER-HR"),
    u("LB-PER-HR"),
    u("BTU_IT-PER-LB-DEG_F"),
    intervalUnit.id,
  ],
  applicableUnitIds: [],
  quantityKindIds: [],
  dimensionIds: [],
  sourceTypes: [],
  provenance: { origin: "authored", sourceId: EXAMPLE_ID, sourceUrl },
  assumptions: [
    "Steady, single-phase sensible heating or cooling; no phase change.",
    "Specific heat at constant pressure is constant or represented by an appropriate mean.",
    "Negligible kinetic/potential-energy changes and shaft work. Positive heat enters the fluid; ΔT = outlet − inlet.",
    "App convention: Btu_IT/h, lbm/h, Btu_IT/(lbm·°F), and Fahrenheit temperature intervals. The DOE source does not distinguish the Btu variant.",
    "No evaluation or automatic unit conversion is implemented in M0.",
  ],
  bindings: [
    {
      symbol: "\\dot{Q}",
      nodeId: q("HeatFlowRate"),
      unitId: u("BTU_IT-PER-HR"),
      role: "Heat transfer rate",
    },
    {
      symbol: "\\dot{m}",
      nodeId: q("MassFlowRate"),
      unitId: u("LB-PER-HR"),
      role: "Mass flow rate",
    },
    {
      symbol: "c_p",
      nodeId: q("SpecificHeatCapacity"),
      unitId: u("BTU_IT-PER-LB-DEG_F"),
      role: "Specific heat at constant pressure (equation assumption)",
    },
    {
      symbol: "\\Delta T",
      nodeId: q("TemperatureDifference"),
      unitId: intervalUnit.id,
      role: "Outlet minus inlet temperature",
    },
  ],
};
export const exampleEdges: GraphEdge[] = example.bindings!.map((binding) => ({
  id: `${EXAMPLE_ID}:participant:${binding.nodeId.split("/").pop()}`,
  source: EXAMPLE_ID,
  target: binding.nodeId,
  predicate: "urn:hvacr:relationship:equation-participation",
  label: "equation participant",
  provenance: example.provenance,
}));
