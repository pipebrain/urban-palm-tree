import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import katex from "katex";
import {
  DEFAULT_UNIT_PREFERENCES,
  changeUnitPreference,
  getUnitOptions,
  preferredUnitId,
  unitConversionStatus,
  unitPreferenceContext,
  validateUnitPreference,
} from "../src/domain/unit-preferences.ts";
import { example, intervalUnit } from "../src/domain/example.ts";
import { unitLatex } from "../src/domain/notation.ts";

const dataset = JSON.parse(
  await readFile(
    new URL("../public/data/qudt-graph.json", import.meta.url),
    "utf8",
  ),
);
const units = new Map(
  [...dataset.units, intervalUnit].map((unit) => [unit.id, unit]),
);
const nodes = new Map(dataset.nodes.map((node) => [node.id, node]));
const q = (name) => `http://qudt.org/vocab/quantitykind/${name}`;
const u = (name) => `http://qudt.org/vocab/unit/${name}`;
const node = (name) => nodes.get(q(name));
const ids = (name) =>
  getUnitOptions(node(name), units).map(({ unit }) => unit.id);

test("every HVACR default resolves to an existing concept and exact reviewed unit", () => {
  assert.ok(Object.keys(DEFAULT_UNIT_PREFERENCES).length >= 30);
  for (const [nodeId, unitId] of Object.entries(DEFAULT_UNIT_PREFERENCES)) {
    const concept = nodes.get(nodeId);
    assert.ok(concept, `Missing default concept: ${nodeId}`);
    assert.ok(units.has(unitId), `Missing default unit: ${unitId}`);
    assert.equal(preferredUnitId(concept, {}, units), unitId);
    const options = getUnitOptions(concept, units);
    assert.equal(
      new Set(options.map(({ unit }) => unit.id)).size,
      options.length,
    );
    for (const option of options) {
      assert.ok(
        option.displayLabel && option.rationale && option.sourceUrls.length,
      );
      assert.doesNotThrow(() =>
        katex.renderToString(unitLatex(option.unit), {
          throwOnError: true,
          trust: false,
          strict: "error",
        }),
      );
    }
  }
});

test("temperature readings, intervals and thermodynamic absolute scales cannot be confused", () => {
  assert.equal(preferredUnitId(node("Temperature"), {}, units), u("DEG_F"));
  assert.equal(
    preferredUnitId(node("TemperatureDifference"), {}, units),
    intervalUnit.id,
  );
  assert.equal(
    preferredUnitId(node("ThermodynamicTemperature"), {}, units),
    u("DEG_R"),
  );
  assert.equal(
    validateUnitPreference(node("TemperatureDifference"), u("DEG_F"), units)
      .valid,
    false,
  );
  assert.equal(
    validateUnitPreference(node("TemperatureDifference"), u("DEG_C"), units)
      .valid,
    false,
  );
  assert.equal(
    validateUnitPreference(node("Temperature"), intervalUnit.id, units).valid,
    false,
  );
  assert.equal(
    validateUnitPreference(node("ThermodynamicTemperature"), u("DEG_F"), units)
      .valid,
    false,
  );
  assert.equal(
    validateUnitPreference(node("TemperatureDifference"), u("K"), units).valid,
    true,
  );
  assert.match(
    unitPreferenceContext(node("TemperatureDifference")),
    /no reading offset/,
  );
  assert.equal(units.get(u("DEG_F")).offset, "459.67");
  assert.equal(intervalUnit.offset, undefined);
});

test("mass and force identities stay separate, including misleading abbreviations", () => {
  assert.equal(preferredUnitId(node("Mass"), {}, units), u("LB"));
  assert.equal(preferredUnitId(node("Force"), {}, units), u("LB_F"));
  for (const id of [u("LB_F"), u("OZ_F"), u("GR"), "lb", "g", "gr", "oz"])
    assert.equal(
      validateUnitPreference(node("Mass"), id, units).valid,
      false,
      id,
    );
  assert.equal(
    validateUnitPreference(node("Force"), u("LB"), units).valid,
    false,
  );
  assert.ok(ids("Mass").includes(u("GM")));
  assert.ok(ids("Mass").includes(u("GRAIN")));
  const ounce = getUnitOptions(node("Mass"), units).find(
    ({ unit }) => unit.id === u("OZ"),
  );
  assert.match(ounce.displayLabel, /avoirdupois.*mass/);
});

test("pressure choice never reinterprets an unspecified or gauge reference as absolute", () => {
  assert.equal(preferredUnitId(node("Pressure"), {}, units), u("PSI"));
  assert.match(
    unitPreferenceContext(node("Pressure")),
    /reference is unspecified/,
  );
  assert.match(
    unitPreferenceContext(node("GaugePressure")),
    /reference to ambient/,
  );
  // QUDT source applicability is not itself a safe permission to switch context.
  assert.ok(node("GaugePressure").applicableUnitIds.includes(u("BAR_A")));
  for (const concept of ["Pressure", "GaugePressure", "StaticPressure"])
    for (const id of [u("BAR_A"), u("KiloPA_A"), "psig", "psia", "in w.g."])
      assert.equal(
        validateUnitPreference(node(concept), id, units).valid,
        false,
      );
  assert.equal(
    validateUnitPreference(node("Pressure"), u("FT"), units).valid,
    false,
  );
  const waterChoices = getUnitOptions(node("Pressure"), units).filter(
    ({ unit }) => unit.id.includes("IN_H2O"),
  );
  assert.equal(waterChoices.length, 2);
  assert.ok(
    waterChoices.every(({ displayLabel }) => /39.2|60/.test(displayLabel)),
  );
  assert.ok(!ids("Pressure").includes(u("IN_H2O")));
});

