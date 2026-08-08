import { Link } from "react-router";
import type { Route } from "./+types/about";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { ChalkUnderline } from "../components/ChalkUnderline";
import { TeamStructure } from "../components/TeamStructure";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "About — Illuminate" },
    {
      name: "description",
      content: "Why a group of students started Illuminate, and who keeps it running.",
    },
  ];
}

export default function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="bg-chalkboard">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28 sm:pt-32 sm:pb-36">
            <p className="reveal font-mono text-xs sm:text-sm uppercase tracking-[0.15em] text-marker mb-8">
              About us
            </p>
            <h1 className="reveal reveal-1 font-display font-black text-[2.75rem] leading-[0.98] sm:text-[4rem] text-chalk tracking-tight max-w-3xl">
              We built the{" "}
              <span className="relative inline-block">
                guide
                <ChalkUnderline />
              </span>{" "}
              we wished we had.
            </h1>
            <p className="reveal reveal-2 text-chalk-soft text-lg sm:text-xl leading-relaxed mt-10 max-w-xl">
              A few of us went through the college process with no counselor,
              no plan, and way too many browser tabs. Illuminate is everything
              we figured out, written down for the next kid doing this alone.
            </p>
          </div>
        </section>

        <section className="bg-paper py-24 sm:py-32">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 lg:gap-24">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen mb-4">
                How it started
              </p>
              <h2 className="font-display font-extrabold text-4xl text-ink tracking-tight mb-8">
                A notebook, not a brand.
              </h2>
            </div>
            <div className="space-y-6 text-ink-soft text-lg leading-relaxed">
              <p>
                None of us had a private counselor. What we had was a lot of
                trial and error, some good advice from an older student, and a
                shared Google Doc that kept getting longer.
              </p>
              <p>
                Eventually the doc turned into a website, because the next
                grade behind us was asking the same questions we'd already
                answered ourselves. That's still what Illuminate is — the
                shared doc, just easier to find.
              </p>
              <p>
                We're not a company and we're not trying to become one. It's
                free because it was free when someone helped us, and that
                felt like the only fair way to pass it on.
              </p>
            </div>
          </div>
        </section>

        <section id="team" className="bg-paper-dim py-24 sm:py-32 border-y border-rule scroll-mt-20">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen mb-4">
              Our structure
            </p>
            <h2 className="font-display font-extrabold text-4xl text-ink tracking-tight mb-4 max-w-xl">
              How Illuminate is organized
            </h2>
            <p className="text-ink-soft text-lg max-w-xl mb-16">
              Four tiers, and a way in at every level — nobody starts as a director.
            </p>

            <TeamStructure variant="info" />

            <p className="text-ink-soft mt-12 max-w-xl">
              Want in? See{" "}
              <Link
                to="/get-involved"
                className="font-semibold text-ink border-b-2 border-pen hover:text-pen transition-colors"
              >
                how to get involved
              </Link>
              .
            </p>
          </div>
        </section>

        <section id="contact" className="bg-chalkboard py-24 sm:py-32 scroll-mt-20">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl">
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-marker mb-5">
                Contact
              </p>
              <h2 className="font-display font-extrabold text-4xl text-chalk tracking-tight mb-6">
                Questions, corrections, ideas — send them over.
              </h2>
              <p className="text-chalk-soft text-lg leading-relaxed mb-10">
                If a guide got something wrong, or you can't find what you're
                looking for, email us. A real person reads every message.
              </p>
              <a
                href="mailto:hello@illuminate.org"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-marker hover:bg-marker-dim text-ink-solid font-bold rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                hello@illuminate.org
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
