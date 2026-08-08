import type { Category, Field } from "../data/categories";
import { ProtectedFeature, useAuth } from "../auth";
import { Bookmark, BookmarkCheck, Copy, Check, Mail, ListChecks, Users } from "lucide-react";
import { useState } from "react";

/*
  The public half of every guide page — executive summary, impact level, and
  difficulty — sits above the fold and stays open to everyone. The action
  plan, outreach template, and mentor strategy below it are wrapped in
  <ProtectedFeature>, so logged-out visitors see a blurred preview under the
  unlock card.
*/

type Meta = { impact: string; impactNote: string; difficulty: string; timeline: string };

/** Tier is encoded in the field code — "EC 101" is tier 1, "EC 203" is tier 2. */
function tierOf(field: Field): 1 | 2 | 3 {
  const n = Number(field.code.split(" ")[1] ?? 100);
  const tier = Math.floor(n / 100);
  return tier === 2 ? 2 : tier === 3 ? 3 : 1;
}

const TIER_META: Record<1 | 2 | 3, Meta> = {
  1: {
    impact: "High",
    impactNote: "Carries real weight on an application when you go deep rather than wide.",
    difficulty: "Demanding",
    timeline: "3–12 months to show something finished",
  },
  2: {
    impact: "Moderate",
    impactNote: "Strong supporting evidence, especially when it connects to your main story.",
    difficulty: "Moderate",
    timeline: "4–10 weeks to get traction",
  },
  3: {
    impact: "Supporting",
    impactNote: "Rounds out a list and fills real gaps, but rarely carries an application alone.",
    difficulty: "Approachable",
    timeline: "Days to a few weeks",
  },
};

export function GuideDeepDive({ category, field }: { category: Category; field: Field }) {
  const meta = TIER_META[tierOf(field)];

  return (
    <div className="space-y-10">
      {/* ── public: executive summary + signals ── */}
      <div className="border border-rule rounded-lg p-7 bg-paper-dim">
        <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-4">
          Executive summary
        </p>
        <p className="text-ink text-base sm:text-lg leading-relaxed mb-7">{field.blurb}</p>

        <dl className="grid sm:grid-cols-3 gap-6 pt-6 border-t border-rule">
          <div>
            <dt className="course-code text-[0.65rem] uppercase text-ink-soft mb-1.5">
              Impact level
            </dt>
            <dd className="font-display font-bold text-2xl text-ink">{meta.impact}</dd>
          </div>
          <div>
            <dt className="course-code text-[0.65rem] uppercase text-ink-soft mb-1.5">
              Difficulty
            </dt>
            <dd className="font-display font-bold text-2xl text-ink">{meta.difficulty}</dd>
          </div>
          <div>
            <dt className="course-code text-[0.65rem] uppercase text-ink-soft mb-1.5">
              Realistic timeline
            </dt>
            <dd className="text-ink text-sm leading-snug pt-1.5">{meta.timeline}</dd>
          </div>
        </dl>
        <p className="text-ink-soft text-sm leading-relaxed mt-6">{meta.impactNote}</p>
      </div>

      {/* ── gated: the actual strategy ── */}
      <ProtectedFeature
        title="Unlock full strategy guide & templates"
        description="Step-by-step action plan, a template outreach email you can send today, and how to find a mentor who'll actually reply. Create your free Illuminate account in 30 seconds."
        previewHeight="34rem"
      >
        <div className="space-y-12">
          <ActionPlan category={category} field={field} />
          <OutreachTemplate category={category} field={field} />
          <MentorStrategy field={field} />
        </div>
      </ProtectedFeature>
    </div>
  );
}

/* ───────────────────────── gated sections ───────────────────────── */

function SectionHeading({
  icon: Icon,
  eyebrow,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-6">
      <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-pen mb-3">
        <Icon className="w-4 h-4" /> {eyebrow}
      </p>
      <h3 className="font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight">
        {title}
      </h3>
    </div>
  );
}

