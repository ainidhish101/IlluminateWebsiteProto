/*
  Study resources — a searchable index of every published Illuminate guide,
  plus whatever the user has bookmarked.

  The guide list is the site's own `categories` data rather than a second
  copy in the database: publish a guide on the site and it shows up here.
*/

import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Bookmark, BookmarkCheck, BookOpen, Search, X } from "lucide-react";
import {
  Chip,
  EmptyState,
  PageHeader,
  Panel,
  StatTile,
  TextInput,
} from "~/components/dashboard/ui";
import { categories, type Category, type Field as GuideField } from "~/data/categories";
import { useAuth } from "~/auth";

type Entry = { category: Category; field: GuideField; href: string };

const ALL_ENTRIES: Entry[] = categories.flatMap((category) =>
  category.tiers.flatMap((tier) =>
    tier.fields.map((field) => ({
      category,
      field,
      href: `/${category.slug}/${field.slug}`,
    })),
  ),
);

export default function ResourcesTab() {
  const { savedResources, isSaved, toggleSaved } = useAuth();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [savedOnly, setSavedOnly] = useState(false);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ALL_ENTRIES.filter((entry) => {
      if (activeCategory !== "all" && entry.category.slug !== activeCategory) return false;
      if (savedOnly && !isSaved(entry.href)) return false;
      if (!needle) return true;
      return (
        entry.field.title.toLowerCase().includes(needle) ||
        entry.field.blurb.toLowerCase().includes(needle) ||
        entry.category.label.toLowerCase().includes(needle)
      );
    });
  }, [query, activeCategory, savedOnly, isSaved]);

  return (
    <>
      <PageHeader
        eyebrow="Personal"
        title="Study resources"
        description="Every guide Illuminate publishes, searchable and taggable. Bookmark the ones you'll come back to."
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatTile label="Guides available" value={ALL_ENTRIES.length} icon={BookOpen} />
        <StatTile
          label="Bookmarked"
          value={savedResources.length}
          hint="Synced with your account"
          icon={BookmarkCheck}
          tone="marker"
        />
        <StatTile label="Categories" value={categories.length} icon={Search} tone="good" />
      </div>

      <Panel
        title="Browse the library"
        description={`${results.length} guide${results.length === 1 ? "" : "s"} match your filters.`}
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guides — essays, AP classes, burnout…"
              aria-label="Search guides"
              className="pl-10 pr-10"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-soft hover:text-ink rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <FilterChip
              active={activeCategory === "all" && !savedOnly}
              onClick={() => {
                setActiveCategory("all");
                setSavedOnly(false);
              }}
            >
              All
            </FilterChip>
            {categories.map((category) => (
              <FilterChip
                key={category.slug}
                active={activeCategory === category.slug}
                onClick={() => setActiveCategory(category.slug)}
              >
                {category.label}
              </FilterChip>
            ))}
            <FilterChip active={savedOnly} onClick={() => setSavedOnly((value) => !value)}>
              Bookmarked only
            </FilterChip>
          </div>

          {results.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Nothing matches that."
              description="Try a broader word, or clear the category filter."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((entry) => (
                <ResourceCard
                  key={entry.href}
                  entry={entry}
                  saved={isSaved(entry.href)}
                  onToggle={() =>
                    toggleSaved({
                      href: entry.href,
                      title: entry.field.title,
                      category: entry.category.label,
                    })
                  }
                />
              ))}
            </ul>
          )}
        </div>
      </Panel>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`course-code text-[0.62rem] uppercase tracking-wide px-2.5 py-1.5 rounded-md border transition-colors ${
        active
          ? "bg-pen-solid text-white border-transparent"
          : "border-rule text-ink-soft hover:text-ink hover:border-pen"
      }`}
    >
      {children}
    </button>
  );
}

function ResourceCard({
  entry,
  saved,
  onToggle,
}: {
  entry: Entry;
  saved: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="border border-rule rounded-lg p-4 bg-paper-dim flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Chip tone="pen">{entry.field.code}</Chip>
        <button
          type="button"
          onClick={onToggle}
          aria-label={saved ? `Remove ${entry.field.title} from bookmarks` : `Bookmark ${entry.field.title}`}
          aria-pressed={saved}
          className={`p-1 rounded transition-colors ${
            saved ? "text-marker-dim" : "text-ink-soft hover:text-marker-dim"
          }`}
        >
          {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
      </div>
      <Link
        to={entry.href}
        className="text-ink font-semibold text-sm hover:text-pen transition-colors"
      >
        {entry.field.title}
      </Link>
      <p className="text-ink-soft text-xs leading-relaxed mt-1.5 flex-1">{entry.field.blurb}</p>
      <p className="course-code text-[0.6rem] uppercase text-ink-soft mt-3">
        {entry.category.label}
      </p>
    </li>
  );
}
