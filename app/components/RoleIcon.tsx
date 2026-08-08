type RoleIconProps = {
  slug: string;
  className?: string;
};

/** Small hand-drawn-style line icons, one per team tier. */
export function RoleIcon({ slug, className = "w-5 h-5" }: RoleIconProps) {
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

  switch (slug) {
    case "directors":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M15 9l-3.6 2.4L9 15l3.6-2.4L15 9z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "officers":
      return (
        <svg {...common}>
          <path d="M12 3.5l2.2 4.4 4.9.7-3.5 3.4.8 4.9L12 14.6l-4.4 2.3.8-4.9-3.5-3.4 4.9-.7L12 3.5z" />
        </svg>
      );
    case "associates":
      return (
        <svg {...common}>
          <path d="M4 20l.9-3.6L15.4 6l2.6 2.6L7.6 19.1 4 20z" />
          <path d="M13.6 7.4l2.6 2.6" />
        </svg>
      );
    case "members":
      return (
        <svg {...common}>
          <circle cx="9" cy="8.5" r="2.4" />
          <circle cx="16" cy="9.5" r="2" />
          <path d="M3.5 19c.3-3 2.6-5 5.5-5s5.2 2 5.5 5" />
          <path d="M14.5 14.3c2.3.3 4 2 4.3 4.7" />
        </svg>
      );
    default:
      return null;
  }
}
