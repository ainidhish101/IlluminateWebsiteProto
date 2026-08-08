/*
  Volunteer hours tracker (Associate+).

  Hours are read-only here by design: only a Director can grant them, and
  they're always tied to a reason (usually an approved guide). The "pending"
  number is derived from submissions still in review rather than stored, so
  it can't drift out of sync with the approval queue.
*/

import { useMemo } from "react";
import { Award, Clock, Download, FileClock, Hourglass } from "lucide-react";
import {
  Button,
  Chip,
  DataBoundary,
  EmptyState,
  PageHeader,
  Panel,
  StatTile,
  StatusPill,
  TableWrap,
  Td,
  Th,
  formatDate,
} from "~/components/dashboard/ui";
import { RequireRole } from "~/components/dashboard/RequireRole";
import { downloadHoursCertificate } from "~/components/dashboard/certificate";
import { useDashboard } from "~/lib/dashboardContext";
import { useQuery } from "~/lib/useQuery";
import { listMyHours, listMySubmissions, totalHours } from "~/lib/db";

export default function HoursTab() {
  return (
    <RequireRole minimum="associate">
      <HoursContent />
    </RequireRole>
  );
}

function HoursContent() {
  const { user } = useDashboard();
  const hours = useQuery(() => listMyHours(user.id), [user.id]);
  const submissions = useQuery(() => listMySubmissions(user.id), [user.id]);

  const rows = hours.data ?? [];
  const total = totalHours(rows);

  const pending = useMemo(
    () =>
      (submissions.data ?? []).filter(
        (row) => row.status === "pending_officer" || row.status === "pending_admin",
      ),
    [submissions.data],
  );

  const thisYear = rows
    .filter((row) => row.date.startsWith(String(new Date().getFullYear())))
    .reduce((sum, row) => sum + Number(row.hours || 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="Contribute"
        title="Volunteer hours"
        description="Hours Directors have awarded for your guide work, and the submissions still waiting on a decision."
        action={
          <Button
            icon={Download}
            variant="secondary"
            disabled={rows.length === 0}
            onClick={() =>
              downloadHoursCertificate({
                studentName: user.name,
                studentEmail: user.email,
                rows,
                total,
              })
            }
          >
            Download certificate
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatTile
          label="Total hours"
          value={total.toLocaleString()}
          hint="All time, Director-awarded"
          icon={Clock}
          tone="good"
        />
        <StatTile
          label={`Hours in ${new Date().getFullYear()}`}
          value={thisYear.toLocaleString()}
          icon={Award}
          tone="marker"
        />
        <StatTile
          label="Awaiting a decision"
          value={pending.length}
          hint="Submissions in review — hours follow approval"
          icon={Hourglass}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Panel title="Awarded hours" description="Each row was signed off by a Director.">
          <DataBoundary loading={hours.loading} error={hours.error}>
            {rows.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No hours awarded yet."
                description="Submit a guide, get it through Officer review and Director approval, and hours land here."
              />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Reason</Th>
                    <Th className="text-right">Hours</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <Td className="text-ink-soft whitespace-nowrap">{formatDate(row.date)}</Td>
                      <Td className="text-ink">{row.reason}</Td>
                      <Td className="text-right tabular-nums text-ink font-semibold">
                        {Number(row.hours).toFixed(1)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </DataBoundary>
        </Panel>

        <Panel
          title="Pending review"
          description="Nothing to do here — it's a view of where each draft sits."
        >
          <DataBoundary loading={submissions.loading} error={submissions.error}>
            {pending.length === 0 ? (
              <EmptyState
                icon={FileClock}
                title="Nothing in review."
                description="Every guide you've submitted has been decided on."
              />
            ) : (
              <ul className="space-y-2.5">
                {pending.map((row) => (
                  <li key={row.id} className="border border-rule rounded-lg p-3.5 bg-paper-dim">
                    <p className="text-ink font-semibold text-sm leading-snug">{row.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <StatusPill status={row.status} />
                      <Chip tone="pen">{row.category}</Chip>
                      <Chip>Sent {formatDate(row.created_at)}</Chip>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DataBoundary>
        </Panel>
      </div>
    </>
  );
}
