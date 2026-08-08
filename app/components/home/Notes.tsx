const notes = [
  {
    quote:
      "Illuminate showed me how to connect my extracurriculars to my essays. I got into my dream school.",
    name: "Priya S.",
    detail: "UT Austin · Class of 2024",
    rotate: "-rotate-1",
  },
  {
    quote:
      "The GPA calculator alone saved my semester. I wish I'd found this as a freshman.",
    name: "Marcus T.",
    detail: "LVHS · Junior",
    rotate: "rotate-1",
  },
  {
    quote:
      "I'm first-gen — nobody in my family had done this before. Illuminate was basically my counselor.",
    name: "Sofia R.",
    detail: "Texas A&M · Class of 2025",
    rotate: "-rotate-1",
  },
];

export default function Notes() {
  return (
    <section className="bg-paper py-24 sm:py-32">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen mb-3">
          Notes from students
        </p>
        <h2 className="font-display font-extrabold text-4xl text-ink tracking-tight mb-16">
          Real students. Real results.
        </h2>

        <div className="grid md:grid-cols-3 gap-10 sm:gap-12">
          {notes.map((n) => (
            <figure
              key={n.name}
              className={`card-elevate relative bg-paper-dim border border-rule rounded-lg p-7 ${n.rotate} hover:rotate-0`}
            >
              <span
                aria-hidden="true"
                className="absolute -top-2 left-7 w-8 h-2.5 bg-pen/80"
              />
              <blockquote className="text-ink text-base sm:text-lg leading-relaxed">
                “{n.quote}”
              </blockquote>
              <figcaption className="mt-6 pt-4 border-t border-rule font-mono text-xs uppercase tracking-wide text-ink-soft">
                {n.name} <span className="text-rule mx-1">/</span> {n.detail}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
