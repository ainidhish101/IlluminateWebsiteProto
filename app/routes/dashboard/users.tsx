/*
  User role management (Director only).

  Promotion is a two-field decision — role, and for Officers the category
  they'll review — so both live in the same row and commit together. The
  category select only appears for Officers because it means nothing for any
  other tier, and `setUserRole` clears it on the way out.

  A Director cannot demote themselves here. Locking yourself out of the only
  tab that could undo it is a one-way door, and the RLS policy allows it, so
  the guard belongs in the UI.
*/

import { useMemo, useState } from "react";
import { Check, Search, ShieldCheck, UserCog, Users } from "lucide-react";
import {
  Button,
  Chip,
  DataBoundary,
  EmptyState,
  ErrorNote,
  PageHeader,
  Panel,
  SelectInput,
  StatTile,
  TableWrap,
  Td,
  Th,
  TextInput,
  formatDate,
} from "~/components/dashboard/ui";
import { RequireRole } from "~/components/dashboard/RequireRole";
import { useDashboard } from "~/lib/dashboardContext";
import { useMutation, useQuery } from "~/lib/useQuery";
import { displayName, listProfiles, setUserRole, type ProfileRow } from "~/lib/db";
import { GUIDE_CATEGORIES, ROLES, ROLE_LABEL, type Role } from "~/lib/roles";

export default function UsersTab() {
  return (
    <RequireRole minimum="admin">
      <UsersContent />
    </RequireRole>
  );
}

function UsersContent() {
  const { user, refreshUser } = useDashboard();
  const profiles = useQuery(() => listProfiles(), []);
  const rows = profiles.data ?? [];
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (roleFilter !== "all" && row.role !== roleFilter) return false;
      if (!needle) return true;
      return (
        row.email.toLowerCase().includes(needle) ||
        (row.full_name ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, query, roleFilter]);

  const counts = useMemo(() => {
    const tally: Record<Role, number> = { member: 0, associate: 0, officer: 0, admin: 0 };
    for (const row of rows) tally[row.role] = (tally[row.role] ?? 0) + 1;
    return tally;
  }, [rows]);

  const uncoveredCategories = GUIDE_CATEGORIES.filter(
    (category) => !rows.some((row) => row.role === "officer" && row.officer_category === category),
  );

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="User management"
        description="Promote, demote, and assign Officer categories. Changes take effect the next time that person loads the dashboard."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatTile label="Members" value={counts.member} icon={Users} />
        <StatTile label="Associates" value={counts.associate} icon={UserCog} tone="pen" />
        <StatTile
          label="Officers"
          value={counts.officer}
          hint={
            uncoveredCategories.length > 0
              ? `${uncoveredCategories.length} categories uncovered`
              : "Every category covered"
          }
          icon={ShieldCheck}
          tone={uncoveredCategories.length > 0 ? "marker" : "good"}
        />
        <StatTile label="Directors" value={counts.admin} icon={ShieldCheck} tone="marker" />
      </div>

      {uncoveredCategories.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 bg-marker/10 border border-marker/40 rounded-xl px-4 py-3">
          <span className="course-code text-[0.62rem] uppercase tracking-wide text-marker-dim">
            No Officer assigned
          </span>
          {uncoveredCategories.map((category) => (
            <Chip key={category} tone="marker">
              {category}
            </Chip>
          ))}
        </div>
      )}

      <Panel
        title="Everyone"
        description={`${visible.length} of ${rows.length} shown.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <TextInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or email"
                aria-label="Search users"
                className="pl-9 w-56"
              />
            </div>
            <SelectInput
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Role | "all")}
              aria-label="Filter by role"
              className="w-40"
            >
              <option value="all">All roles</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </SelectInput>
          </div>
        }
      >
        <DataBoundary loading={profiles.loading} error={profiles.error}>
          {visible.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nobody matches that."
              description="Clear the search or role filter to see everyone again."
            />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Person</Th>
                  <Th>Current</Th>
                  <Th>Change role</Th>
                  <Th>Joined</Th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <UserRow
                    key={row.id}
                    row={row}
                    isSelf={row.id === user.id}
                    onSaved={async () => {
                      profiles.reload();
                      if (row.id === user.id) await refreshUser();
                    }}
                  />
                ))}
              </tbody>
            </TableWrap>
          )}
        </DataBoundary>
      </Panel>
    </>
  );
}

function UserRow({
  row,
  isSelf,
  onSaved,
}: {
  row: ProfileRow;
  isSelf: boolean;
  onSaved: () => void | Promise<void>;
}) {
  const [role, setRole] = useState<Role>(row.role);
  const [category, setCategory] = useState<string>(
    row.officer_category ?? GUIDE_CATEGORIES[0],
  );
  const [saved, setSaved] = useState(false);
  const { busy, error, setError, run } = useMutation();

  const dirty = role !== row.role || (role === "officer" && category !== row.officer_category);
  // A Director demoting themselves loses the only tab that could reverse it.
  const selfDemotion = isSelf && role !== "admin";

  async function save() {
    if (selfDemotion) {
      setError("Ask another Director to change your own role.");
      return;
    }
    const ok = await run(() => setUserRole(row.id, role, role === "officer" ? category : null));
    if (!ok) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await onSaved();
  }

  return (
    <tr>
      <Td>
        <p className="text-ink font-medium">
          {displayName(row)}
          {isSelf && <span className="text-ink-soft font-normal"> (you)</span>}
        </p>
        <p className="text-ink-soft text-xs truncate max-w-[16rem]">{row.email}</p>
      </Td>
      <Td>
        <div className="flex flex-wrap gap-1.5">
          <Chip tone={row.role === "admin" ? "marker" : row.role === "member" ? "neutral" : "pen"}>
            {ROLE_LABEL[row.role]}
          </Chip>
          {row.officer_category && <Chip>{row.officer_category}</Chip>}
        </div>
      </Td>
      <Td>
        <div className="flex flex-wrap items-center gap-2">
          <SelectInput
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            aria-label={`Role for ${displayName(row)}`}
            className="w-36"
          >
            {ROLES.map((option) => (
              <option key={option} value={option}>
                {ROLE_LABEL[option]}
              </option>
            ))}
          </SelectInput>

          {role === "officer" && (
            <SelectInput
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label={`Review category for ${displayName(row)}`}
              className="w-48"
            >
              {GUIDE_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectInput>
          )}

          <Button
            onClick={save}
            busy={busy}
            disabled={!dirty || selfDemotion}
            variant={dirty ? "primary" : "secondary"}
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" /> Saved
              </>
            ) : (
              "Apply"
            )}
          </Button>
        </div>
        {error && (
          <div className="mt-2 max-w-md">
            <ErrorNote message={error} />
          </div>
        )}
      </Td>
      <Td className="text-ink-soft whitespace-nowrap">{formatDate(row.created_at)}</Td>
    </tr>
  );
}
