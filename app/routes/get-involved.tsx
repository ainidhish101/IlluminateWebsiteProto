import { useEffect, useRef, useState } from "react";
import type { Route } from "./+types/get-involved";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { ChalkUnderline } from "../components/ChalkUnderline";
import { TeamStructure } from "../components/TeamStructure";
import { Icon, type IconName } from "../components/Icon";
import type { TeamRole } from "../data/team";
import {
  Field,
  SelectInput,
  SubmitButton,
  TextArea,
  TextInput,
  useAuth,
} from "../auth";
import { CheckCircle2, Lock, Sparkles, UserCheck } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Get involved — Illuminate" },
    {
      name: "description",
      content: "Write a guide, tutor a student, or bring Illuminate to your school.",
    },
  ];
}

const ways: { code: string; title: string; desc: string; icon: IconName }[] = [
  {
    code: "01",
    title: "Write a guide",
    desc: "Turn what you already figured out — an essay, a test, a schedule — into a guide someone else can use.",
    icon: "pen-nib",
  },
  {
    code: "02",
    title: "Edit and fact-check",
    desc: "Read drafts, catch mistakes, and keep the advice accurate as deadlines and rules change.",
    icon: "search-check",
  },
  {
    code: "03",
    title: "Tutor or mentor",
    desc: "Answer questions from students a grade or two behind you, one-on-one or in a group.",
    icon: "users",
  },
  {
    code: "04",
    title: "Spread the word",
    desc: "Tell a teacher, a counselor, or a group chat. Most students find us because someone told them.",
    icon: "megaphone",
  },
];

