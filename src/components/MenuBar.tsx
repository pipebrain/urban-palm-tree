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
  | "viewInspector"
  | "viewGraph"
  | "viewLibrary"
  | "viewUnits"
  | "toggleStatusBar"
  | "toggleEditMode"
  | "tileColumns"
  | "tileRows"
  | "tileQuarters"
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
  canTileTabs: boolean;
};

type MenuItem = {
  action?: MenuAction;
  label: string;
  disabled?: boolean;
  checked?: boolean;
  shortcut?: string;
  description?: string;
  submenu?: MenuItem[];
  dividerBefore?: boolean;
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
  canTileTabs,
}: MenuBarProps) {
  const id = useId();
  const bar = useRef<HTMLElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const submenuPopup = useRef<HTMLDivElement>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const submenuItems = useRef<(HTMLButtonElement | null)[]>([]);
  const firstItem = useRef(0);
  const firstSubmenuItem = useRef(0);
  const focusSubmenu = useRef(false);
  const pointerActivation = useRef("");
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null);
  const [tabStop, setTabStop] = useState(0);
  const [position, setPosition] = useState({ left: 8, top: 48 });
  const [submenuPosition, setSubmenuPosition] = useState({ left: 8, top: 96 });
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  const menus: { label: string; items: MenuItem[]; note?: string }[] = [
    {
      label: "HVACRbuild",
      items: [{ action: "about", label: "About" }],
    },
    {
      label: "File",
      items: [
        { action: "fileNew", label: "New", disabled: true },
        { action: "fileOpen", label: "Open", disabled: true },
        { action: "fileClose", label: "Close", disabled: true },
        { action: "fileSave", label: "Save", disabled: true },
        { action: "fileExport", label: "Export", disabled: true },
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
        { action: "viewInspector", label: "Inspector" },
        { action: "viewGraph", label: "Knowledge Map" },
        { action: "viewLibrary", label: "Library" },
        { action: "viewUnits", label: "Units" },
        {
          action: "toggleStatusBar",
          label: showStatusBar ? "Hide Status Bar" : "Show Status Bar",
          dividerBefore: true,
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
          label: "Tile Tabs",
          disabled: !canTileTabs,
          submenu: [
            { action: "tileColumns", label: "Columns" },
            { action: "tileRows", label: "Rows" },
            { action: "tileQuarters", label: "Quarters" },
          ],
        },
        {
          action: "mergeTabs",
          label: "Merge All Tabs",
          disabled: !canMergeTabs,
        },
        {
          action: "closeTabs",
          label: "Close All Tabs",
          disabled: !hasOpenTabs,
        },
      ],
    },
  ];
  const menu = activeMenu === null ? undefined : menus[activeMenu];
  const submenuParent =
    activeSubmenu === null ? undefined : menu?.items[activeSubmenu];
  const submenu = submenuParent?.disabled ? undefined : submenuParent?.submenu;

  function dismiss(restoreFocus = false) {
    setActiveSubmenu(null);
    setActiveMenu(null);
    if (restoreFocus && activeMenu !== null)
      triggers.current[activeMenu]?.focus();
  }

  function closeSubmenu(restoreFocus = false) {
    setActiveSubmenu(null);
    if (restoreFocus && activeSubmenu !== null)
      items.current[activeSubmenu]?.focus();
  }

  function open(index: number, last = false) {
    setActiveSubmenu(null);
    firstItem.current = last ? menus[index].items.length - 1 : 0;
    setTabStop(index);
    if (activeMenu === index) items.current[firstItem.current]?.focus();
    else setActiveMenu(index);
  }

  function openSubmenu(index: number, focus = true, last = false) {
    const item = menu?.items[index];
    if (!item?.submenu || item.disabled) return;
    firstSubmenuItem.current = last ? item.submenu.length - 1 : 0;
    focusSubmenu.current = focus;
    if (activeSubmenu === index && focus)
      submenuItems.current[firstSubmenuItem.current]?.focus();
    else setActiveSubmenu(index);
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
      const width = popup.current?.getBoundingClientRect().width || 284;
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

  useLayoutEffect(() => {
    if (activeMenu === null || activeSubmenu === null || !submenu) return;
    const updatePosition = () => {
      const anchor = items.current[activeSubmenu]?.getBoundingClientRect();
      const parent = popup.current?.getBoundingClientRect();
      const child = submenuPopup.current?.getBoundingClientRect();
      if (!anchor || !parent || !child) return;
      let left = parent.right - 3;
      let top = anchor.top - 5;
      if (left + child.width > innerWidth - 8) {
        left = parent.left - child.width + 3;
        if (left < 8) {
          // A narrow viewport cannot fit two menus side by side. Keep the
          // parent row visible so touch users can tap it to close the submenu.
          left = Math.max(
            8,
            Math.min(parent.left, innerWidth - child.width - 8),
          );
          top = anchor.bottom;
        }
      }
      setSubmenuPosition({
        left: Math.max(8, left),
        top: Math.max(8, Math.min(top, innerHeight - child.height - 8)),
      });
    };
    updatePosition();
    if (focusSubmenu.current)
      submenuItems.current[firstSubmenuItem.current]?.focus();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [
    activeMenu,
    activeSubmenu,
    position.left,
    position.top,
    Boolean(submenu),
  ]);

  useEffect(() => {
    if (activeMenu === null) return;
    const outside = (event: Event) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !bar.current?.contains(target) &&
        !popup.current?.contains(target) &&
        !submenuPopup.current?.contains(target)
      ) {
        setActiveMenu(null);
        setActiveSubmenu(null);
      }
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

  function leaveByTab(event: KeyboardEvent<HTMLButtonElement>) {
    if (activeMenu === null) return;
    // The popup lives at the end of body. Continue from its trigger so that
    // WebKit and Chromium both leave the menu in the document's tab order.
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
    dismiss();
  }

  function itemKeys(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
    nested = false,
  ) {
    const entries = nested ? submenu : menu?.items;
    if (!entries || activeMenu === null) return;
    const refs = nested ? submenuItems : items;
    let next: number | undefined;
    switch (event.key) {
      case "ArrowDown":
        next = (index + 1) % entries.length;
        break;
      case "ArrowUp":
        next = (index - 1 + entries.length) % entries.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = entries.length - 1;
        break;
      case "ArrowRight":
        event.preventDefault();
        if (!nested && entries[index].submenu) openSubmenu(index);
        else moveMenu(activeMenu, 1, true);
        return;
      case "ArrowLeft":
        event.preventDefault();
        if (nested) closeSubmenu(true);
        else moveMenu(activeMenu, -1, true);
        return;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        if (nested) closeSubmenu(true);
        else dismiss(true);
        return;
      case "Tab":
        leaveByTab(event);
        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          const offset = entries.findIndex((_, offset) => {
            const candidate = entries[(index + offset + 1) % entries.length];
            return candidate.label
              .toLowerCase()
              .startsWith(event.key.toLowerCase());
          });
          if (offset !== -1) next = (index + offset + 1) % entries.length;
        }
    }
    if (next !== undefined) {
      event.preventDefault();
      if (!nested) closeSubmenu();
      refs.current[next]?.focus();
    }
  }

  function renderItem(item: MenuItem, index: number, nested = false) {
    const itemId = `${id}-${nested ? "submenu" : "item"}-${index}`;
    return (
      <button
        key={item.action || item.label}
        id={itemId}
        ref={(element) => {
          (nested ? submenuItems : items).current[index] = element;
        }}
        type="button"
        role={item.checked === undefined ? "menuitem" : "menuitemcheckbox"}
        aria-label={item.label}
        aria-checked={item.checked}
        aria-disabled={item.disabled || undefined}
        aria-haspopup={item.submenu ? "menu" : undefined}
        aria-expanded={
          item.submenu ? activeSubmenu === index && !item.disabled : undefined
        }
        aria-controls={
          item.submenu && activeSubmenu === index ? `${id}-submenu` : undefined
        }
        aria-describedby={item.description ? `${itemId}-detail` : undefined}
        tabIndex={-1}
        className={`app-menu-item${item.dividerBefore ? " app-menu-divider" : ""}`}
        onKeyDown={(event) => itemKeys(event, index, nested)}
        onPointerDown={(event) => {
          pointerActivation.current = event.pointerType;
        }}
        onPointerEnter={(event) => {
          if (event.pointerType !== "mouse" || nested) return;
          if (item.submenu && !item.disabled) openSubmenu(index, false);
          else closeSubmenu();
        }}
        onClick={(event) => {
          if (item.disabled) return;
          if (item.submenu) {
            if (
              activeSubmenu === index &&
              event.detail !== 0 &&
              pointerActivation.current === "touch"
            )
              closeSubmenu(true);
            else openSubmenu(index);
          } else if (item.action) {
            dismiss(true);
            onAction(item.action);
          }
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
            <span id={`${itemId}-detail`} className="app-menu-item-detail">
              {item.description}
            </span>
          )}
        </span>
        {item.shortcut && (
          <span className="app-menu-shortcut" aria-hidden="true">
            {item.shortcut}
          </span>
        )}
        {item.submenu && (
          <svg
            className="app-menu-chevron"
            viewBox="0 0 16 16"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m6 4 4 4-4 4" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <>
      <header className="app-menu-bar" ref={bar}>
        <button
          type="button"
          className="brand-mark app-system-button"
          aria-label="System"
          aria-disabled="true"
          tabIndex={-1}
        >
          <AppMark />
        </button>
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
            {menu.items.map((item, index) => renderItem(item, index))}
            {menu.note && (
              <div id={`${id}-note`} className="app-menu-note">
                {menu.note}
              </div>
            )}
          </div>,
          document.body,
        )}
      {submenu &&
        activeSubmenu !== null &&
        createPortal(
          <div
            ref={submenuPopup}
            id={`${id}-submenu`}
            className="app-menu-popup app-submenu-popup"
            role="menu"
            aria-labelledby={`${id}-item-${activeSubmenu}`}
            style={{ left: submenuPosition.left, top: submenuPosition.top }}
          >
            {submenu.map((item, index) => renderItem(item, index, true))}
          </div>,
          document.body,
        )}
    </>
  );
}
