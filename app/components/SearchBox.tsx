import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router";
import { Icon } from "./Icon";
import { searchFields, type SearchResult } from "../data/categories";

type SearchBoxProps = {
  /** "compact" = icon-only button that expands on hover/click (desktop nav).
   *  "full" = always-expanded input, for the mobile menu. */
  variant?: "compact" | "full";
  onNavigate?: () => void;
};

function ResultsList({
  results,
  activeIndex,
  onPick,
}: {
  results: SearchResult[];
  activeIndex: number;
  onPick: (r: SearchResult) => void;
}) {
  return (
    <ul>
      {results.map((r, i) => (
        <li key={`${r.category.slug}/${r.field.slug}`}>
          <Link
            to={`/${r.category.slug}/${r.field.slug}`}
            onClick={() => onPick(r)}
            className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-md transition-colors ${
              i === activeIndex ? "bg-paper-dim" : "hover:bg-paper-dim"
            }`}
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink truncate">
                {r.field.title}
              </span>
              <span className="block text-xs text-ink-soft truncate">{r.category.label}</span>
            </span>
            <span className="course-code text-[0.65rem] text-pen shrink-0">{r.field.code}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SearchBox({ variant = "compact", onNavigate }: SearchBoxProps) {
  const [expanded, setExpanded] = useState(variant === "full");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const results = searchFields(query);

  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  function open() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setExpanded(true);
  }

  function collapse() {
    setExpanded(variant === "full");
    setQuery("");
    setActiveIndex(-1);
    inputRef.current?.blur();
  }

  function scheduleCollapse() {
    if (variant === "full") return;
    if (document.activeElement === inputRef.current) return;
    closeTimer.current = setTimeout(() => {
      if (!query) setExpanded(false);
    }, 200);
  }

  function handlePick(r: SearchResult) {
    onNavigate?.();
    collapse();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      collapse();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length) setActiveIndex((i) => (i + 1) % results.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length) setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
      return;
    }
    if (e.key === "Enter") {
      const pick = results[activeIndex] ?? results[0];
      if (pick) {
        e.preventDefault();
        navigate(`/${pick.category.slug}/${pick.field.slug}`);
        onNavigate?.();
        collapse();
      }
    }
  }

  useEffect(() => {
    if (variant === "full") return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        collapse();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  if (variant === "full") {
    return (
      <div className="px-1 py-3">
        <div className="relative flex items-center border border-rule rounded-md px-3 focus-within:border-pen transition-colors">
          <Icon name="search" className="w-4 h-4 text-ink-soft shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search guides…"
            className="w-full bg-transparent py-2.5 px-2.5 text-sm text-ink placeholder:text-ink-soft outline-none normal-case"
          />
        </div>
        {results.length > 0 && (
          <div className="mt-2 border border-rule rounded-md bg-paper max-h-72 overflow-y-auto normal-case">
            <ResultsList results={results} activeIndex={activeIndex} onPick={handlePick} />
          </div>
        )}
        {query.trim() && results.length === 0 && (
          <p className="mt-2 text-sm text-ink-soft normal-case px-1">
            No guides match "{query}".
          </p>
        )}
      </div>
    );
  }

  // The outer box stays a fixed w-9 h-9 in normal flow, so expanding never
  // shoves the theme toggle or "Get involved" button sideways. The growing
  // search field is absolutely positioned, anchored to the button's right
  // edge, and expands leftward over whatever space is there.
  return (
    <div
      ref={containerRef}
      className="relative w-9 h-9 shrink-0"
      onMouseEnter={open}
      onMouseLeave={scheduleCollapse}
    >
      <div
        className={`absolute top-0 right-0 z-40 h-9 flex items-center gap-2 rounded-md border overflow-hidden transition-all duration-300 ease-out ${
          expanded
            ? "w-64 px-3 border-rule bg-paper shadow-lg"
            : "w-9 px-0 border-transparent bg-transparent"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            open();
            inputRef.current?.focus();
          }}
          aria-label="Search guides"
          aria-expanded={expanded}
          tabIndex={expanded ? -1 : 0}
          className={`shrink-0 flex items-center justify-center text-ink-soft hover:text-ink transition-colors ${
            expanded ? "w-4 h-4" : "w-9 h-9 rounded-md border border-rule hover:border-pen/40"
          }`}
        >
          <Icon name="search" className={expanded ? "w-4 h-4" : "w-[18px] h-[18px]"} />
        </button>
        <input
          ref={inputRef}
          type="text"
          tabIndex={expanded ? 0 : -1}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={open}
          placeholder="Search guides…"
          className="flex-1 min-w-0 bg-transparent outline-none text-sm text-ink placeholder:text-ink-soft normal-case"
        />
      </div>

      {expanded && results.length > 0 && (
        <div className="absolute top-full right-0 mt-2 w-80 z-50 bg-paper border border-rule rounded-lg shadow-lg p-2 normal-case">
          <ResultsList results={results} activeIndex={activeIndex} onPick={handlePick} />
        </div>
      )}
      {expanded && query.trim() && results.length === 0 && (
        <div className="absolute top-full right-0 mt-2 w-80 z-50 bg-paper border border-rule rounded-lg shadow-lg p-4 normal-case">
          <p className="text-sm text-ink-soft">No guides match "{query}".</p>
        </div>
      )}
    </div>
  );
}
