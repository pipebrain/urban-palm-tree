import type { LearningNode, UnitReference } from "./types";

/** Display choices only. Source units, recorded values and equation bindings stay intact. */
export type UnitPreferences = Readonly<Record<string, string>>;
type UnitCollection =
  readonly UnitReference[] | ReadonlyMap<string, UnitReference>;

export interface UnitOption {
  unit: UnitReference;
  displayLabel: string;
  basis: "source-applicable" | "reviewed-addition";
  status: "reviewed";
  rationale: string;
  sourceUrls: string[];
}

interface ReviewedChoices {
  nodeIds: readonly string[];
  unitIds: readonly string[];
  context: string;
}

const q = (name: string) => `http://qudt.org/vocab/quantitykind/${name}`;
const u = (name: string) => `http://qudt.org/vocab/unit/${name}`;
const intervalId = "urn:hvacr:unit:fahrenheit-interval";
const nistUnits =
  "https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8";
const nistPressure =
  "https://www.nist.gov/system/files/documents/calibrations/pmc-2.pdf";

function choices(
  nodes: string[],
  units: string[],
  context: string,
): ReviewedChoices {
  return {
    nodeIds: nodes.map(q),
    unitIds: units.map((id) => (id.startsWith("urn:") ? id : u(id))),
    context,
  };
}

/**
 * A deliberately reviewed subset, keyed by exact concept identity. The first
 * choice is the default. These are neither dimension matches nor label guesses.
 * Missing source applicableUnit assertions are recorded as local additions.
 */
