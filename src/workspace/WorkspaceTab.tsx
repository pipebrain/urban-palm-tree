import { useEffect, useState } from "react";
import type { IDockviewPanelHeaderProps } from "dockview-react";
import type { SessionPanel } from "../domain/session";
import { useWorkspace } from "./context";

export const panelTitles: Record<SessionPanel, string> = {
  inspector: "Inspector",
  graph: "Knowledge Map",
  library: "Library",
  units: "Units",
};

export function CloseTabIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="m4 4 8 8m0-8-8 8" />
    </svg>
  );
}

export function WorkspaceTab({ api }: IDockviewPanelHeaderProps) {
  const { closePanel } = useWorkspace();
  const [visible, setVisible] = useState(api.isVisible);
  useEffect(() => {
    setVisible(api.isVisible);
    const listener = api.onDidVisibilityChange((event) =>
      setVisible(event.isVisible),
    );
    return () => listener.dispose();
  }, [api]);
  const id = api.id as SessionPanel;
  return (
    <div
      className="workspace-tab"
      data-panel-id={id}
      data-visible={visible}
      onAuxClick={(event) => {
        if (event.button === 1) {
          event.preventDefault();
          closePanel(id);
        }
      }}
    >
      <span>{panelTitles[id]}</span>
      <button
        type="button"
        className="tab-close"
        aria-label={`Close ${panelTitles[id]}`}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          closePanel(id);
        }}
      >
        <CloseTabIcon />
      </button>
    </div>
  );
}
