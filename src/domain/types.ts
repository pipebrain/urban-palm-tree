/** Stable semantic data, independent of graph coordinates and editable overrides. */
export interface Provenance {
  origin: "qudt" | "authored";
  sourceId: string;
  sourceUrl: string;
  version?: string;
}

export interface Classification {
  kind: string;
  status: "review-needed" | "reviewed";
  rationale: string;
  sourceUrls: string[];
}

export interface ConstantValue {
  id: string;
  /** Preserve the source lexical value; JavaScript Number can lose precision. */
  value?: string;
  unitIds: string[];
  standardUncertainty?: string;
  relativeStandardUncertainty?: string;
  sourceUrls: string[];
}

export interface LearningNode {
  id: string;
  kind: "quantity" | "constant" | "equation";
  label: string;
  latex?: string;
  symbol?: string;
  description?: string;
  /** Explicitly used units, including units of a constant's recorded value. */
  unitIds: string[];
  /** Upstream applicable units are compatibility references, never use backlinks. */
  applicableUnitIds: string[];
  quantityKindIds: string[];
  dimensionIds: string[];
  sourceTypes: string[];
  provenance: Provenance;
  classification?: Classification;
  deprecated?: boolean;
  constantValues?: ConstantValue[];
  assumptions?: string[];
  bindings?: {
    symbol: string;
    nodeId: string;
    unitId?: string;
    role?: string;
  }[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  predicate: string;
  label: string;
  provenance: Provenance;
}

export interface UnitReference {
  id: string;
  label: string;
  symbol?: string;
  latex?: string;
  description?: string;
  dimensionIds: string[];
  quantityKindIds: string[];
  /** Metadata only: not a promise that this app can convert the unit. */
  multiplier?: string;
  offset?: string;
  sourceTypes: string[];
  provenance: Provenance;
  deprecated?: boolean;
}

export interface DatasetSource {
  name: string;
  version: string;
  releaseUrl: string;
  artifactUrl: string;
  originalFilename: string;
  sha256: string;
  license: string;
  licenseUrl: string;
  attribution: string;
  retrievedOn: string;
}

export interface ImportReport {
  counts: {
    triples: number;
    records: number;
    namedRecords: number;
    blankRecords: number;
    quantityNodes: number;
    constantNodes: number;
    eligibleNodes: number;
    unitReferences: number;
    technicalRecords: number;
    edges: number;
    isolatedNodes: number;
    deprecatedNodes: number;
    nodesWithoutDescription: number;
    nodesWithoutMathSymbol: number;
  };
  types: Record<string, number>;
  predicatesBetweenEligibleNodes: Record<string, number>;
  retainedNonGraphPredicates: Record<string, number>;
  gaps: string[];
  unresolvedReferences: { source: string; predicate: string; target: string }[];
}

export interface QudtDataset {
  schemaVersion: 1;
  source: DatasetSource;
  nodes: LearningNode[];
  edges: GraphEdge[];
  units: UnitReference[];
  report: ImportReport;
}

/** Aliases keep renderers free to choose their own simulation node type. */
export type GraphNode = LearningNode;
export type Dataset = QudtDataset;
