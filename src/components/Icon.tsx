type IconName =
  | "arrow-up-right"
  | "arrow-left"
  | "arrow-right"
  | "arrow-both"
  | "search"
  | "play"
  | "pause";

const paths: Record<IconName, string> = {
  "arrow-up-right": "M5 19 19 5M5 5h14v14",
  "arrow-left": "M19 12H5m7-7-7 7 7 7",
  "arrow-right": "M5 12h14m-7-7 7 7-7 7",
  "arrow-both": "M4 12h16M9 7l-5 5 5 5m6-10 5 5-5 5",
  search: "m16 16 5 5",
  play: "m7 4 13 8-13 8Z",
  pause: "M8 5v14M16 5v14",
};

/** Decorative interface marks must not depend on a platform's emoji font. */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      data-icon={name}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {name === "search" && <circle cx="10.5" cy="10.5" r="6.5" />}
      <path d={paths[name]} />
    </svg>
  );
}
