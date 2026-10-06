import { useState } from "react";
import type { NodeGroup } from "../domain/authoring";
import { useWorkspace } from "./context";

function GroupEditor({
  group,
  close,
}: {
  group?: NodeGroup;
  close: () => void;
}) {
  const w = useWorkspace();
  const [name, setName] = useState(group?.name || "");
  const [color, setColor] = useState(group?.color || "#438570");
  return (
    <form
      className="group-editor"
      onSubmit={(event) => {
        event.preventDefault();
        if (
          w.perform(
            {
              type: "group.put",
              group: {
                id: group?.id || `urn:hvacr:group:${crypto.randomUUID()}`,
                name: name.trim(),
                color,
                nodeIds: group?.nodeIds || [],
              },
            },
            group ? "Edit group" : "Create group",
          )
        )
          close();
      }}
    >
      <label>
        Group name
        <input
          aria-label="Group name"
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>
      <label>
        Group colour
        <input
          aria-label="Group colour"
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
      </label>
      <div className="action-row">
        <button type="submit" disabled={!name.trim()}>
          Save group
        </button>
        <button type="button" onClick={close}>
          Cancel group edit
        </button>
      </div>
    </form>
  );
}

export function GroupsPanel() {
  const w = useWorkspace();
  const [editing, setEditing] = useState<string>();
  return (
    <details className="groups-panel">
      <summary>Groups · {w.groups.length}</summary>
      <p className="muted">
        A concept can belong to several groups. The first group's colour is used
        on the map; a badge shows its total group count.
      </p>
      {w.groups.map((group) => (
        <div key={group.id} className="group-item" data-group-id={group.id}>
          <div className="group-title">
            <i style={{ backgroundColor: group.color }} />
            <strong>{group.name}</strong>
            <span>{group.nodeIds.length} concepts</span>
          </div>
          {editing === group.id ? (
            <GroupEditor group={group} close={() => setEditing(undefined)} />
          ) : (
            <div className="action-row">
              <button
                onClick={() => setEditing(group.id)}
                aria-label={`Edit group ${group.name}`}
              >
                Edit
              </button>
              <button
                onClick={() =>
                  w.setGroupFilter(w.groupFilter === group.id ? null : group.id)
                }
                aria-pressed={w.groupFilter === group.id}
                aria-label={`Filter group ${group.name}`}
              >
                Filter map
              </button>
              <button
                onClick={() => {
                  if (
                    w.perform(
                      { type: "group.delete", id: group.id },
                      "Delete group",
                    )
                  ) {
                    if (w.groupFilter === group.id) w.setGroupFilter(null);
                  }
                }}
                aria-label={`Delete group ${group.name}`}
              >
                Delete group
              </button>
            </div>
          )}
          <p className="muted">
            Deleting a group keeps its concepts and can be undone.
          </p>
        </div>
      ))}
      {editing === "new" ? (
        <GroupEditor close={() => setEditing(undefined)} />
      ) : (
        <button className="load-more" onClick={() => setEditing("new")}>
          New group
        </button>
      )}
    </details>
  );
}

export function NodeGroups({ id }: { id: string }) {
  const w = useWorkspace();
  return (
    <details className="node-groups">
      <summary>
        Group membership ·{" "}
        {w.groups.filter((g) => g.nodeIds.includes(id)).length}
      </summary>
      {w.groups.length ? (
        w.groups.map((group) => (
          <label className="checkbox-label" key={group.id}>
            <input
              type="checkbox"
              aria-label={`Member of ${group.name}`}
              checked={group.nodeIds.includes(id)}
              onChange={(e) =>
                w.perform(
                  {
                    type: "group.put",
                    group: {
                      ...group,
                      nodeIds: e.target.checked
                        ? [...group.nodeIds, id]
                        : group.nodeIds.filter((n) => n !== id),
                    },
                  },
                  e.target.checked
                    ? `Add to ${group.name}`
                    : `Remove from ${group.name}`,
                )
              }
            />
            <i
              className="group-swatch"
              style={{ backgroundColor: group.color }}
            />
            {group.name}
          </label>
        ))
      ) : (
        <p className="muted">
          Create a group in Search / Library, then add this concept here.
        </p>
      )}
    </details>
  );
}