const reviewedChoices: ReviewedChoices[] = [
  choices(
    [
      "Temperature",
      "DryBulbTemperature",
      "WetBulbTemperature",
      "DewPointTemperature",
    ],
    ["DEG_F", "DEG_C", "K"],
    "Temperature reading: Fahrenheit and Celsius have scale offsets. This preference does not select a temperature interval or change an equation's required scale.",
  ),
  choices(
    ["ThermodynamicTemperature"],
    ["DEG_R", "K"],
    "Thermodynamic temperature uses an absolute scale: Rankine or kelvin. Fahrenheit and Celsius readings are not offered for this concept's absolute-scale notation.",
  ),
  choices(
    ["TemperatureDifference"],
    [intervalId, "K"],
    "Temperature interval: the authored Fahrenheit interval has no reading offset. QUDT DEG_F and DEG_C reading references are intentionally excluded. Kelvin is also valid for an interval.",
  ),
  choices(
    ["Pressure", "StaticPressure"],
    ["PSI", "PA", "KiloPA", "BAR", "IN_H2O_39dot2DEG_F", "IN_H2O_60DEG_F"],
    "Pressure reference is unspecified; psi does not imply gauge or absolute. Changing units cannot choose or change that reference. Water-column choices state their temperature convention; head-to-pressure needs a physical relation.",
  ),
  choices(
    ["GaugePressure"],
    ["PSI", "PA", "KiloPA", "BAR", "IN_H2O_39dot2DEG_F", "IN_H2O_60DEG_F"],
    "Gauge pressure retains its reference to ambient pressure. A unit preference does not convert it to absolute pressure; that requires a known reference pressure. Source units marked absolute are excluded.",
  ),
  choices(
    ["Mass"],
    ["LB", "KiloGM", "GM", "GRAIN", "OZ"],
    "Mass: lb means the exact pound-mass identity here, never pound-force. Gram, grain and avoirdupois ounce are separate explicit choices; shorthand alone never resolves them.",
  ),
  choices(
    ["Force"],
    ["LB_F", "N"],
    "Force: pound-force is distinct from pound mass. A mass-to-force change requires a physical relation and is not a unit preference.",
  ),
  choices(
    ["MassFlowRate"],
    ["LB-PER-HR", "LB-PER-MIN", "KiloGM-PER-SEC"],
    "Mass flow per time; lb in these references is pound mass. This preference does not infer a fluid density or substitute volumetric flow.",
  ),
  choices(
    ["Volume"],
    ["FT3", "M3", "L", "GAL_US", "GAL_UK"],
    "Volume: US liquid and UK imperial gallons remain separate exact identities. No fluid or standard gas condition is inferred.",
  ),
  choices(
    ["LiquidVolume"],
    ["GAL_US", "L", "M3", "GAL_UK"],
    "Liquid volume defaults to the US liquid gallon. The UK imperial gallon is an explicitly labelled alternative, never an alias.",
  ),
  choices(
    ["VolumeFlowRate"],
    [
      "GAL_US-PER-MIN",
      "FT3-PER-MIN",
      "L-PER-MIN",
      "M3-PER-SEC",
      "GAL_UK-PER-MIN",
    ],
    "Volumetric flow: GPM here explicitly means US liquid gallons per minute. Cubic feet per minute does not imply standard air conditions, and changing units does not change the fluid.",
  ),
  choices(
    ["Length", "Diameter"],
    ["FT", "IN", "M", "MilliM"],
    "Length uses the international foot or inch, not the US survey foot. A length preference does not convert head into pressure.",
  ),
  choices(
    ["Area"],
    ["FT2", "IN2", "M2"],
    "Geometric area; square feet use the international foot.",
  ),
  choices(
    ["Velocity", "Speed"],
    ["FT-PER-MIN", "FT-PER-SEC", "M-PER-SEC"],
    "Length per time. Selecting speed units does not remove a velocity's directional meaning or imply a volume flow.",
  ),
  choices(
    ["Energy", "Heat", "Enthalpy", "InternalEnergy"],
    ["BTU_IT", "J", "KiloJ"],
    "Energy quantity: Btu uses the International Table variant. Heat transfer and state energies remain distinct concepts even when they share these units.",
  ),
  choices(
    ["HeatFlowRate"],
    ["BTU_IT-PER-HR", "W", "KiloW", "TON_FG"],
    "Heat transfer rate, not heat energy. Btu uses the International Table variant; ton of refrigeration is an explicit rate choice, never a mass ton.",
  ),
  choices(
    ["Power"],
    ["W", "KiloW", "BTU_IT-PER-HR"],
    "Power is energy per time. Watt is the general default; selecting Btu_IT/h does not classify this quantity as heat transfer.",
  ),
  choices(
    ["SpecificEnthalpy", "SpecificInternalEnergy"],
    ["BTU_IT-PER-LB", "J-PER-KiloGM", "KiloJ-PER-KiloGM"],
    "Specific energy per unit mass; Btu_IT/lbm preserves the Btu variant and mass basis. Reference states for property values are not supplied by a unit.",
  ),
  choices(
    ["SpecificHeatCapacity"],
    ["BTU_IT-PER-LB-DEG_F", "J-PER-KiloGM-K"],
    "Specific heat capacity uses energy per mass per temperature interval; the Fahrenheit denominator is an interval, not an offset temperature reading. Constant-pressure or constant-volume conditions belong to the quantity or equation.",
  ),
  choices(
    ["SpecificEntropy"],
    ["BTU_IT-PER-LB-DEG_R", "J-PER-KiloGM-K"],
    "Specific entropy uses energy per mass per temperature unit. Rankine and kelvin retain an explicit absolute-scale convention; a property reference state is separate.",
  ),
  choices(
    ["Entropy"],
    ["BTU_IT-PER-DEG_R", "J-PER-K"],
    "Entropy uses energy per temperature unit. Rankine and kelvin retain an explicit absolute-scale convention; a property reference state is separate.",
  ),
  choices(
    ["Density", "MassDensity"],
    ["LB-PER-FT3", "LB-PER-GAL_US", "KiloGM-PER-M3"],
    "Mass per volume; pound mass and US liquid gallon are explicit. This preference does not assume a density value for water or air.",
  ),
  choices(
    ["SpecificVolume"],
    ["FT3-PER-LB", "M3-PER-KiloGM"],
    "Volume per mass, with pound mass explicit. This preference does not assume a pressure, temperature or fluid.",
  ),
  choices(
    ["RelativeHumidity"],
    ["PERCENT_RH"],
    "Relative humidity uses its dedicated percent-relative-humidity reference; it is not a humidity mass ratio.",
  ),
  choices(
    ["MassRatioOfWaterVapourToDryGas"],
    ["UNITLESS"],
    "Water-vapour mass divided by dry-gas mass. A bare grain label is not a grain-per-pound ratio, so that unresolved classroom notation is not assigned.",
  ),
  choices(
    ["ElectricCurrent"],
    ["A", "MilliA"],
    "Electric current; ampere references preserve the quantity identity.",
  ),
  choices(
    ["ElectricPotential", "Voltage"],
    ["V", "MilliV", "KiloV"],
    "Electric potential or potential difference; units do not merge these concept identities.",
  ),
  choices(
    ["Resistance"],
    ["OHM", "KiloOHM", "MegaOHM"],
    "Electrical resistance; ohm and explicitly scaled alternatives.",
  ),
  choices(
    ["Capacitance"],
    ["MicroFARAD", "FARAD", "NanoFARAD"],
    "Capacitance defaults to microfarads; this is not the letter F used informally for Fahrenheit.",
  ),
  choices(["Inductance"], ["H", "MilliH"], "Inductance uses henry references."),
  choices(
    ["PowerFactor"],
    ["UNITLESS"],
    "Power factor is a dimensionless ratio. No unrelated dimensionless quantity or percent convention is inferred.",
  ),
  choices(
    ["RotationalFrequency", "RotationalVelocity"],
    ["REV-PER-MIN", "REV-PER-SEC"],
    "Rotation rate uses revolutions per time, with the revolution convention explicit. Radians and revolutions are not aliases.",
  ),
  choices(
    ["Time"],
    ["HR", "MIN", "SEC"],
    "Duration uses conventional hours, minutes or seconds, not sidereal variants.",
  ),
];

