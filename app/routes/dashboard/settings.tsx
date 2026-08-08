/*
  System settings (Director only).

  This is a status screen, not a control panel: the things it reports —
  Supabase keys, the storage bucket, the calendar id — are build-time
  environment variables and Supabase project settings. Writing them from the
  browser would mean shipping a service-role key to the client, which is
  exactly the thing not to do.

  What it can do is tell a Director, at a glance, whether the deployment is
  actually wired up and which categories have nobody reviewing them.
*/

import { useMemo } from "react";
import { CheckCircle2, Database, HardDrive, CalendarDays, XCircle, UserCog } from "lucide-react";
import {
  Chip,
  DataBoundary,
  PageHeader,
  Panel,
  TableWrap,
  Td,
  Th,
} from "~/components/dashboard/ui";
import { RequireRole } from "~/components/dashboard/RequireRole";
import { useQuery } from "~/lib/useQuery";
import { displayName, listProfiles } from "~/lib/db";
import { GUIDE_CATEGORIES, ROLE_LABEL } from "~/lib/roles";
import { isSupabaseConfigured, TRANSCRIPT_BUCKET } from "~/lib/supabase";

export default function SettingsTab() {
  return (
    <RequireRole minimum="admin">
      <SettingsContent />
    </RequireRole>
  );
}

function SettingsContent() {
  const profiles = useQuery(() => listProfiles(), []);
  const rows = profiles.data ?? [];

  const calendarId = import.meta.env.VITE_GOOGLE_CALENDAR_ID as string | undefined;

  const coverage = useMemo(
    () =>
      GUIDE_CATEGORIES.map((category) => ({
        category,
        officers: rows.filter(
          (row) => row.role === "officer" && row.officer_category === category,
        ),
      })),
    [rows],
  );

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="System settings"
        description="Deployment status and category coverage. Environment values are set in your .env file and the Supabase project, not here."
      />

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Panel title="Connection status">
          <ul className="space-y-3">
            <StatusLine
              ok={isSupabaseConfigured}
              icon={Database}
              label="Supabase project"
              okText="Connected — auth and data are live."
              badText="Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Accounts fall back to browser-local storage."
            />
            <StatusLine
              ok={isSupabaseConfigured}
              icon={HardDrive}
              label={`Storage bucket "${TRANSCRIPT_BUCKET}"`}
              okText="Transcript uploads write here. Create it as a private bucket if you haven't."
              badText="Needs Supabase before transcripts can be uploaded."
            />
            <StatusLine
              ok={!!calendarId}
              icon={CalendarDays}
              label="Google Calendar"
              okText={`Embedding ${calendarId}.`}
              badText="Set VITE_GOOGLE_CALENDAR_ID to embed the organization calendar."
            />
          </ul>

          <div className="mt-5 pt-5 border-t border-rule">
            <p className="course-code text-[0.62rem] uppercase tracking-wide text-ink-soft mb-2">
              Where these live
            </p>
            <p className="text-ink-soft text-sm leading-relaxed">
              Environment variables come from <code className="course-code text-ink">.env</code> at
              the project root and are read at build time — changing one means restarting the dev
              server or redeploying. The full checklist is in{" "}
              <code className="course-code text-ink">SUPABASE_SETUP.md</code>.
            </p>
          </div>
        </Panel>

        <Panel
          title="Category coverage"
          description="Each guide category should have exactly one Officer reviewing it."
        >
          <DataBoundary loading={profiles.loading} error={profiles.error}>
            <TableWrap>
              <thead>
                <tr>
                  <Th>Category</Th>
                  <Th>Officer</Th>
                </tr>
              </thead>
              <tbody>
                {coverage.map(({ category, officers }) => (
                  <tr key={category}>
                    <Td className="text-ink font-medium">{category}</Td>
                    <Td>
                      {officers.length === 0 ? (
                        <Chip tone="marker">Unassigned</Chip>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {officers.map((officer) => (
                            <Chip key={officer.id} tone="pen">
                              {displayName(officer)}
                            </Chip>
                          ))}
                        </div>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </DataBoundary>
        </Panel>

        <Panel
          title="Role distribution"
          description="Who currently holds what, across the whole platform."
          className="lg:col-span-2"
        >
          <DataBoundary loading={profiles.loading} error={profiles.error}>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(["member", "associate", "officer", "admin"] as const).map((role) => {
                const holders = rows.filter((row) => row.role === role);
                return (
                  <li key={role} className="border border-rule rounded-lg p-4 bg-paper-dim">
                    <div className="flex items-center gap-2 mb-2.5">
                      <UserCog className="w-4 h-4 text-ink-soft" />
                      <p className="course-code text-[0.62rem] uppercase tracking-wide text-ink-soft">
                        {ROLE_LABEL[role]}
                      </p>
                      <span className="ml-auto font-display font-extrabold text-xl text-ink tabular-nums">
                        {holders.length}
                      </span>
                    </div>
                    {role !== "member" && holders.length > 0 && (
                      <ul className="space-y-1">
                        {holders.slice(0, 6).map((holder) => (
                          <li key={holder.id} className="text-ink-soft text-xs truncate">
                            {displayName(holder)}
                          </li>
                        ))}
                        {holders.length > 6 && (
                          <li className="text-ink-soft text-xs">
                            +{holders.length - 6} more
                          </li>
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </DataBoundary>
        </Panel>
      </div>
    </>
  );
}

function StatusLine({
  ok,
  icon: Icon,
  label,
  okText,
  badText,
}: {
  ok: boolean;
  icon: typeof Database;
  label: string;
  okText: string;
  badText: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
          ok ? "bg-good/12 text-good" : "bg-marker/15 text-marker-dim"
        }`}
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-ink font-semibold text-sm">
          {label}
          {ok ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-good" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-marker-dim" />
          )}
        </p>
        <p className="text-ink-soft text-sm leading-relaxed mt-0.5">{ok ? okText : badText}</p>
      </div>
    </li>
  );
}
