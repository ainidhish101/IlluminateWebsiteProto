import { Link } from "react-router";
import type { Route } from "./+types/category";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getCategory, categoryFieldCount } from "../data/categories";
import { Icon, categoryIcon } from "../components/Icon";

export function loader({ params }: Route.LoaderArgs) {
  const category = getCategory(params.category);
  if (!category) {
    throw new Response("Not Found", { status: 404 });
  }
  return { category };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Illuminate" }];
  return [
    { title: `${loaderData.category.label} — Illuminate` },
    { name: "description", content: loaderData.category.intro },
  ];
}

export default function CategoryPage({ loaderData }: Route.ComponentProps) {
  const { category } = loaderData;
  const count = categoryFieldCount(category);

  return (
    <div key={category.slug} className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="bg-chalkboard">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-24 sm:pb-20">
            <p className="reveal font-mono text-xs uppercase tracking-[0.15em] text-marker mb-6">
              <Link to="/" className="hover:text-chalk transition-colors">
                Illuminate
              </Link>
              <span className="text-chalk-soft mx-2">/</span>
              {category.label}
            </p>
            <h1 className="reveal reveal-1 font-display font-extrabold text-5xl sm:text-6xl text-chalk tracking-tight max-w-2xl">
              {category.label}
            </h1>
            <p className="reveal reveal-2 text-chalk-soft text-lg leading-relaxed mt-6 max-w-xl">
              {category.intro}
            </p>
            <p className="reveal reveal-3 course-code text-xs text-chalk-soft mt-8">
              {count} guides, sorted by what to do first
            </p>
          </div>
        </section>

        <section className="bg-paper py-20 sm:py-28">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
            {category.tiers.map((tier) => (
              <div key={tier.label}>
                <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen mb-6">
                  {tier.label}
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tier.fields.map((field) => (
                    <Link
                      key={field.slug}
                      to={`/${category.slug}/${field.slug}`}
                      className="card-elevate group bg-paper hover:bg-paper-dim border border-rule rounded-lg p-7 flex flex-col"
                    >
                      <div className="flex items-center gap-3 mb-5">
                        <span className="flex items-center justify-center w-9 h-9 rounded-full bg-pen/10 text-pen shrink-0">
                          <Icon name={categoryIcon(category.slug)} className="w-4 h-4" />
                        </span>
                        <span className="course-code text-sm text-pen border border-pen/30 rounded-md px-2 py-0.5 w-fit">
                          {field.code}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-2xl text-ink group-hover:text-pen underline decoration-transparent group-hover:decoration-marker decoration-4 underline-offset-4 transition-colors mb-2">
                        {field.title}
                      </h3>
                      <p className="text-ink-soft text-sm sm:text-base leading-relaxed">
                        {field.blurb}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
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
          <p className="text-ink-soft mb-8">That topic doesn't exist — check the areas below.</p>
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