const reviewByNode = new Map(
  reviewedChoices.flatMap((review) =>
    review.nodeIds.map((id) => [id, review] as const),
  ),
);

export const DEFAULT_UNIT_PREFERENCES: UnitPreferences = Object.freeze(
  Object.fromEntries(
    [...reviewByNode].map(([id, review]) => [id, review.unitIds[0]]),
  ),
);

const displayLabels: Readonly<Record<string, string>> = {
  [intervalId]: "Δ°F — Fahrenheit interval (no offset)",
  [u("DEG_F")]: "°F — Fahrenheit reading",
  [u("DEG_C")]: "°C — Celsius reading",
  [u("DEG_R")]: "°R — Rankine absolute scale",
  [u("K")]: "K — kelvin (reading or interval by context)",
  [u("PSI")]: "psi — pound-force per square inch",
  [u("LB")]: "lbm — pound mass",
  [u("LB_F")]: "lbf — pound-force",
  [u("GM")]: "g — gram mass",
  [u("GRAIN")]: "grain — mass (not grade)",
  [u("OZ")]: "oz — avoirdupois ounce mass",
  [u("GAL_US")]: "gal (US liquid)",
  [u("GAL_UK")]: "gal (UK imperial)",
  [u("GAL_US-PER-MIN")]: "GPM — US liquid gallons per minute",
  [u("GAL_UK-PER-MIN")]: "gal/min — UK imperial gallons per minute",
  [u("FT3-PER-MIN")]: "CFM — cubic feet per minute",
  [u("FT-PER-MIN")]: "FPM — feet per minute",
  [u("TON_FG")]: "ton of refrigeration — heat-transfer rate",
  [u("IN_H2O_39dot2DEG_F")]: "in H₂O — water column at 39.2 °F",
  [u("IN_H2O_60DEG_F")]: "in H₂O — water column at 60 °F",
};

