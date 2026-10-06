/** Future CoolProp WASM adapter boundary. This is not an equation solver. */
export type PropertyInput = Readonly<{
  /** CoolProp high-level input key; values are SI at this boundary. */
  key: string;
  valueSI: number;
}>;

export type PropertyRequest = Readonly<{
  /** Explicit engine fluid identifier, to be validated by the future adapter. */
  fluid: string;
  outputKey: string;
  inputs: readonly [PropertyInput, PropertyInput];
}>;

export type PropertyResult =
  | {
      ok: true;
      valueSI: number;
      outputKey: string;
      engine: "CoolProp";
      engineVersion: string;
    }
  | {
      ok: false;
      reason:
        | "not-installed"
        | "unsupported"
        | "invalid-input"
        | "calculation-failed";
      message: string;
    };

export interface PropertyService {
  readonly engine: "CoolProp";
  status(): { available: boolean; message: string };
  evaluate(request: PropertyRequest): Promise<PropertyResult>;
}

export const propertyService: PropertyService = {
  engine: "CoolProp",
  status: () => ({
    available: false,
    message: "CoolProp WASM is not installed in the M0 graph preview.",
  }),
  async evaluate(_request) {
    return {
      ok: false,
      reason: "not-installed",
      message:
        "Thermophysical calculation requires the future CoolProp WASM adapter. No result was calculated.",
    };
  },
};
