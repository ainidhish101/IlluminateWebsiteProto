import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { ALL_GPA_SYSTEMS, DEFAULT_SYSTEM, type GpaSystem } from "../../data/gpaSystems";

/** Searchable dropdown over the Texas ISD presets, plus the generic default and "Custom" entry. */
export function SystemPicker({
  systemId,
  onSelect,
}: {
  systemId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = systemId === "custom" ? null : ALL_GPA_SYSTEMS.find((s) => s.id === systemId);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_GPA_SYSTEMS;
    return ALL_GPA_SYSTEMS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.region.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(raf);
    };
  }, [open]);

  function pick(id: string) {
    onSelect(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 bg-paper border border-rule rounded-md text-sm text-ink hover:border-pen transition-colors"
      >
        <span className="min-w-0 text-left">
          <span className="block font-medium truncate">
            {systemId === "custom" ? "Custom scale" : active?.label ?? DEFAULT_SYSTEM.label}
          </span>
          {active && !systemId.includes("custom") && (
            <span className="block text-xs text-ink-soft truncate">{active.region}</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-ink-soft shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[280px] z-50 bg-paper border border-rule rounded-lg shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 border-b border-rule px-3">
            <Search className="w-4 h-4 text-ink-soft shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Texas ISDs…"
              className="w-full bg-transparent py-2.5 text-sm text-ink placeholder:text-ink-soft outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto py-1.5">
            {results.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={systemId === s.id}
                  onClick={() => pick(s.id)}
                  className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-paper-dim transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink truncate">{s.label}</span>
                    <span className="block text-xs text-ink-soft truncate">
                      {s.region} · {s.maxScale} scale
                    </span>
                  </span>
                  {systemId === s.id && <Check className="w-4 h-4 text-pen shrink-0" />}
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-3.5 py-4 text-sm text-ink-soft">
                No district matches "{query}". Try "Custom scale" below to build your own.
              </li>
            )}
            <li className="border-t border-rule mt-1 pt-1">
              <button
                type="button"
                role="option"
                aria-selected={systemId === "custom"}
                onClick={() => pick("custom")}
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-paper-dim transition-colors"
              >
                <span>
                  <span className="block text-sm font-medium text-ink">Custom scale</span>
                  <span className="block text-xs text-ink-soft">
                    District not listed? Build your own weighting.
                  </span>
                </span>
                {systemId === "custom" && <Check className="w-4 h-4 text-pen shrink-0" />}
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export type { GpaSystem };
