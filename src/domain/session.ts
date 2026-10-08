import {
  createAuthoringState,
  createHistory,
  buildWorkspace,
  executeCommand,
  type AuthoringBaseline,
  type AuthoringCommand,
  type AuthoringState,
} from "./authoring.ts";
import type { LearningNode } from "./types.ts";

export type SessionPanel = "library" | "graph" | "inspector" | "units";
export interface SessionReference {
  selectedId?: string;
  unitId?: string;
  panel: SessionPanel;
}
export interface SessionSnapshot {
  readonly authoring: AuthoringState;
  readonly reference: Readonly<SessionReference>;
}
export interface SessionHistoryEntry {
  readonly label: string;
  readonly kind: "navigate" | "author";
  readonly state: SessionSnapshot;
}
/** One in-memory timeline; view controls and mode never become undo entries. */
export interface SessionState {
  readonly past: readonly SessionHistoryEntry[];
  readonly present: SessionSnapshot;
  readonly future: readonly SessionHistoryEntry[];
  readonly editMode: boolean;
  readonly showStatusBar: boolean;
  readonly panelsOpen: boolean;
  readonly mergedTabs: boolean;
  readonly creating?: LearningNode["kind"];
  readonly error: string;
  readonly message: string;
}
export type SessionAction =
  | { type: "navigate"; reference: SessionReference; label: string }
  | {
      type: "author";
      command: AuthoringCommand;
      label: string;
      /** Save and its resulting selection are one deliberate action. */
      reference?: SessionReference;
    }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "activate"; panel: SessionPanel }
  | { type: "beginCreate"; kind: LearningNode["kind"] }
  | { type: "cancelCreate" }
  | { type: "editMode.set"; value: boolean }
  | { type: "statusBar.set"; value: boolean }
  | { type: "panels.closeAll" }
  | { type: "panels.restore" }
  | { type: "panels.merge" }
  | { type: "notice"; message: string }
  | { type: "error"; message: string }
  | { type: "error.clear" };

function snapshot(
  authoring: AuthoringState,
  reference: SessionReference,
): SessionSnapshot {
  return Object.freeze({
    authoring,
    reference: Object.freeze({ ...reference }),
  });
}
function entry(
  kind: SessionHistoryEntry["kind"],
  label: string,
  state: SessionSnapshot,
): SessionHistoryEntry {
  return Object.freeze({ kind, label, state });
}
function update(
  state: SessionState,
  patch: Partial<SessionState>,
): SessionState {
  if (
    Object.entries(patch).every(
      ([key, value]) => state[key as keyof SessionState] === value,
    )
  )
    return state;
  return Object.freeze({ ...state, ...patch });
}
function sameReference(a: SessionReference, b: SessionReference) {
  return (
    a.selectedId === b.selectedId &&
    a.unitId === b.unitId &&
    a.panel === b.panel
  );
}

export function createSession(
  authoring = createAuthoringState(),
  reference: SessionReference = { panel: "graph" },
): SessionState {
  return Object.freeze({
    past: Object.freeze([]),
    present: snapshot(authoring, reference),
    future: Object.freeze([]),
    editMode: false,
    showStatusBar: true,
    panelsOpen: true,
    mergedTabs: false,
    error: "",
    message: "",
  });
}

export interface SessionHistoryControl {
  /** Raw action label. The UI supplies its Undo or Redo prefix. */
  label: string;
  enabled: boolean;
  requiresEditMode: boolean;
}
export function historyControls(state: SessionState): {
  undo: SessionHistoryControl;
  redo: SessionHistoryControl;
} {
  const control = (
    next: SessionHistoryEntry | undefined,
  ): SessionHistoryControl => {
    const requiresEditMode = next?.kind === "author" && !state.editMode;
    return {
      label: next?.label || "",
      enabled: Boolean(next) && !requiresEditMode,
      requiresEditMode,
    };
  };
  return {
    undo: control(state.past.at(-1)),
    redo: control(state.future.at(-1)),
  };
}
export const canUndo = (state: SessionState) =>
  historyControls(state).undo.enabled;
export const canRedo = (state: SessionState) =>
  historyControls(state).redo.enabled;