function ActionPlan({ category, field }: { category: Category; field: Field }) {
  const steps = [
    {
      title: "Write down what you actually want out of it",
      body: `Before touching a single application, finish this sentence: "In six months, I want to have ___ because of ${field.title.toLowerCase()}." A finished paper, a working prototype, a paying client, a leadership role. Vague goals produce vague results — and vague results are the ones that read as filler.`,
    },
    {
      title: "Build a target list of ten, not one",
      body: `Spend an evening listing ten specific programs, people, or organizations in ${category.label.toLowerCase()}. Local ones count double: proximity is the single biggest predictor of getting a yes as a high schooler. Rank them by how likely a reply is, not by prestige.`,
    },
    {
      title: "Make first contact within the week",
      body: "Use the template below. Send to your bottom three targets first so your first attempts are the low-stakes ones, then work upward as your email gets sharper. Expect a 10–20% reply rate; that's normal, not rejection.",
    },
    {
      title: "Follow up once, exactly once",
      body: "Seven to ten days of silence earns one short follow-up in the same thread. Two sentences. After that, move on — a second follow-up costs you the relationship you're trying to build.",
    },
    {
      title: "Do the unglamorous version first",
      body: `Almost nobody hands a 16-year-old the interesting work up front. Take the data entry, the setup, the note-taking. Do it visibly well for a month, and the scope you're given grows on its own.`,
    },
    {
      title: "Produce one public artifact",
      body: `End with something a stranger can look at: a write-up, a repository, a presentation, a portfolio page. The artifact is what you'll actually reference in an essay or interview — "I did ${field.title.toLowerCase()}" is a claim, an artifact is evidence.`,
    },
  ];

  return (
    <section>
      <SectionHeading icon={ListChecks} eyebrow="Action plan" title="Six steps, in order." />
      <ol className="space-y-6">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-5">
            <span className="course-code text-sm text-pen border border-pen/30 rounded-md px-2 py-0.5 h-fit shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h4 className="font-display font-bold text-lg text-ink mb-1.5">{step.title}</h4>
              <p className="text-ink-soft text-base leading-relaxed">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function OutreachTemplate({ category, field }: { category: Category; field: Field }) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const signature = user?.name ?? "[Your name]";
  const grade = user?.gradeLevel ?? "[grade]";

  const template = `Subject: High school student interested in your work on [specific topic]

Dear [Dr./Ms./Mr.] [Last name],

I'm ${signature}, a student in ${grade} at [school]. I read [specific paper, article, or project — name it exactly] and got stuck on [one concrete question it raised for you]. That's what made me want to write to you.

I'm looking for a way into ${field.title.toLowerCase()} this [semester/summer], and I'd rather be useful than just observe. I can commit [X hours/week], I already know [tool, method, or skill you actually have], and I'm happy to start on whatever the tedious part is — data cleaning, transcription, setup.

If there's no room right now, I'd still value fifteen minutes of your time to hear how you'd approach this at my stage.

Thank you for reading,
${signature}
[phone] · [email] · [link to anything you've made]`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the text is on screen anyway */
    }
  }

  return (
    <section>
      <SectionHeading
        icon={Mail}
        eyebrow="Template"
        title="The outreach email, pre-filled."
      />
      <p className="text-ink-soft text-base leading-relaxed mb-6">
        Replace every bracket. The two that decide whether you get a reply are the specific
        thing you read and the specific question it raised — those are the only parts that
        prove you didn't send this to forty people.
      </p>

      <div className="border border-rule rounded-lg overflow-hidden bg-paper-dim">
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-rule">
          <span className="course-code text-[0.65rem] uppercase text-ink-soft">
            {category.label} · cold outreach
          </span>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-pen hover:text-pen-dim transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="px-5 py-5 text-ink text-sm leading-relaxed whitespace-pre-wrap font-sans overflow-x-auto">
          {template}
        </pre>
      </div>
    </section>
  );
}

function MentorStrategy({ field }: { field: Field }) {
  const tactics = [
    {
      title: "Start two rings out from the famous person",
      body: "Graduate students, lab managers, junior staff, and recent alumni reply far more often than department heads — and they're the ones who'd supervise you day to day anyway. Work inward only after someone inside vouches for you.",
    },
    {
      title: "Use the connections you forgot you had",
      body: "Your school's alumni page, a teacher's former colleague, a parent's coworker, the club advisor who used to work in the field. A one-line warm introduction outperforms twenty cold emails.",
    },
    {
      title: "Ask for a decision, not a favor",
      body: "\"Would you be open to a 15-minute call?\" is answerable. \"I'd love to learn from you\" isn't. Every message should end with a question someone can say yes or no to in one sentence.",
    },
    {
      title: "Make the relationship worth keeping",
      body: `Send a short update every four to six weeks — what you tried, what broke, what you learned. Mentors invest in students who visibly move. This is also what turns a contact into someone who'll write you a recommendation about ${field.title.toLowerCase()} two years from now.`,
    },
  ];

  return (
    <section>
      <SectionHeading
        icon={Users}
        eyebrow="Mentor strategy"
        title="Finding someone who'll actually reply."
      />
      <div className="grid sm:grid-cols-2 gap-5">
        {tactics.map((t) => (
          <div key={t.title} className="border border-rule rounded-lg p-6 bg-paper">
            <h4 className="font-display font-bold text-lg text-ink mb-2">{t.title}</h4>
            <p className="text-ink-soft text-sm leading-relaxed">{t.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── save button ───────────────────────── */

/** Bookmarks a guide to the signed-in account; prompts signup otherwise. */
export function SaveGuideButton({ category, field }: { category: Category; field: Field }) {
  const { isAuthenticated, isSaved, toggleSaved } = useAuth();
  const href = `/${category.slug}/${field.slug}`;
  const saved = isAuthenticated && isSaved(href);

  return (
    <button
      type="button"
      onClick={() => toggleSaved({ href, title: field.title, category: category.label })}
      aria-pressed={saved}
      className={`inline-flex items-center gap-2 px-4 py-2 border rounded-md font-mono text-xs font-semibold uppercase tracking-wide transition-colors ${
        saved
          ? "border-pen text-pen bg-pen/10"
          : "border-rule text-ink-soft hover:text-ink hover:border-pen"
      }`}
    >
      {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
      {saved ? "Saved" : "Save guide"}
    </button>
  );
}
