/*
  Tab-level role gate.

  A user should never reach a tab above their tier — the sidebar doesn't
  render the link — but URLs get typed, bookmarked, and shared after a demotion.
  This turns that into a clear explanation instead of a stack of failed queries.

  It is a courtesy, not the security boundary: Row Level Security in Postgres
  rejects the underlying reads and writes regardless of what renders.
*/

import { Link } from "react-router";
import { ShieldAlert } from "lucide-react";
import { ROLE_LABEL, roleAtLeast, type Role } from "~/lib/roles";
import { useDashboard } from "~/lib/dashboardContext";

export function RequireRole({
  minimum,
  children,
}: {
  minimum: Role;
  children: React.ReactNode;
}) {
  const { role } = useDashboard();

  if (roleAtLeast(role, minimum)) return <>{children}</>;

  return (
    <div className="max-w-lg mx-auto text-center py-16">
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-marker/15 text-marker-dim mb-5">
        <ShieldAlert className="w-6 h-6" />
      </span>
      <h1 className="font-display font-extrabold text-3xl text-ink tracking-tight mb-3">
        That tab is for {ROLE_LABEL[minimum]}s and above.
      </h1>
      <p className="text-ink-soft leading-relaxed mb-7">
        You're signed in as {ROLE_LABEL[role]}. A Director can change that from the User
        Management tab — reach out if you think it should already have happened.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center px-5 py-3 bg-pen-solid hover:bg-pen-solid-dim text-white font-semibold text-sm rounded-lg transition-colors"
      >
        Back to overview
      </Link>
    </div>
  );
}
