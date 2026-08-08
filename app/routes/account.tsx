import { useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/account";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  Avatar,
  Field,
  RequireAuth,
  SelectInput,
  SubmitButton,
  TextInput,
  useAuth,
} from "../auth";
import { BookmarkCheck, CheckCircle2, Calculator, LogOut } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [{ title: "My profile — Illuminate" }, { name: "robots", content: "noindex" }];
}

const GRADE_LEVELS = ["9th grade", "10th grade", "11th grade", "12th grade"];

export default function Account() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <RequireAuth>
          <ProfilePanel />
        </RequireAuth>
      </main>
      <Footer />
    </div>
  );
}

function ProfilePanel() {
  const { user, updateProfile, logout, savedResources } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [gradeLevel, setGradeLevel] = useState(user?.gradeLevel ?? GRADE_LEVELS[2]);
  const [interests, setInterests] = useState(user?.interests ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    await updateProfile({ name: name.trim(), gradeLevel, interests: interests.trim() });
    setBusy(false);
    setSaved(true);
  }

  return (
    <section className="bg-paper py-20 sm:py-28">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <p className="reveal font-mono text-xs uppercase tracking-[0.15em] text-pen mb-6">
          My profile
        </p>

        <div className="reveal reveal-1 flex items-center gap-5 mb-14">
          <Avatar user={user} className="w-16 h-16 text-base" />
          <div className="min-w-0">
            <h1 className="font-display font-extrabold text-4xl text-ink tracking-tight truncate">
              {user.name}
            </h1>
            <p className="text-ink-soft text-sm mt-1 truncate">{user.email}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-12 items-start">
          <form onSubmit={onSubmit} className="reveal reveal-2 max-w-lg space-y-5">
            <h2 className="font-display font-bold text-2xl text-ink tracking-tight">
              Account details
            </h2>

            <Field label="Full name" htmlFor="account-name">
              <TextInput
                id="account-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
                autoComplete="name"
              />
            </Field>

            <Field
              label="Email"
              htmlFor="account-email"
              hint="Contact us if you need to change the email on your account."
            >
              <TextInput id="account-email" value={user.email} disabled readOnly />
            </Field>

            <Field label="Grade level" htmlFor="account-grade">
              <SelectInput
                id="account-grade"
                value={gradeLevel}
                onChange={(e) => {
                  setGradeLevel(e.target.value);
                  setSaved(false);
                }}
              >
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field
              label="Target colleges or major"
              htmlFor="account-interests"
              hint="Used to pre-fill applications and point you at relevant guides."
            >
              <TextInput
                id="account-interests"
                value={interests}
                onChange={(e) => {
                  setInterests(e.target.value);
                  setSaved(false);
                }}
                placeholder="Bioengineering, UT Austin, Rice"
              />
            </Field>

            <div className="flex items-center gap-4">
              <div className="w-48">
                <SubmitButton busy={busy}>Save changes</SubmitButton>
              </div>
              {saved && (
                <p className="flex items-center gap-1.5 text-sm text-pen">
                  <CheckCircle2 className="w-4 h-4" /> Saved
                </p>
              )}
            </div>
          </form>

          <aside className="reveal reveal-3 space-y-4">
            <div className="border border-rule rounded-lg p-6 bg-paper-dim">
              <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-4">
                Membership
              </p>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Role</dt>
                  <dd className="text-ink font-semibold capitalize">{user.role}</dd>
                </div>
                {user.officerCategory && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-soft">Review category</dt>
                    <dd className="text-ink font-semibold">{user.officerCategory}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Member since</dt>
                  <dd className="text-ink font-semibold">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Saved guides</dt>
                  <dd className="text-ink font-semibold">{savedResources.length}</dd>
                </div>
              </dl>
            </div>

            <Link
              to="/saved"
              className="flex items-center gap-2.5 px-5 py-3.5 border border-rule hover:border-pen rounded-lg text-sm font-semibold text-ink transition-colors"
            >
              <BookmarkCheck className="w-4 h-4 text-pen" /> Saved resources
            </Link>
            <Link
              to="/gpa-tool"
              className="flex items-center gap-2.5 px-5 py-3.5 border border-rule hover:border-pen rounded-lg text-sm font-semibold text-ink transition-colors"
            >
              <Calculator className="w-4 h-4 text-pen" /> GPA & target tools
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="w-full flex items-center gap-2.5 px-5 py-3.5 border border-rule hover:border-pen rounded-lg text-sm font-semibold text-ink-soft hover:text-ink transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}
