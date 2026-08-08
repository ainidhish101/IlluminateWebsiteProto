import { Link } from "react-router";
import type { Route } from "./+types/resources";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { categories, categoryFieldCount } from "../data/categories";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resources — Illuminate" },
    { name: "description", content: "Every Illuminate guide, in one place, sorted by topic." },
  ];
}

export default function Resources() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="bg-chalkboard">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 sm:pt-32 sm:pb-24">
            <p className="reveal font-mono text-xs sm:text-sm uppercase tracking-[0.15em] text-marker mb-8">
              Resources
            </p>
            <h1 className="reveal reveal-1 font-display font-black text-[2.75rem] leading-[0.98] sm:text-[4rem] text-chalk tracking-tight max-w-2xl">
              Every guide, one page.
            </h1>
            <p className="reveal reveal-2 text-chalk-soft text-lg sm:text-xl leading-relaxed mt-10 max-w-xl">
              No search bar to fight with — here's everything we've got,
              sorted by topic and by what to look at first.
            </p>
          </div>
        </section>

        <section className="bg-paper py-20 sm:py-28">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
            {categories.map((category) => (
              <div key={category.slug}>
                <div className="flex items-baseline justify-between gap-4 mb-8 border-b border-rule pb-4">
                  <Link
                    to={`/${category.slug}`}
                    className="group flex items-baseline gap-3"
                  >
                    <span className="course-code text-sm text-pen border border-pen/30 rounded-md px-2 py-0.5">
                      {category.code}
                    </span>
                    <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink group-hover:text-pen transition-colors">
                      {category.label}
                    </h2>
                  </Link>
                  <span className="course-code text-[0.65rem] text-ink-soft uppercase shrink-0">
                    {categoryFieldCount(category)} guides
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
                  {category.tiers.flatMap((tier) => tier.fields).map((field) => (
                    <Link
                      key={field.slug}
                      to={`/${category.slug}/${field.slug}`}
                      className="flex items-baseline gap-3 py-1.5 group"
                    >
                      <span className="course-code text-xs text-ink-soft shrink-0">
                        {field.code}
                      </span>
                      <span className="text-ink-soft group-hover:text-ink text-sm sm:text-base underline decoration-transparent group-hover:decoration-marker decoration-2 underline-offset-4 transition-colors">
                        {field.title}
                      </span>
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
