# M1 unit preferences and reference semantics

Reviewed 6 October 2026 against the pinned QUDT 3.5.2 data and the primary measurement references below. Preferences select **exact identities**, keyed by a concept's stable ID. They do not convert numerical values, change equation bindings, merge concepts, or modify source records. The default profile is an app-authored US customary HVACR starting point; choices last for the current session until persistence is implemented in M3.

## Selection boundary

`src/domain/unit-preferences.ts` maintains an explicit review for 46 concepts. Only reviewed choices appear in the preference selector. Other quantities remain available in the graph and retain their upstream applicability references, with review still required before assigning a preference. There is no inference from names, symbols or common dimensions.

An option records its review context, exact unit, unambiguous display label, supporting source URLs and whether upstream lists the applicability. A `reviewed-addition` fills an omission in the preference layer only. For example, QUDT's `HeatFlowRate` applicability list omits watt and `VolumeFlowRate` omits cubic metre per second; both are available as reviewed additions. Raw source metadata remains intact and separately inspectable.

Upstream applicability is not always safe without context: its `GaugePressure` list includes `BAR_A` and `KiloPA_A`, which explicitly mean absolute pressure. These identities remain in the reference dictionary but are excluded from preference choices for gauge or unspecified pressure.

## Important choices

| Concept | Default | Preserved distinction |
| --- | --- | --- |
| Temperature; dry/wet bulb; dew point | `DEG_F` | A temperature reading with a scale offset |
| Thermodynamic temperature | `DEG_R` | Absolute scale; kelvin is the alternative |
| Temperature difference | Authored Fahrenheit interval | Separate identity, no reading offset; kelvin is an alternative |
| Pressure and static pressure | `PSI` | Reference remains unspecified; psi alone is neither gauge nor absolute |
| Gauge pressure | `PSI` | Ambient reference belongs to the concept and survives unit changes |
| Mass / force | `LB` / `LB_F` | Pound mass and pound-force stay separate |
| Liquid volume / volume flow | `GAL_US` / `GAL_US-PER-MIN` | US liquid gallon is explicit; imperial choices have separate labels and IDs |
| Heat / heat rate | `BTU_IT` / `BTU_IT-PER-HR` | International Table Btu; energy and rate stay separate |
| Specific enthalpy | `BTU_IT-PER-LB` | Per pound mass; property reference state remains separate |
| Specific heat capacity | `BTU_IT-PER-LB-DEG_F` | Denominator uses a temperature interval |
| Specific entropy | `BTU_IT-PER-LB-DEG_R` | Explicit Rankine convention; kelvin-based alternative |

Additional reviewed choices cover geometry, velocity, density, specific volume, electrical quantities, relative humidity, rotation rate and duration. Defaults do not assume a fluid, standard air condition, material property value or classroom coefficient.

`g`, `gr`, `lb`, `oz`, `Ton`, `GPM` and `in w.g.` are never accepted as identities. Explicit choices distinguish gram, grain, avoirdupois ounce mass, US/UK gallons, ton of refrigeration and water columns at 39.2 °F or 60 °F. QUDT `GR` actually identifies grade, not grain. A bare grain is not a humidity mass ratio, and foot of head is not a pressure-unit alias. The author's intended ambiguous shorthand can be resolved during later authoring without guessing now.

## Values, backlinks and conversion limits

Constant-value units and authored equation conventions cannot be changed by this selector. A preference creates a display-use reference to the quantity; it does not turn every source-compatible concept into an explicit-use backlink. Original recorded-value/equation uses and default/custom display preferences are identified separately in the UI.

KaTeX overrides are also keyed by exact unit identity; source symbols remain intact. Reviewed choices include explicit typography for mass/force, US/UK gallons and IT Btu.

Conversion multipliers and offsets are reference metadata, not verified conversion support. Missing numeric metadata is visible, including the authored Fahrenheit interval. M1 performs no numerical conversion; tests check that source values and fixed equation conventions cannot be relabelled by a preference change. An unavailable default or invalid explicit preference resolves to no selection rather than silently guessing another identity.

## Sources and verification

- [Pinned QUDT 3.5.2 source inventory](QUDT-IMPORT.md): exact node/unit identities, applicability and original metadata are checked against the retained dataset. Examples: [pound mass](https://qudt.org/vocab/unit/LB.html), [psi](https://qudt.org/vocab/unit/PSI.html), [US gallon per minute](https://qudt.org/vocab/unit/GAL_US-PER-MIN.html), [60 °F inch of water](https://qudt.org/vocab/unit/IN_H2O_60DEG_F.html).
- [NIST SP 811 Appendix B.8](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8): readings versus intervals, named customary variants and quantity-specific unit distinctions. The app's default profile is a local design choice, not a NIST recommendation to use customary units.
- [NIST Pressure and Vacuum Measurements](https://www.nist.gov/system/files/documents/calibrations/pmc-2.pdf): pressure-reference context is required independently of the pressure unit.

`tests/unit-preferences.test.mjs` checks default identity resolution, KaTeX rendering, temperature intervals, mass/force, pressure-reference rejection, gallon variants, energy/rate distinctions, local additions, unknown/dimension-only rejection, rename stability and preservation of source values and equation units. It does not claim numerical conversion accuracy because no converter is implemented.

The offline browser check also changes a temperature reading to Celsius and a temperature interval to kelvin in a freshly opened offline page. It verifies that display backlinks update separately from original uses, the authored equation's bindings retain their unit conventions, and an unreviewed quantity remains unresolved. These checks run on desktop and touch-emulated phone layouts; they do not replace physical-device tests.
