import { Link } from "react-router";
import type { Route } from "./+types/field";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getField } from "../data/categories";
import { GuideDeepDive, SaveGuideButton } from "../components/GuideDeepDive";
import { CreditByExamGuide, creditByExamAuthor, creditByExamSources } from "../content/credit-by-exam";
import { TimeManagementGuide, timeManagementAuthor, timeManagementSources } from "../content/time-management";

type SourceLink = { label: string; href?: string; note?: string };

const guides: Record<
  string,
  { Body: React.ComponentType; sources: SourceLink[]; author?: string }
> = {
  "academics/credit-by-exam": {
    Body: CreditByExamGuide,
    sources: creditByExamSources,
    author: creditByExamAuthor,
  },
  "lifestyle/time-management": {
    Body: TimeManagementGuide,
    sources: timeManagementSources,
    author: timeManagementAuthor,
  },
};

export function loader({ params }: Route.LoaderArgs) {
  const result = getField(params.category, params.field);
  if (!result) {
    throw new Response("Not Found", { status: 404 });
  }
  return result;
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Illuminate" }];
  return [
    { title: `${loaderData.field.title} — Illuminate` },
    { name: "description", content: loaderData.field.blurb },
  ];
}

export default function FieldPage({ loaderData }: Route.ComponentProps) {
  const { category, field } = loaderData;
  const guide = guides[`${category.slug}/${field.slug}`];

  const breadcrumb = (
    <p className="reveal font-mono text-xs uppercase tracking-[0.15em] text-pen mb-6">
      <Link to="/" className="hover:text-ink transition-colors">
        Illuminate
      </Link>
      <span className="text-rule mx-2">/</span>
      <Link to={`/${category.slug}`} className="hover:text-ink transition-colors">
        {category.label}
      </Link>
    </p>
  );

  if (guide) {
    const { Body, sources, author } = guide;
    return (
      <div key={`${category.slug}/${field.slug}`} className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <section className="bg-paper py-20 sm:py-28">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
              {breadcrumb}

              <span className="reveal reveal-1 course-code text-sm text-pen border border-pen/30 rounded-md px-2 py-0.5 inline-block">
                {field.code}
              </span>

              <h1 className="reveal reveal-1 font-display font-extrabold text-4xl sm:text-5xl text-ink tracking-tight mt-5 mb-4">
                {field.title}
              </h1>

              <p className="reveal reveal-2 text-ink-soft text-lg leading-relaxed max-w-xl mb-4">
                {field.blurb}
              </p>

              {author && (
                <p className="reveal reveal-2 course-code text-xs text-ink-soft uppercase mb-6">
                  Written by a student — {author}
                </p>
              )}

              <div className="reveal reveal-2 mb-14">
                <SaveGuideButton category={category} field={field} />
              </div>

              <div className="grid lg:grid-cols-[1fr_320px] gap-16">
                <div className="reveal reveal-3 max-w-[720px]">
                  <Body />

                  <div className="mt-16 pt-16 border-t border-rule">
                    <GuideDeepDive category={category} field={field} />
                  </div>

                  <Link
                    to={`/${category.slug}`}
                    className="inline-flex items-center gap-2 mt-14 font-semibold text-ink border-b-2 border-pen hover:text-pen transition-colors"
                  >
                    <span aria-hidden="true">←</span> Back to {category.label}
                  </Link>
                </div>

                <aside className="reveal reveal-3 lg:sticky lg:top-28 self-start">
                  <div className="border border-rule rounded-lg p-6 bg-paper-dim">
                    <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-4">
                      Sources &amp; links
                    </p>
                    <ul className="space-y-5">
                      {sources.map((s) => (
                        <li key={s.href ?? s.label}>
                          {s.href ? (
                            <a
                              href={s.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-ink font-semibold text-sm hover:text-pen transition-colors underline decoration-rule hover:decoration-marker decoration-2 underline-offset-4"
                            >
                              {s.label} <span aria-hidden="true">↗</span>
                            </a>
                          ) : (
                            <span className="text-ink font-semibold text-sm">{s.label}</span>
                          )}
                          {s.note && (
                            <p className="text-ink-soft text-xs leading-relaxed mt-1.5">
                              {s.note}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </aside>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div key={`${category.slug}/${field.slug}`} className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="bg-paper py-20 sm:py-28">
          <div className="max-w-[820px] mx-auto px-4 sm:px-6 lg:px-8">
            {breadcrumb}

            <span className="reveal reveal-1 course-code text-sm text-pen border border-pen/30 rounded-md px-2 py-0.5 inline-block">
              {field.code}
            </span>

            <h1 className="reveal reveal-1 font-display font-extrabold text-4xl sm:text-5xl text-ink tracking-tight mt-5 mb-6">
              {field.title}
            </h1>

            <p className="reveal reveal-2 text-ink-soft text-lg leading-relaxed max-w-xl mb-6">{field.blurb}</p>

            <div className="reveal reveal-2 mb-14">
              <SaveGuideButton category={category} field={field} />
            </div>

            <div className="reveal reveal-3">
              <GuideDeepDive category={category} field={field} />
            </div>

            <div className="reveal reveal-3 mt-14 border border-rule rounded-lg p-8 bg-paper-dim">
              <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-3">
                Full write-up coming soon
              </p>
              <p className="text-ink text-base leading-relaxed">
                The long-form student write-up for this topic isn't published yet — we're
                working through the catalog in order. The strategy above applies now.
              </p>
            </div>

            <Link
              to={`/${category.slug}`}
              className="inline-flex items-center gap-2 mt-12 font-semibold text-ink border-b-2 border-pen hover:text-pen transition-colors"
            >
              <span aria-hidden="true">←</span> Back to {category.label}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-32">
        <div className="text-center px-4">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen mb-4">404</p>
          <h1 className="font-display font-extrabold text-4xl text-ink mb-4">
            We haven't written this page yet.
          </h1>
          <p className="text-ink-soft mb-8">That guide doesn't exist.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-semibold text-ink border-b-2 border-pen hover:text-pen transition-colors"
          >
            <span aria-hidden="true">←</span> Back to home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
