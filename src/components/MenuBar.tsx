import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import "./MenuBar.css";

export type MenuAction =
  | "about"
  | "fileNew"
  | "fileOpen"
  | "fileClose"
  | "fileSave"
  | "fileExport"
  | "undo"
  | "redo"
  | "toggleStatusBar"
  | "toggleEditMode"
  | "mergeTabs"
  | "closeTabs";

type MenuBarProps = {
  onAction: (action: MenuAction) => void;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel?: string;
  redoLabel?: string;
  showStatusBar: boolean;
  editMode: boolean;
  hasOpenTabs: boolean;
  canMergeTabs: boolean;
};

type MenuItem = {
  action: MenuAction;
  label: string;
  disabled?: boolean;
  checked?: boolean;
  shortcut?: string;
  description?: string;
};

/** A font-independent H and northeast vector: never substituted with emoji. */
function AppMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M5 7h7v2h-2v7h9V9h-2V7h7v2h-2v17h2v2h-7v-2h2v-8h-9v8h2v2H5v-2h2V9H5Z"
      />
      <path
        d="m20 12 8-8m-6 0h6v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MenuBar({
  onAction,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  showStatusBar,
  editMode,
  hasOpenTabs,
  canMergeTabs,
}: MenuBarProps) {
  const id = useId();
  const bar = useRef<HTMLElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const firstItem = useRef(0);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [tabStop, setTabStop] = useState(0);
  const [position, setPosition] = useState({ left: 8, top: 48 });
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  const menus: { label: string; items: MenuItem[]; note?: string }[] = [
    {
      label: "HVACRbuild.app",
      items: [{ action: "about", label: "About HVACRbuild.app" }],
    },
    {
      label: "File",
      items: [
        { action: "fileNew", label: "New", disabled: true },
        { action: "fileOpen", label: "Open…", disabled: true },
        { action: "fileClose", label: "Close", disabled: true },
        { action: "fileSave", label: "Save", disabled: true },
        { action: "fileExport", label: "Export…", disabled: true },
      ],
      note: "Workspace files become available in M3.",
    },
    {
      label: "Edit",
      items: [
        {
          action: "undo",
          label: "Undo",
          description: canUndo ? undoLabel : undefined,
          disabled: !canUndo,
          shortcut: mac ? "⌘Z" : "Ctrl+Z",
        },
        {
          action: "redo",
          label: "Redo",
          description: canRedo ? redoLabel : undefined,
          disabled: !canRedo,
          shortcut: mac ? "⇧⌘Z" : "Ctrl+Shift+Z",
        },
      ],
    },
    {
      label: "View",
      items: [
        {
          action: "toggleStatusBar",
          label: "Show status bar",
          checked: showStatusBar,
        },
      ],
    },
    {
      label: "Develop",
      items: [
        {
          action: "toggleEditMode",
          label: editMode ? "Leave Edit Mode" : "Enter Edit Mode",
          checked: editMode,
        },
      ],
    },
    {
      label: "Window",
      items: [
        {
          action: "mergeTabs",
          label: "Merge all tabs",
          disabled: !canMergeTabs,
        },
        {
          action: "closeTabs",
          label: "Close all tabs",
          disabled: !hasOpenTabs,
        },
      ],
    },
  ];
  const menu = activeMenu === null ? undefined : menus[activeMenu];

  function dismiss(restoreFocus = false) {
    setActiveMenu(null);
    if (restoreFocus && activeMenu !== null)
      triggers.current[activeMenu]?.focus();
  }

  function open(index: number, last = false) {
    firstItem.current = last ? menus[index].items.length - 1 : 0;
    setTabStop(index);
    if (activeMenu === index) items.current[firstItem.current]?.focus();
    else setActiveMenu(index);
  }

  function moveMenu(index: number, offset: number, expanded: boolean) {
    const next = (index + offset + menus.length) % menus.length;
    setTabStop(next);
    triggers.current[next]?.focus();
    if (expanded) open(next);
  }

  useLayoutEffect(() => {
    if (activeMenu === null) return;
    const updatePosition = () => {
      const anchor = triggers.current[activeMenu]?.getBoundingClientRect();
      const width = popup.current?.getBoundingClientRect().width || 280;
      if (anchor)
        setPosition({
          left: Math.max(8, Math.min(anchor.left, innerWidth - width - 8)),
          top: anchor.bottom + 5,
        });
    };
    updatePosition();
    items.current[firstItem.current]?.focus();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [activeMenu]);

  useEffect(() => {
    if (activeMenu === null) return;
    const outside = (event: Event) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !bar.current?.contains(target) &&
        !popup.current?.contains(target)
      )
        setActiveMenu(null);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
    };
  }, [activeMenu]);

  function triggerKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowLeft":
        event.preventDefault();
        moveMenu(
          index,
          event.key === "ArrowRight" ? 1 : -1,
          activeMenu !== null,
        );
        break;
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        open(index, event.key === "ArrowUp");
        break;
      case "Home":
      case "End": {
        event.preventDefault();
        const next = event.key === "Home" ? 0 : menus.length - 1;
        setTabStop(next);
        triggers.current[next]?.focus();
        if (activeMenu !== null) open(next);
        break;
      }
      case "Escape":
        event.preventDefault();
        dismiss(true);
        break;
      case "Tab":
        dismiss();
        break;
    }
  }

  function itemKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!menu || activeMenu === null) return;
    let next: number | undefined;
    switch (event.key) {
      case "ArrowDown":
        next = (index + 1) % menu.items.length;
        break;
      case "ArrowUp":
        next = (index - 1 + menu.items.length) % menu.items.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = menu.items.length - 1;
        break;
      case "ArrowLeft":
      case "ArrowRight":
        event.preventDefault();
        moveMenu(activeMenu, event.key === "ArrowRight" ? 1 : -1, true);
        return;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        dismiss(true);
        return;
      case "Tab":
        // The popup lives at the end of body. Continue from its trigger so that
        // WebKit and Chromium both leave the menu in the document's tab order.
        {
          const trigger = triggers.current[activeMenu];
          const focusable = [
            ...document.querySelectorAll<HTMLElement>(
              "a[href], area[href], button, input, select, textarea, iframe, [tabindex], summary",
            ),
          ].filter(
            (element) =>
              element.tabIndex >= 0 &&
              !element.matches(":disabled") &&
              !element.closest("[inert]") &&
              element.getClientRects().length > 0 &&
              getComputedStyle(element).visibility !== "hidden",
          );
          const current = trigger ? focusable.indexOf(trigger) : -1;
          const next = focusable[current + (event.shiftKey ? -1 : 1)];
          if (current !== -1 && next) {
            event.preventDefault();
            next.focus();
          } else trigger?.focus();
        }
        dismiss();
        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          const offset = menu.items.findIndex((_, offset) => {
            const candidate =
              menu.items[(index + offset + 1) % menu.items.length];
            return candidate.label
              .toLowerCase()
              .startsWith(event.key.toLowerCase());
          });
          if (offset !== -1) next = (index + offset + 1) % menu.items.length;
        }
    }
    if (next !== undefined) {
      event.preventDefault();
      items.current[next]?.focus();
    }
  }

  return (
    <>
      <header className="app-menu-bar" ref={bar}>
        <nav role="menubar" aria-label="Application menu" className="app-menus">
          {menus.map((entry, index) => (
            <button
              key={entry.label}
              ref={(element) => {
                triggers.current[index] = element;
              }}
              id={`${id}-trigger-${index}`}
              type="button"
              role="menuitem"
              aria-label={entry.label}
              aria-haspopup="menu"
              aria-expanded={activeMenu === index}
              aria-controls={activeMenu === index ? `${id}-menu` : undefined}
              className={`app-menu-trigger${index === 0 ? " app-menu-brand" : ""}`}
              tabIndex={tabStop === index ? 0 : -1}
              onFocus={() => setTabStop(index)}
              onClick={() =>
                activeMenu === index ? dismiss(true) : open(index)
              }
              onPointerEnter={(event) => {
                if (
                  event.pointerType === "mouse" &&
                  activeMenu !== null &&
                  activeMenu !== index
                )
                  open(index);
              }}
              onKeyDown={(event) => triggerKeys(event, index)}
            >
              {index === 0 && (
                <span className="brand-mark app-menu-mark">
                  <AppMark />
                </span>
              )}
              <span className={index === 0 ? "app-menu-name" : undefined}>
                {entry.label}
              </span>
            </button>
          ))}
        </nav>
      </header>
      {menu &&
        createPortal(
          <div
            ref={popup}
            id={`${id}-menu`}
            className="app-menu-popup"
            role="menu"
            aria-labelledby={`${id}-trigger-${activeMenu}`}
            aria-describedby={menu.note ? `${id}-note` : undefined}
            style={{ left: position.left, top: position.top }}
          >
            {menu.items.map((item, index) => (
              <button
                key={item.action}
                ref={(element) => {
                  items.current[index] = element;
                }}
                type="button"
                role={
                  item.checked === undefined ? "menuitem" : "menuitemcheckbox"
                }
                aria-label={item.label}
                aria-checked={item.checked}
                aria-disabled={item.disabled || undefined}
                aria-describedby={
                  item.description ? `${id}-${item.action}-detail` : undefined
                }
                tabIndex={-1}
                className="app-menu-item"
                onKeyDown={(event) => itemKeys(event, index)}
                onClick={() => {
                  if (item.disabled) return;
                  dismiss(true);
                  onAction(item.action);
                }}
              >
                <span className="app-menu-check" aria-hidden="true">
                  {item.checked && (
                    <svg viewBox="0 0 16 16" focusable="false">
                      <path d="m3 8 3 3 7-7" />
                    </svg>
                  )}
                </span>
                <span className="app-menu-item-copy">
                  <span>{item.label}</span>
                  {item.description && (
                    <span
                      id={`${id}-${item.action}-detail`}
                      className="app-menu-item-detail"
                    >
                      {item.description}
                    </span>
                  )}
                </span>
                {item.shortcut && (
                  <span className="app-menu-shortcut" aria-hidden="true">
                    {item.shortcut}
                  </span>
                )}
              </button>
            ))}
            {menu.note && (
              <div id={`${id}-note`} className="app-menu-note">
                {menu.note}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