test("US liquid and imperial gallons remain separately labelled alternatives", () => {
  assert.equal(preferredUnitId(node("LiquidVolume"), {}, units), u("GAL_US"));
  assert.equal(
    preferredUnitId(node("VolumeFlowRate"), {}, units),
    u("GAL_US-PER-MIN"),
  );
  const options = getUnitOptions(node("VolumeFlowRate"), units);
  assert.match(
    options.find(({ unit }) => unit.id === u("GAL_US-PER-MIN")).displayLabel,
    /US liquid/,
  );
  assert.match(
    options.find(({ unit }) => unit.id === u("GAL_UK-PER-MIN")).displayLabel,
    /UK imperial/,
  );
  assert.notEqual(
    units.get(u("GAL_US")).multiplier,
    units.get(u("GAL_UK")).multiplier,
  );
  assert.equal(
    validateUnitPreference(node("VolumeFlowRate"), "GPM", units).valid,
    false,
  );
});

test("heat, heat rate and refrigeration ton preserve their quantity meaning", () => {
  assert.equal(preferredUnitId(node("Heat"), {}, units), u("BTU_IT"));
  assert.equal(
    preferredUnitId(node("HeatFlowRate"), {}, units),
    u("BTU_IT-PER-HR"),
  );
  assert.equal(
    validateUnitPreference(node("Heat"), u("BTU_IT-PER-HR"), units).valid,
    false,
  );
  assert.equal(
    validateUnitPreference(node("HeatFlowRate"), u("TON_FG"), units).valid,
    true,
  );
  assert.equal(
    validateUnitPreference(node("Mass"), u("TON_FG"), units).valid,
    false,
  );
  assert.equal(
    validateUnitPreference(node("HeatFlowRate"), u("TON"), units).valid,
    false,
  );
  assert.equal(
    validateUnitPreference(node("HeatFlowRate"), "Ton", units).valid,
    false,
  );
});

test("reviewed additions are explicit and do not rewrite missing source applicability", () => {
  const heatRate = node("HeatFlowRate");
  const before = structuredClone(heatRate);
  assert.ok(!heatRate.applicableUnitIds.includes(u("W")));
  const watts = getUnitOptions(heatRate, units).find(
    ({ unit }) => unit.id === u("W"),
  );
  assert.equal(watts.basis, "reviewed-addition");
  assert.match(watts.rationale, /does not alter upstream/);
  assert.equal(getUnitOptions(heatRate, units)[0].basis, "source-applicable");
  assert.deepEqual(heatRate, before);
});

test("unknown concepts and dimension-only matches remain unresolved", () => {
  const unknown = {
    ...node("Temperature"),
    id: "urn:test:unknown",
    label: "Temperature",
    symbol: "T",
  };
  assert.deepEqual(getUnitOptions(unknown, units), []);
  assert.equal(preferredUnitId(unknown, {}, units), undefined);
  assert.match(unitPreferenceContext(unknown), /No reviewed compatible/);
  assert.equal(validateUnitPreference(unknown, u("DEG_F"), units).valid, false);
  assert.equal(
    validateUnitPreference(node("Temperature"), "urn:test:unknown-unit", units)
      .valid,
    false,
  );
  const invalidStored = { [q("Temperature")]: u("LB") };
  assert.equal(
    preferredUnitId(node("Temperature"), invalidStored, units),
    undefined,
  );
  const missingInterval = new Map(dataset.units.map((unit) => [unit.id, unit]));
  assert.equal(
    preferredUnitId(node("TemperatureDifference"), {}, missingInterval),
    undefined,
  );
});

test("preference edits preserve stable IDs, source metadata, values and equation conventions", () => {
  const original = structuredClone({
    temperature: node("Temperature"),
    example,
    units: [...units.values()],
  });
  const oldPreferences = Object.freeze({ [q("Mass")]: u("KiloGM") });
  const renamed = {
    ...node("Temperature"),
    label: "Classroom T",
    symbol: "other",
  };
  const changed = changeUnitPreference(
    oldPreferences,
    renamed,
    u("DEG_C"),
    units,
  );
  assert.deepEqual(changed, {
    [q("Mass")]: u("KiloGM"),
    [q("Temperature")]: u("DEG_C"),
  });
  assert.deepEqual(oldPreferences, { [q("Mass")]: u("KiloGM") });
  assert.equal(
    preferredUnitId(node("Temperature"), changed, [...units.values()]),
    u("DEG_C"),
  );
  assert.throws(
    () => changeUnitPreference(changed, renamed, u("LB"), units),
    /not a reviewed choice/,
  );
  assert.deepEqual(
    { temperature: node("Temperature"), example, units: [...units.values()] },
    original,
  );
  const constant = dataset.nodes.find(
    (candidate) => candidate.kind === "constant" && candidate.unitIds.length,
  );
  const constantBefore = structuredClone(constant);
  assert.deepEqual(getUnitOptions(constant, units), []);
  assert.throws(
    () => changeUnitPreference({}, constant, constant.unitIds[0], units),
    /cannot relabel/,
  );
  assert.deepEqual(constant, constantBefore);
  assert.deepEqual(getUnitOptions(example, units), []);
  assert.throws(
    () => changeUnitPreference({}, example, example.unitIds[0], units),
    /cannot relabel/,
  );
});

test("metadata availability never promises executable or reviewed conversion", () => {
  assert.match(
    unitConversionStatus(intervalUnit),
    /No numeric conversion multiplier/,
  );
  assert.match(
    unitConversionStatus(units.get(u("DEG_F"))),
    /not implemented or verified/,
  );
});