function lookupUnit(
  units: UnitCollection,
  id: string,
): UnitReference | undefined {
  return Array.isArray(units)
    ? units.find((unit) => unit.id === id)
    : (units as ReadonlyMap<string, UnitReference>).get(id);
}

export function unitPreferenceContext(node: LearningNode): string {
  if (node.kind !== "quantity")
    return "Recorded constant units and equation conventions are fixed in their source context. A display preference cannot relabel their values or bindings.";
  return (
    reviewByNode.get(node.id)?.context ??
    "No reviewed compatible preference choices for this concept yet. Source applicability remains available as reference metadata; shared dimensions alone do not establish compatibility."
  );
}

/** Reviewed options only. Raw upstream applicability is independently browseable. */
export function getUnitOptions(
  node: LearningNode,
  units: UnitCollection,
): UnitOption[] {
  if (node.kind !== "quantity") return [];
  const review = reviewByNode.get(node.id);
  if (!review) return [];
  return review.unitIds.flatMap((id) => {
    const unit = lookupUnit(units, id);
    if (!unit || unit.deprecated) return [];
    const sourceApplicable = node.applicableUnitIds.includes(id);
    return [
      {
        unit,
        displayLabel:
          displayLabels[id] ?? `${unit.symbol || unit.label} — ${unit.label}`,
        basis: sourceApplicable ? "source-applicable" : "reviewed-addition",
        status: "reviewed",
        rationale: `${review.context} ${
          sourceApplicable
            ? "This exact choice is also listed by the imported source."
            : "This is a reviewed local addition to the preference choices; it does not alter upstream applicability."
        }`,
        sourceUrls: [
          ...new Set([
            unit.provenance.sourceUrl,
            nistUnits,
            ...(review.nodeIds.some((nodeId) =>
              [q("Pressure"), q("StaticPressure"), q("GaugePressure")].includes(
                nodeId,
              ),
            )
              ? [nistPressure]
              : []),
          ]),
        ],
      } satisfies UnitOption,
    ];
  });
}

export function validateUnitPreference(
  node: LearningNode,
  unitId: string,
  units: UnitCollection,
): { valid: boolean; reason: string } {
  if (!lookupUnit(units, unitId))
    return {
      valid: false,
      reason:
        "Unknown exact unit identity. A label or symbol cannot stand in for a unit ID.",
    };
  const option = getUnitOptions(node, units).find(
    ({ unit }) => unit.id === unitId,
  );
  return option
    ? { valid: true, reason: option.rationale }
    : {
        valid: false,
        reason: `Unit is not a reviewed choice for this concept. ${unitPreferenceContext(node)}`,
      };
}

/** No fallback for an invalid explicit preference: leave it visibly unresolved. */
export function preferredUnitId(
  node: LearningNode,
  preferences: UnitPreferences,
  units: UnitCollection,
): string | undefined {
  const id = Object.hasOwn(preferences, node.id)
    ? preferences[node.id]
    : DEFAULT_UNIT_PREFERENCES[node.id];
  return id && validateUnitPreference(node, id, units).valid ? id : undefined;
}

export function changeUnitPreference(
  preferences: UnitPreferences,
  node: LearningNode,
  unitId: string,
  units: UnitCollection,
): UnitPreferences {
  const validation = validateUnitPreference(node, unitId, units);
  if (!validation.valid) throw new Error(validation.reason);
  return { ...preferences, [node.id]: unitId };
}

/** Available metadata is not a conversion implementation or a verification stamp. */
export function unitConversionStatus(unit: UnitReference): string {
  return unit.multiplier === undefined
    ? "No numeric conversion multiplier is recorded in this reference. Numerical conversion is unavailable."
    : "Source conversion metadata is available for inspection. Numerical conversion is not implemented or verified by this app; a preference only changes notation.";
}