function travel(state: SessionState, direction: "undo" | "redo"): SessionState {
  const next = (direction === "undo" ? state.past : state.future).at(-1);
  if (!next) return state;
  if (next.kind === "author" && !state.editMode)
    return update(state, {
      error: `Enable Edit mode to ${direction} “${next.label}”.`,
      message: "",
    });
  const inverse = entry(next.kind, next.label, state.present);
  return update(state, {
    present: next.state,
    past: Object.freeze(
      direction === "undo" ? state.past.slice(0, -1) : [...state.past, inverse],
    ),
    future: Object.freeze(
      direction === "undo"
        ? [...state.future, inverse]
        : state.future.slice(0, -1),
    ),
    creating: undefined,
    panelsOpen: true,
    error: "",
    message: `${direction === "undo" ? "Undid" : "Redid"}: ${next.label}`,
  });
}

/** All rejected actions retain the exact content, reference, and timeline. */
export function dispatchSession(
  base: AuthoringBaseline,
  state: SessionState,
  action: SessionAction,
): SessionState {
  switch (action.type) {
    case "navigate": {
      if (sameReference(state.present.reference, action.reference))
        return update(state, {
          creating: undefined,
          panelsOpen: true,
          error: "",
          message: action.label,
        });
      return update(state, {
        past: Object.freeze([
          ...state.past,
          entry("navigate", action.label, state.present),
        ]),
        present: snapshot(state.present.authoring, action.reference),
        future: Object.freeze([]),
        creating: undefined,
        panelsOpen: true,
        error: "",
        message: action.label,
      });
    }
    case "author": {
      if (!state.editMode)
        return update(state, {
          error: "Enable Edit mode to change workspace content.",
          message: "",
        });
      try {
        const result = executeCommand(
          base,
          createHistory(state.present.authoring),
          action.command,
          action.label,
        );
        const before = result.past.at(-1);
        if (!before) return update(state, { error: "", message: action.label });
        if (action.reference) {
          const composed = buildWorkspace(base, result.present);
          if (
            action.reference.selectedId !== undefined &&
            !composed.nodes.some(
              (node) => node.id === action.reference!.selectedId,
            )
          )
            throw new Error("The saved concept reference does not exist.");
          if (
            action.reference.unitId !== undefined &&
            !composed.units.some((unit) => unit.id === action.reference!.unitId)
          )
            throw new Error("The saved unit reference does not exist.");
        }
        // executeCommand may normalize a drag's actual starting coordinates.
        // Its pre-action snapshot, not the stale stored placement, is undoable.
        return update(state, {
          past: Object.freeze([
            ...state.past,
            entry(
              "author",
              action.label,
              snapshot(before.state, state.present.reference),
            ),
          ]),
          present: snapshot(
            result.present,
            action.reference || state.present.reference,
          ),
          future: Object.freeze([]),
          creating: action.reference ? undefined : state.creating,
          panelsOpen: action.reference ? true : state.panelsOpen,
          error: "",
          message: action.label,
        });
      } catch (error) {
        return update(state, {
          error: error instanceof Error ? error.message : String(error),
          message: "",
        });
      }
    }
    case "undo":
    case "redo":
      return travel(state, action.type);
    case "activate":
      return update(state, {
        present:
          state.present.reference.panel === action.panel
            ? state.present
            : snapshot(state.present.authoring, {
                ...state.present.reference,
                panel: action.panel,
              }),
        panelsOpen: true,
      });
    case "beginCreate":
      if (!state.editMode)
        return update(state, {
          error: "Enable Edit mode to create a concept.",
          message: "",
        });
      return update(state, {
        creating: action.kind,
        present: snapshot(state.present.authoring, {
          ...state.present.reference,
          panel: "inspector",
        }),
        panelsOpen: true,
        error: "",
      });
    case "cancelCreate":
      return update(state, { creating: undefined });
    case "editMode.set":
      return update(state, {
        editMode: action.value,
        creating: action.value ? state.creating : undefined,
        error: "",
        message: action.value ? "Edit mode" : "Browse mode",
      });
    case "statusBar.set":
      return update(state, { showStatusBar: action.value });
    case "panels.closeAll":
      return update(state, { panelsOpen: false, creating: undefined });
    case "panels.restore":
      return update(state, { panelsOpen: true, mergedTabs: false });
    case "panels.merge":
      return update(state, { panelsOpen: true, mergedTabs: true });
    case "notice":
      return update(state, { message: action.message, error: "" });
    case "error":
      return update(state, { error: action.message, message: "" });
    case "error.clear":
      return update(state, { error: "" });
  }
}