export default function GetInvolved() {
  const [selectedRole, setSelectedRole] = useState<TeamRole | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  function handleApply(role: TeamRole) {
    setSelectedRole(role);
    // Let the form mount before scrolling to it.
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="bg-chalkboard">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28 sm:pt-32 sm:pb-36">
            <p className="reveal font-mono text-xs sm:text-sm uppercase tracking-[0.15em] text-marker mb-8">
              Get involved
            </p>
            <h1 className="reveal reveal-1 font-display font-black text-[2.75rem] leading-[0.98] sm:text-[4rem] text-chalk tracking-tight max-w-3xl">
              Someone wrote the guide that helped you.{" "}
              <span className="relative inline-block">
                Write the next one.
                <ChalkUnderline />
              </span>
            </h1>
            <p className="reveal reveal-2 text-chalk-soft text-lg sm:text-xl leading-relaxed mt-10 max-w-xl">
              Illuminate runs on students who are willing to write down what
              they know. No experience required — just something worth
              sharing.
            </p>
          </div>
        </section>

        <section className="bg-paper py-24 sm:py-32">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen mb-4">
              Ways to help
            </p>
            <h2 className="font-display font-extrabold text-4xl text-ink tracking-tight mb-16 max-w-xl">
              Pick what fits your time.
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {ways.map((w) => (
                <div
                  key={w.code}
                  className="card-elevate bg-paper hover:bg-paper-dim border border-rule rounded-lg p-7 flex flex-col"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <span className="flex items-center justify-center w-9 h-9 rounded-full bg-pen/10 text-pen shrink-0">
                      <Icon name={w.icon} className="w-4 h-4" />
                    </span>
                    <span className="course-code text-sm text-pen border border-pen/30 rounded-md px-2 py-0.5 w-fit">
                      {w.code}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-2xl text-ink mb-2">{w.title}</h3>
                  <p className="text-ink-soft text-sm sm:text-base leading-relaxed">{w.desc}</p>
                </div>
              ))}
            </div>
            <a
              href="mailto:hello@illuminate.org?subject=I%20want%20to%20help"
              className="inline-flex items-center gap-2 mt-12 px-6 py-3.5 bg-pen-solid hover:bg-pen-solid-dim text-white font-semibold rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              Tell us you're in <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        <section id="apply" className="bg-paper py-24 sm:py-32 border-t border-rule scroll-mt-20">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen mb-4">
              Apply for a position
            </p>
            <h2 className="font-display font-extrabold text-4xl text-ink tracking-tight mb-4 max-w-xl">
              Four tiers, one starting point.
            </h2>
            <p className="text-ink-soft text-lg max-w-xl mb-16">
              Pick the tier that fits where you're at. Every director started as a member.
            </p>

            <TeamStructure
              variant="apply"
              onApply={handleApply}
              activeSlug={selectedRole?.slug ?? null}
            />

            <div ref={formRef} className="mt-16 scroll-mt-24">
              <ApplicationForm
                role={selectedRole}
                onClear={() => setSelectedRole(null)}
              />
            </div>
          </div>
        </section>

        <section id="partner" className="bg-paper-dim py-24 sm:py-32 border-t border-rule scroll-mt-20">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl">
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen mb-4">
                Partner with us
              </p>
              <h2 className="font-display font-extrabold text-4xl text-ink tracking-tight mb-6">
                Bring Illuminate to your school.
              </h2>
              <p className="text-ink-soft text-lg leading-relaxed mb-10">
                We work with schools, counseling offices, and other nonprofits
                to get these guides in front of more students — as a linked
                resource, a workshop, or something else that fits what you
                already do. Reach out and tell us what you have in mind.
              </p>
              <a
                href="mailto:hello@illuminate.org?subject=Partnership%20inquiry"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-pen-solid hover:bg-pen-solid-dim text-white font-semibold rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                Start a conversation
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

/* ─────────────────── gated application form ─────────────────── */

const GRADE_LEVELS = ["9th grade", "10th grade", "11th grade", "12th grade"];

/**
 * Role descriptions above are public; submitting an application is not.
 * Signed-in applicants get name, email, and grade pre-filled from their
 * account so they only write the parts we can't already know.
 */
function ApplicationForm({
  role,
  onClear,
}: {
  role: TeamRole | null;
  onClear: () => void;
}) {
  const { user, isAuthenticated, isReady, openAuth } = useAuth();
  const [gradeLevel, setGradeLevel] = useState(GRADE_LEVELS[2]);
  const [interests, setInterests] = useState("");
  const [why, setWhy] = useState("");
  const [hours, setHours] = useState("2–4 hours");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Pull the account's saved details in as defaults once the session loads.
  useEffect(() => {
    if (!user) return;
    setGradeLevel(user.gradeLevel ?? GRADE_LEVELS[2]);
    setInterests(user.interests ?? "");
  }, [user]);

  if (!role) {
    return (
      <div className="border border-dashed border-rule rounded-lg p-8 bg-paper-dim text-center">
        <p className="text-ink-soft text-sm leading-relaxed">
          Pick a tier above to start an application.
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="border border-pen/30 bg-pen/[0.06] rounded-lg p-8 sm:p-10 max-w-2xl">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-pen/10 text-pen mb-5">
          <Lock className="w-5 h-5" />
        </span>
        <p className="course-code text-[0.65rem] uppercase tracking-[0.15em] text-pen mb-2.5">
          Free account required
        </p>
        <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-ink tracking-tight mb-3">
          Apply as {article(role.singular)} {role.singular}
        </h3>
        <p className="text-ink-soft leading-relaxed mb-7 max-w-md">
          Applications go through an Illuminate account so we can reach you, pre-fill your
          details, and let you check where your application stands. Takes 30 seconds and
          it's free.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => openAuth("signup")}
            disabled={!isReady}
            className="inline-flex items-center gap-2 px-5 py-3 bg-pen-solid hover:bg-pen-solid-dim disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4" /> Create a free account to apply
          </button>
          <button
            type="button"
            onClick={() => openAuth("login")}
            className="px-5 py-3 border border-rule hover:border-pen text-ink font-semibold text-sm rounded-lg transition-colors"
          >
            Log in
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="border border-rule rounded-lg p-8 sm:p-10 bg-paper-dim max-w-2xl">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-pen/10 text-pen mb-5">
          <CheckCircle2 className="w-5 h-5" />
        </span>
        <h3 className="font-display font-extrabold text-2xl text-ink tracking-tight mb-3">
          Application received.
        </h3>
        <p className="text-ink-soft leading-relaxed mb-7">
          Thanks, {user!.name.split(" ")[0]} — your {role.singular.toLowerCase()} application
          is in. We read every one and reply to {user!.email} within about a week.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setWhy("");
            onClear();
          }}
          className="text-sm font-semibold text-pen hover:text-pen-dim transition-colors"
        >
          Apply for another tier
        </button>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (why.trim().length < 40) {
      return setError("Give us at least a couple of sentences — 40 characters minimum.");
    }
    setBusy(true);
    // Swap this for your real submission endpoint (Formspree, Supabase insert,
    // an API route) — the payload below is already the shape you'd send.
    await new Promise((r) => setTimeout(r, 600));
    setBusy(false);
    setSubmitted(true);
  }

  return (
    <form onSubmit={onSubmit} className="border border-rule rounded-lg p-8 sm:p-10 bg-paper max-w-2xl" noValidate>
      <p className="course-code text-[0.65rem] uppercase tracking-[0.15em] text-pen mb-2.5">
        Application · {role.title}
      </p>
      <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-ink tracking-tight mb-3">
        Apply as {article(role.singular)} {role.singular}
      </h3>
      <p className="text-ink-soft leading-relaxed mb-8">{role.desc}</p>

      <div className="flex items-center gap-2.5 mb-8 px-4 py-3 bg-paper-dim border border-rule rounded-lg">
        <UserCheck className="w-4 h-4 text-pen shrink-0" />
        <p className="text-ink-soft text-sm">
          Applying as <span className="text-ink font-semibold">{user!.name}</span> ·{" "}
          {user!.email}
        </p>
      </div>

      <div className="space-y-5">
        <Field label="Grade level" htmlFor="apply-grade">
          <SelectInput
            id="apply-grade"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
          >
            {GRADE_LEVELS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Topics you'd want to work on" htmlFor="apply-interests">
          <TextInput
            id="apply-interests"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="Testing prep, essay editing, research outreach"
          />
        </Field>

        <Field label="Time you can commit each week" htmlFor="apply-hours">
          <SelectInput id="apply-hours" value={hours} onChange={(e) => setHours(e.target.value)}>
            {["1–2 hours", "2–4 hours", "4–6 hours", "6+ hours"].map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field
          label={`Why this role?`}
          htmlFor="apply-why"
          hint="What you'd bring, and something you've already figured out that's worth writing down."
        >
          <TextArea
            id="apply-why"
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            rows={5}
            placeholder="I taught myself how to study for AP Chem after failing the first unit test, and I want to write the guide I needed then…"
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm text-ink bg-marker/15 border border-marker/40 rounded-md px-3 py-2.5">
            {error}
          </p>
        )}

        <div className="flex items-center gap-4 pt-1">
          <div className="w-56">
            <SubmitButton busy={busy}>Submit application</SubmitButton>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-sm text-ink-soft hover:text-ink transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");
