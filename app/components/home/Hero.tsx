import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { ChalkUnderline } from "../ChalkUnderline";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1758270705518-b61b40527e76?q=80&w=1800&auto=format&fit=crop";

export default function Hero() {
  const bgRef = useRef<HTMLDivElement>(null);

  // Lightweight scroll parallax: the photo drifts slower than the page, so
  // it reads as a layer behind the type rather than printed on it. Skipped
  // entirely under reduced motion, and only ever touches `transform`.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = bgRef.current;
        if (!el) return;
        const offset = Math.min(window.scrollY, 900) * 0.16;
        el.style.transform = `translate3d(0, ${offset}px, 0) scale(1.15)`;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="relative bg-chalkboard overflow-hidden">
      <div ref={bgRef} className="absolute inset-0 will-change-transform" aria-hidden="true">
        <img
          src={HERO_IMAGE}
          alt=""
          className="w-full h-full object-cover"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-chalkboard via-chalkboard/92 to-chalkboard/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-chalkboard via-chalkboard/10 to-transparent" />
      </div>

      <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28 sm:pt-32 sm:pb-40">
        <p className="reveal font-mono text-xs sm:text-sm uppercase tracking-[0.15em] text-marker mb-8">
          ▪ Student-run nonprofit — free, no catch
        </p>

        <h1 className="reveal reveal-1 font-display font-black text-[3rem] leading-[0.95] sm:text-[4.5rem] lg:text-[5.75rem] text-chalk tracking-[-0.015em] sm:tracking-[-0.02em] lg:tracking-[-0.03em] max-w-4xl">
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
            className="press group inline-flex items-center gap-2 px-6 py-3.5 bg-pen-solid hover:bg-pen-solid-dim text-white font-semibold rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            Start exploring{" "}
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
          <Link
            to="/about"
            className="press inline-flex items-center gap-2 px-6 py-3.5 text-chalk font-semibold border-b-2 border-chalk-soft/40 hover:border-marker hover:text-marker transition-colors"
          >
            Read our story
          </Link>
        </div>
      </div>

      <div className="glass-chalk relative border-t border-white/10">
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
