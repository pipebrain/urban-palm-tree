import { createContext, useContext } from "react";
import type {
  Dataset,
  LearningNode,
  UnitReference,
  GraphEdge,
} from "../domain/types";
import type { GraphIndex, DisplayOverride } from "../domain/semantics";
import type { MapFilters } from "../domain/browsing";
import type { UnitPreferences } from "../domain/unit-preferences";
export interface Workspace {
  data: Dataset;
  nodes: LearningNode[];
  edges: GraphEdge[];
  units: UnitReference[];
  index: GraphIndex;
  sourceNodes: Map<string, LearningNode>;
  selectedId?: string;
  unitId?: string;
  select: (id: string) => void;
  openUnit: (id: string) => void;
  showInspector: () => void;
  showOnMap: (id: string) => void;
  filters: MapFilters;
  setFilters: (filters: MapFilters) => void;
  resetMap: () => void;
  focus: (id: string, depth: 1 | 2) => void;
  view: { nodes: LearningNode[]; edges: GraphEdge[] };
  focusRequest?: { id: string; nonce: number };
  fitRequest: number;
  preferences: UnitPreferences;
  setPreference: (node: LearningNode, id: string) => void;
  resetPreference: (id: string) => void;
  override: (id: string, value?: DisplayOverride) => void;
}
export const WorkspaceContext = createContext<Workspace | null>(null);
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Workspace provider missing");
  return value;
}
