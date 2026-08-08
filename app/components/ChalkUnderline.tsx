type ChalkUnderlineProps = {
  color?: string;
  className?: string;
};

/** A single hand-drawn underline stroke — the page's one recurring signature mark. */
export function ChalkUnderline({ color = "var(--color-marker)", className = "" }: ChalkUnderlineProps) {
  return (
    <svg
      viewBox="0 0 200 14"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`absolute left-0 -bottom-1 w-full h-[0.4em] ${className}`}
    >
      <path
        d="M1 8.5C34 4 72 3 101 6.5C130 10 168 9.5 199 5"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
