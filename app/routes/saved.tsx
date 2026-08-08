import { Link } from "react-router";
import type { Route } from "./+types/saved";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { RequireAuth, useAuth } from "../auth";
import { BookmarkX, Compass } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Saved resources — Illuminate" }, { name: "robots", content: "noindex" }];
}

export default function Saved() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <RequireAuth>
          <SavedList />
        </RequireAuth>
      </main>
      <Footer />
    </div>
  );
}

function SavedList() {
  const { savedResources, toggleSaved } = useAuth();

  return (
    <section className="bg-paper py-20 sm:py-28">
      <div className="max-w-[820px] mx-auto px-4 sm:px-6 lg:px-8">
        <p className="reveal font-mono text-xs uppercase tracking-[0.15em] text-pen mb-6">
          Saved resources
        </p>
        <h1 className="reveal reveal-1 font-display font-extrabold text-4xl sm:text-5xl text-ink tracking-tight mb-4">
          Everything you bookmarked.
        </h1>
        <p className="reveal reveal-2 text-ink-soft text-lg leading-relaxed mb-14">
          {savedResources.length > 0
            ? `${savedResources.length} ${savedResources.length === 1 ? "guide" : "guides"}, waiting for when you have time.`
            : "Nothing here yet."}
        </p>

        {savedResources.length === 0 ? (
          <div className="reveal reveal-3 border border-rule rounded-lg p-10 bg-paper-dim text-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pen/10 text-pen mb-5">
              <Compass className="w-5 h-5" />
            </span>
            <p className="text-ink font-semibold mb-2">Start with the catalog.</p>
            <p className="text-ink-soft text-sm leading-relaxed mb-7 max-w-sm mx-auto">
              Hit "Save guide" on any page and it shows up here, on every device you log
              into.
            </p>
            <Link
              to="/resources"
              className="inline-flex items-center gap-2 px-5 py-3 bg-pen-solid hover:bg-pen-solid-dim text-white font-semibold text-sm rounded-lg transition-colors"
            >
              Browse every guide <span aria-hidden="true">→</span>
            </Link>
          </div>
        ) : (
          <ul className="reveal reveal-3 space-y-3">
            {savedResources.map((r) => (
              <li
                key={r.href}
                className="border border-rule rounded-lg p-5 bg-paper flex items-center gap-4 hover:border-pen transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="course-code text-[0.65rem] uppercase text-pen mb-1">
                    {r.category}
                  </p>
                  <Link
                    to={r.href}
                    className="font-display font-bold text-xl text-ink hover:text-pen transition-colors block truncate"
                  >
                    {r.title}
                  </Link>
                  <p className="text-ink-soft text-xs mt-1">
                    Saved {new Date(r.savedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSaved(r)}
                  aria-label={`Remove ${r.title} from saved`}
                  className="p-2 text-ink-soft hover:text-ink transition-colors shrink-0"
                >
                  <BookmarkX className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
