import type { Classification, LearningNode } from "./types.ts";

const ashrae =
  "https://handbook.ashrae.org/Handbooks/F21/IP/F21_Ch02/F21_Ch02_ip.aspx";
const doe = "https://www.energy.gov/documents/doe-hdbk-1012-92vol1";
const q = (name: string) => `http://qudt.org/vocab/quantitykind/${name}`;
const reviewedOn = "2026-10-06";

function reviewed(
  kind: string,
  rationale: string,
  sourceUrls: string[],
  context?: string,
): Classification {
  Object.freeze(sourceUrls);
  return Object.freeze({
    kind,
    status: "reviewed",
    origin: "authored",
    reviewedOn,
    rationale,
    sourceUrls,
    ...(context ? { context } : {}),
  });
}

const stateContext =
  "Thermodynamic use for a specified system and equilibrium state; this role does not exhaust every use of the general quantity.";
function state(rationale: string, source: string): Classification {
  return reviewed(
    "thermodynamic-state-property",
    rationale,
    [source],
    stateContext,
  );
}

/**
 * Exact-identity application overlays. No inheritance, text matching, unit matching,
 * or dimensional inference. The imported QUDT nodes remain unchanged.
 */
export const reviewedClassifications: Readonly<Record<string, Classification>> =
  Object.freeze({
    [q("Temperature")]: state(
      "Temperature characterizes thermal state; its reading is distinct from a temperature difference.",
      doe,
    ),
    [q("ThermodynamicTemperature")]: state(
      "Absolute temperature is a thermal-state coordinate.",
      ashrae,
    ),
    [q("Pressure")]: state(
      "Pressure characterizes mechanical state; a measurement still needs its absolute or relative reference.",
      doe,
    ),
    [q("Volume")]: state(
      "System volume is an extensive state property; geometric volume also has uses outside thermodynamics.",
      doe,
    ),
    [q("Density")]: state(
      "Mass per volume is an intensive state property; mass density is distinct from weight density.",
      doe,
    ),
    [q("SpecificVolume")]: state(
      "Volume per mass is an intensive state property, reciprocal to mass density.",
      doe,
    ),
    [q("Enthalpy")]: state(
      "Total enthalpy combines internal energy and pressure–volume energy for a system.",
      ashrae,
    ),
    [q("SpecificEnthalpy")]: state(
      "Enthalpy per mass is an intensive state property, distinct from total enthalpy.",
      ashrae,
    ),
    [q("InternalEnergy")]: state(
      "Internal energy is stored energy characterized by system state.",
      ashrae,
    ),
    [q("SpecificInternalEnergy")]: state(
      "Internal energy per mass is an intensive state property.",
      ashrae,
    ),
    [q("Entropy")]: state(
      "Entropy is a state property; a state change does not require a unique process path.",
      doe,
    ),
    [q("SpecificEntropy")]: state(
      "Entropy per mass is an intensive state property, distinct from total entropy.",
      doe,
    ),
    [q("Heat")]: reviewed(
      "process-transfer",
      "Heat denotes energy transferred because of a temperature difference; it is not stored heat content.",
      [ashrae],
    ),
    [q("Work")]: reviewed(
      "process-transfer",
      "Work denotes energy transfer during a process; it is not a stored state property.",
      [ashrae],
    ),
    [q("HeatFlowRate")]: reviewed(
      "transfer-rate",
      "Heat flow rate is heat transferred per time, distinct from an amount of heat.",
      ["https://qudt.org/vocab/quantitykind/HeatFlowRate.html"],
    ),
    [q("Power")]: reviewed(
      "transfer-rate",
      "Power describes work or energy transfer per time; it is distinct from work or energy amounts.",
      ["https://qudt.org/vocab/quantitykind/Power"],
    ),
    [q("MassFlowRate")]: reviewed(
      "flow-rate",
      "Mass flow rate expresses transported mass per time, distinct from mass or volumetric flow.",
      ["https://qudt.org/vocab/quantitykind/MassFlowRate.html"],
    ),
    [q("VolumeFlowRate")]: reviewed(
      "flow-rate",
      "Volumetric flow expresses volume crossing a surface per time, distinct from volume or mass flow.",
      ["https://qudt.org/vocab/quantitykind/VolumeFlowRate.html"],
    ),
  });

export function getClassification(node: LearningNode): Classification {
  if (node.classification) return node.classification;
  if (
    node.kind === "quantity" &&
    Object.hasOwn(reviewedClassifications, node.id)
  )
    return reviewedClassifications[node.id];
  return {
    kind: node.kind === "quantity" ? "general-quantity" : node.kind,
    status: "review-needed",
    rationale:
      node.kind === "quantity"
        ? "No concept-specific classification has been reviewed. Symbols, dimensions, units, and broader concepts do not establish a thermodynamic role."
        : "No additional scientific subtype has been reviewed for this record.",
    sourceUrls: [],
  };
}

export function isThermodynamicStateProperty(node: LearningNode): boolean {
  const classification = getClassification(node);
  return (
    node.kind === "quantity" &&
    classification.status === "reviewed" &&
    classification.kind === "thermodynamic-state-property"
  );
}

export function classificationLabel(classification: Classification): string {
  const labels: Record<string, string> = {
    "thermodynamic-state-property":
      "Thermodynamic state property · quantity subtype",
    "process-transfer": "Energy transfer during a process",
    "transfer-rate": "Energy transfer rate",
    "flow-rate": "Flow rate",
    "general-quantity": "General quantity · review needed",
  };
  return Object.hasOwn(labels, classification.kind)
    ? labels[classification.kind]
    : classification.kind;
}
