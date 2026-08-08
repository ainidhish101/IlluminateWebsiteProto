export type IconName =
  | "sparkle"
  | "book"
  | "clipboard-check"
  | "heart"
  | "cap"
  | "sun"
  | "pen-nib"
  | "search-check"
  | "users"
  | "megaphone"
  | "search";

type IconProps = {
  name: IconName;
  className?: string;
};

/** Small hand-drawn-style line icons shared across cards site-wide. */
export function Icon({ name, className = "w-5 h-5" }: IconProps) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "sparkle":
      return (
        <svg {...common}>
          <path d="M12 3.5l2.2 4.4 4.9.7-3.5 3.4.8 4.9L12 14.6l-4.4 2.3.8-4.9-3.5-3.4 4.9-.7L12 3.5z" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M3.5 5.5c2.5-1 5-1 8.5.5v13c-3.5-1.5-6-1.5-8.5-.5V5.5z" />
          <path d="M20.5 5.5c-2.5-1-5-1-8.5.5v13c3.5-1.5 6-1.5 8.5-.5V5.5z" />
        </svg>
      );
    case "clipboard-check":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
          <path d="M8.5 13l2 2 4.5-4.5" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common}>
          <path d="M12 20.5s-7.5-4.6-9.5-9.4C1.2 7.6 3.4 4.5 6.6 4.5c1.9 0 3.4 1 4.4 2.4 1-1.4 2.5-2.4 4.4-2.4 3.2 0 5.4 3.1 4.1 6.6-2 4.8-9.5 9.4-9.5 9.4z" />
        </svg>
      );
    case "cap":
      return (
        <svg {...common}>
          <path d="M12 4L2 9l10 5 8-4V4z" />
          <path d="M20 10v4.5" />
          <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5M18.4 18.4l-1.5-1.5M7.1 7.1 5.6 5.6" />
        </svg>
      );
    case "pen-nib":
      return (
        <svg {...common}>
          <path d="M4 20l.9-3.6L15.4 6l2.6 2.6L7.6 19.1 4 20z" />
          <path d="M13.6 7.4l2.6 2.6" />
        </svg>
      );
    case "search-check":
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="M15.2 15.2L20 20" />
          <path d="M7.7 10.5l1.8 1.8 3.1-3.4" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8.5" r="2.4" />
          <circle cx="16" cy="9.5" r="2" />
          <path d="M3.5 19c.3-3 2.6-5 5.5-5s5.2 2 5.5 5" />
          <path d="M14.5 14.3c2.3.3 4 2 4.3 4.7" />
        </svg>
      );
    case "megaphone":
      return (
        <svg {...common}>
          <path d="M3 10v4a1 1 0 0 0 1 1h1l7 4V5l-7 4H4a1 1 0 0 0-1 1z" />
          <path d="M17 9a4 4 0 0 1 0 6" />
          <path d="M12 15.5V19a1 1 0 0 1-1.7.7L8 17.3" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.3 15.3L20.5 20.5" />
        </svg>
      );
    default:
      return null;
  }
}

/** Maps a category slug (from data/categories) to its badge icon. */
export function categoryIcon(slug: string): IconName {
  switch (slug) {
    case "extracurriculars":
      return "sparkle";
    case "academics":
      return "book";
    case "testing":
      return "clipboard-check";
    case "lifestyle":
      return "heart";
    case "college":
      return "cap";
    case "summer":
      return "sun";
    default:
      return "sparkle";
  }
}
