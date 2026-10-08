import type { DockviewReadyEvent } from "dockview-react";
import type { SessionPanel } from "../domain/session";
import { panelTitles } from "./WorkspaceTab";

type DockApi = DockviewReadyEvent["api"];
export type TileLayout = "columns" | "rows" | "quarters";
const order: SessionPanel[] = ["library", "graph", "inspector", "units"];

export function syncOpenPanels(
  api: DockApi,
  open: readonly SessionPanel[],
  initial = false,
) {
  for (const panel of [...api.panels])
    if (!open.includes(panel.id as SessionPanel)) api.removePanel(panel);
  for (const id of open) {
    if (api.getPanel(id)) continue;
    const reference = initial
      ? id === "graph"
        ? api.getPanel("library")
        : id === "inspector"
          ? api.getPanel("graph")
          : id === "units"
            ? api.getPanel("inspector")
            : undefined
      : api.activePanel;
    api.addPanel({
      id,
      component: id,
      title: panelTitles[id],
      position: reference
        ? {
            referencePanel: reference.id,
            direction: initial && id !== "units" ? "right" : "within",
          }
        : undefined,
    });
  }
  if (initial) {
    api.getPanel("library")?.api.setSize({ width: 280 });
    api.getPanel("inspector")?.api.setSize({ width: 350 });
  }
}

export function arrangePanels(
  api: DockApi,
  layout: TileLayout | "merge",
  activeId: SessionPanel,
) {
  const panels = order.flatMap((id) => {
    const panel = api.getPanel(id);
    return panel ? [panel] : [];
  });
  const first = panels[0];
  if (!first) return;
  // A tab floated by dragging still belongs to the same workspace. Bring the
  // anchor back into its main grid before applying a window arrangement.
  if (first.api.location.type !== "grid") {
    const target =
      api.groups.find((group) => group.api.location.type === "grid") ||
      api.addGroup({ direction: "left" });
    first.api.moveTo({
      group: target,
      position: "center",
      skipSetActive: true,
    });
  }
  // Move existing panels so React editor state and live graph instances survive.
  for (const panel of panels.slice(1))
    if (panel.api.group !== first.api.group)
      panel.api.moveTo({
        group: first.api.group,
        position: "center",
        skipSetActive: true,
      });
  for (let i = 1; layout !== "merge" && i < panels.length; i++) {
    const reference =
      layout === "quarters" && i >= 2 ? panels[i - 2] : panels[i - 1];
    panels[i].api.moveTo({
      group: reference.api.group,
      position:
        layout === "rows" || (layout === "quarters" && i >= 2)
          ? "bottom"
          : "right",
      skipSetActive: true,
    });
  }
  if (layout !== "merge") {
    const width =
      api.width /
      (layout === "columns"
        ? panels.length
        : layout === "quarters"
          ? Math.min(2, panels.length)
          : 1);
    const height =
      api.height /
      (layout === "rows"
        ? panels.length
        : layout === "quarters" && panels.length > 2
          ? 2
          : 1);
    for (const panel of panels) panel.api.setSize({ width, height });
  }
  (api.getPanel(activeId) || first).api.setActive();
}
