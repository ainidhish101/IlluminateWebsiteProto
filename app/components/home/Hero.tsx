import { Link } from "react-router";
import { ChalkUnderline } from "../ChalkUnderline";

export default function Hero() {
  return (
    <section className="relative bg-chalkboard overflow-hidden">
      <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28 sm:pt-32 sm:pb-40">
        <p className="reveal font-mono text-xs sm:text-sm uppercase tracking-[0.15em] text-marker mb-8">
          ▪ Student-run nonprofit — free, no catch
        </p>

        <h1 className="reveal reveal-1 font-display font-black text-[3rem] leading-[0.95] sm:text-[4.5rem] lg:text-[5.75rem] text-chalk tracking-tight max-w-4xl">
          Build your{" "}
          <span className="relative inline-block">
            narrative.
            <ChalkUnderline />
          </span>
          <br />
          Shape your future.
        </h1>

        <p className="reveal reveal-2 text-chalk-soft text-lg sm:text-xl leading-relaxed mt-10 max-w-xl">
          Illuminate helps K–12 students navigate academics, extracurriculars,
          testing, and college prep — for free. We organize the scattered
          advice so you can focus on building something real.
        </p>

        <div className="reveal reveal-3 flex flex-wrap items-center gap-5 mt-12">
          <Link
            to="/extracurriculars"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-pen-solid hover:bg-pen-solid-dim text-white font-semibold rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            Start exploring <span aria-hidden="true">→</span>
          </Link>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 px-6 py-3.5 text-chalk font-semibold border-b-2 border-chalk-soft/40 hover:border-marker hover:text-marker transition-colors"
          >
            Read our story
          </Link>
        </div>
      </div>

      <div className="relative border-t border-rule-dark">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="font-mono text-xs sm:text-sm text-chalk-soft tracking-wide flex flex-wrap gap-x-3 gap-y-1">
            <span className="text-chalk">80+</span> free guides
            <span className="text-rule-dark">/</span>
            <span className="text-chalk">6</span> focus areas
            <span className="text-rule-dark">/</span>
            <span className="text-chalk">100%</span> free, always
          </p>
        </div>
      </div>
    </section>
  );
}
