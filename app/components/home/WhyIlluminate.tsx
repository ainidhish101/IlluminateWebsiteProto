import { Link } from "react-router";

const points = [
  {
    tag: "NF",
    title: "Narrative-first",
    desc: "We don't hand you a checklist. We show you how every class, activity, and test connects into one story.",
  },
  {
    tag: "SW",
    title: "Written by students who just did this",
    desc: "Not consultants, not a brochure — people who applied a year or two ago and remember what actually mattered.",
  },
  {
    tag: "FR",
    title: "Free. No asterisk.",
    desc: "No premium tier, no locked chapters, no ‘contact us for pricing.’ Every guide is free, permanently.",
  },
  {
    tag: "BU",
    title: "Built to be used, not admired",
    desc: "Short paragraphs, real timelines, no fluff. If a page can't tell you what to do next, we rewrite it.",
  },
];

export default function WhyIlluminate() {
  return (
    <section className="bg-paper-dim py-24 sm:py-32 border-y border-rule">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          <div className="relative">
            <div className="aspect-[4/3] overflow-hidden rounded-lg shadow-sm">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663701351808/9t6sWoci7JX6fK6AA4wSmM/illuminate-about-kpePWue6SZLGeNfDckHshB.webp"
                alt="Illuminate students working through the college application process"
                className="w-full h-full object-cover grayscale contrast-110 transition-transform duration-500 ease-out hover:scale-105"
              />
            </div>
            <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mt-4">
              No paywalls. No subscriptions. Ever.
            </p>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen mb-4">
              Why Illuminate
            </p>
            <h2 className="font-display font-extrabold text-4xl sm:text-5xl text-ink tracking-tight mb-8">
              The gap isn't information.{" "}
              <span className="marker-stroke">It's access.</span>
            </h2>
            <p className="text-ink-soft text-lg leading-relaxed mb-12 max-w-xl">
              Most students don't struggle because the advice doesn't exist —
              it's scattered across forums, paywalled, or locked behind a
              $200/hr counselor. Illuminate puts it in one place, for free.
            </p>

            <dl className="space-y-8">
              {points.map((p) => (
                <div key={p.tag} className="flex gap-5">
                  <dt className="course-code text-sm text-pen shrink-0 pt-1">
                    {p.tag}
                  </dt>
                  <dd>
                    <p className="font-display font-bold text-lg text-ink">
                      {p.title}
                    </p>
                    <p className="text-ink-soft text-sm sm:text-base leading-relaxed mt-1">
                      {p.desc}
                    </p>
                  </dd>
                </div>
              ))}
            </dl>

            <Link
              to="/about"
              className="inline-flex items-center gap-2 mt-12 font-semibold text-ink border-b-2 border-pen hover:text-pen transition-colors"
            >
              Read our story <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
