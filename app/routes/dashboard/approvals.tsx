/*
  Director approval desk + volunteer-hours engine.

  These are one screen because they are one decision: a guide gets approved
  and the Associate who wrote it gets paid in hours. Splitting them across two
  tabs is how hours quietly stop being awarded.

  The grant form appears once a guide is approved, pre-filled with the guide's
  title as the reason and carrying its id, so every awarded hour traces back to
  a specific piece of work.
*/

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Clock,
  ExternalLink,
  Inbox,
  RotateCcw,
  ThumbsDown,
  X,
} from "lucide-react";
import {
  Button,
  Chip,
  DataBoundary,
  EmptyState,
  ErrorNote,
  Field,
  PageHeader,
  Panel,
  StatTile,
  StatusPill,
  TextArea,
  TextInput,
  formatDate,
} from "~/components/dashboard/ui";
import { RequireRole } from "~/components/dashboard/RequireRole";
import { useDashboard } from "~/lib/dashboardContext";
import { useMutation, useQuery } from "~/lib/useQuery";
import {
  displayName,
  grantHours,
  indexProfiles,
  listAllHours,
  listAllSubmissions,
  listProfiles,
  reviewSubmission,
  type ProfileRow,
  type SubmissionRow,
} from "~/lib/db";
import { SUBMISSION_STATUSES, type SubmissionStatus } from "~/lib/roles";

type Filter = SubmissionStatus | "all";

export default function ApprovalsTab() {
  return (
    <RequireRole minimum="admin">
      <ApprovalsContent />
    </RequireRole>
  );
}

function ApprovalsContent() {
  const { user } = useDashboard();
  const submissions = useQuery(() => listAllSubmissions(), []);
  const profiles = useQuery(() => listProfiles(), []);
  const hours = useQuery(() => listAllHours(), []);

  const rows = submissions.data ?? [];
  const people = useMemo(() => indexProfiles(profiles.data ?? []), [profiles.data]);
  const [filter, setFilter] = useState<Filter>("pending_admin");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((row) => row.status === filter)),
    [rows, filter],
  );

  const selected = rows.find((row) => row.id === selectedId) ?? null;

  useEffect(() => {
    if (visible.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !visible.some((row) => row.id === selectedId)) {
      setSelectedId(visible[0].id);
    }
  }, [visible, selectedId]);

  const awaiting = rows.filter((row) => row.status === "pending_admin").length;
  const approved = rows.filter((row) => row.status === "approved");
  const hoursGranted = (hours.data ?? []).reduce((sum, row) => sum + Number(row.hours || 0), 0);
  const guidesWithHours = new Set(
    (hours.data ?? []).map((row) => row.guide_id).filter(Boolean) as string[],
  );
  const unpaid = approved.filter((row) => !guidesWithHours.has(row.id)).length;

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Approval & hours desk"
        description="Final sign-off on guides Officers have cleared — and the place hours get awarded for them."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatTile
          label="Awaiting approval"
          value={awaiting}
          hint="Cleared by an Officer"
          icon={Inbox}
          tone={awaiting > 0 ? "flag" : "good"}
        />
        <StatTile
          label="Approved guides"
          value={approved.length}
          hint={`${rows.length} submissions in total`}
          icon={BadgeCheck}
          tone="good"
        />
        <StatTile
          label="Approved, no hours yet"
          value={unpaid}
          hint="Award hours so the Associate gets credit"
          icon={Clock}
          tone={unpaid > 0 ? "marker" : "good"}
        />
        <StatTile
          label="Hours awarded"
          value={hoursGranted.toLocaleString()}
          hint="Across every Associate"
          icon={Clock}
          tone="pen"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[22rem_1fr] items-start">
        <Panel
          title="Queue"
          action={
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              aria-label="Filter by status"
              className="px-2.5 py-1.5 bg-paper border border-rule rounded-md text-ink text-xs focus:outline-none focus:border-pen"
            >
              <option value="pending_admin">Awaiting approval</option>
              {SUBMISSION_STATUSES.filter((status) => status !== "pending_admin").map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
              <option value="all">All</option>
            </select>
          }
        >
          <DataBoundary loading={submissions.loading} error={submissions.error}>
            {visible.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Nothing here."
                description="Try a different status filter — or enjoy the empty queue."
              />
            ) : (
              <ul className="space-y-2">
                {visible.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      aria-current={row.id === selectedId}
                      className={`w-full text-left border rounded-lg p-3.5 transition-colors ${
                        row.id === selectedId
                          ? "border-pen bg-pen/5"
                          : "border-rule bg-paper-dim hover:border-pen"
                      }`}
                    >
                      <p className="text-ink font-semibold text-sm leading-snug">{row.title}</p>
                      <p className="text-ink-soft text-xs mt-1">
                        {displayName(people.get(row.user_id))}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <StatusPill status={row.status} />
                        <Chip tone="pen">{row.category}</Chip>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </DataBoundary>
        </Panel>

        {selected ? (
          <DecisionPane
            key={selected.id}
            submission={selected}
            author={people.get(selected.user_id)}
            reviewer={people.get(selected.reviewed_by ?? "")}
            adminId={user.id}
            alreadyPaid={guidesWithHours.has(selected.id)}
            onChanged={() => {
              submissions.reload();
              hours.reload();
            }}
          />
        ) : (
          <Panel>
            <EmptyState
              icon={BadgeCheck}
              title="Select a submission."
              description="Pick one from the queue to read the Officer's notes and decide."
            />
          </Panel>
        )}
      </div>
    </>
  );
}

function DecisionPane({
  submission,
  author,
  reviewer,
  adminId,
  alreadyPaid,
  onChanged,
}: {
  submission: SubmissionRow;
  author: ProfileRow | undefined;
  reviewer: ProfileRow | undefined;
  adminId: string;
  alreadyPaid: boolean;
  onChanged: () => void;
}) {
  const { busy, error, setError, run } = useMutation();
  const [rejectOpen, setRejectOpen] = useState(false);

  async function decide(status: SubmissionStatus, feedbackOverride?: string) {
    const ok = await run(() =>
      reviewSubmission(submission.id, {
        status,
        feedback: feedbackOverride ?? submission.feedback,
        reviewerId: adminId,
      }),
    );
    if (ok) onChanged();
    return ok;
  }

  async function confirmReject(reason: string) {
    const ok = await decide("rejected", reason);
    if (ok) setRejectOpen(false);
  }

  return (
    <div className="space-y-6">
      <Panel
        title={submission.title}
        description={`By ${displayName(author)} · filed ${formatDate(submission.created_at)}`}
        action={
          <a
            href={submission.doc_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-pen hover:text-pen-dim transition-colors"
          >
            Open the doc <ExternalLink className="w-3.5 h-3.5" />
          </a>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={submission.status} />
            <Chip tone="pen">{submission.category}</Chip>
            {submission.reviewed_at && (
              <Chip>Reviewed {formatDate(submission.reviewed_at)}</Chip>
            )}
          </div>

          {submission.notes && (
            <div className="border border-rule rounded-lg p-4 bg-paper-dim">
              <p className="course-code text-[0.6rem] uppercase text-ink-soft mb-1.5">
                Note from {displayName(author)}
              </p>
              <p className="text-ink text-sm leading-relaxed whitespace-pre-wrap">
                {submission.notes}
              </p>
            </div>
          )}

          <div className="border border-rule rounded-lg p-4 bg-paper-dim">
            <p className="course-code text-[0.6rem] uppercase text-ink-soft mb-1.5">
              Officer feedback{reviewer ? ` · ${displayName(reviewer)}` : ""}
            </p>
            <p className="text-ink text-sm leading-relaxed whitespace-pre-wrap">
              {submission.feedback || "No written feedback was left."}
            </p>
          </div>

          {error && <ErrorNote message={error} />}

          <div className="flex flex-wrap gap-2.5">
            <Button
              icon={BadgeCheck}
              busy={busy}
              disabled={submission.status === "approved"}
              onClick={() => decide("approved")}
            >
              {submission.status === "approved" ? "Approved" : "Approve & publish"}
            </Button>
            <Button
              variant="secondary"
              icon={RotateCcw}
              busy={busy}
              onClick={() => decide("changes_requested")}
            >
              Send back for changes
            </Button>
            <Button
              variant="danger"
              icon={ThumbsDown}
              busy={busy}
              disabled={submission.status === "rejected"}
              onClick={() => setRejectOpen(true)}
            >
              Reject
            </Button>
          </div>
        </div>
      </Panel>

      {submission.status === "approved" && (
        <GrantHoursPanel
          submission={submission}
          author={author}
          adminId={adminId}
          alreadyPaid={alreadyPaid}
          onGranted={onChanged}
        />
      )}

      <RejectDialog
        open={rejectOpen}
        busy={busy}
        error={error}
        onCancel={() => {
          setRejectOpen(false);
          setError(null);
        }}
        onConfirm={confirmReject}
      />
    </div>
  );
}

/**
 * The reason is required and becomes the guide's feedback, so a rejection
 * always leaves the Associate with a written explanation — never a silent
 * status flip.
 */
function RejectDialog({
  open,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setValidationError(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => {
      document.getElementById("reject-reason")?.focus();
    });
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
    };
  }, [open, onCancel]);

  if (!open) return null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 5) {
      setValidationError("Say why this guide is being rejected — the Associate sees this note.");
      return;
    }
    onConfirm(reason.trim());
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-10 overflow-y-auto bg-chalkboard/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-dialog-title"
        className="reveal w-full max-w-md bg-paper border border-rule rounded-xl shadow-2xl overflow-hidden my-auto"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            <p className="course-code text-[0.65rem] uppercase tracking-[0.15em] text-flag mb-2">
              Reject guide
            </p>
            <h2
              id="reject-dialog-title"
              className="font-display font-extrabold text-2xl text-ink tracking-tight"
            >
              Explain the rejection
            </h2>
            <p className="text-ink-soft text-sm mt-1.5 leading-relaxed">
              Required. This replaces any existing feedback and is what the Associate sees.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="p-1.5 -mr-1.5 -mt-1 text-ink-soft hover:text-ink transition-colors rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 pb-6 space-y-4" noValidate>
          {(validationError || error) && <ErrorNote message={validationError ?? error ?? ""} />}
          <Field label="Reason for rejection" htmlFor="reject-reason">
            <TextArea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              placeholder="What's wrong with this guide, and why it can't just go back for changes."
              className="min-h-[7rem]"
            />
          </Field>
          <div className="flex justify-end gap-2.5">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" icon={ThumbsDown} busy={busy}>
              Reject guide
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GrantHoursPanel({
  submission,
  author,
  adminId,
  alreadyPaid,
  onGranted,
}: {
  submission: SubmissionRow;
  author: ProfileRow | undefined;
  adminId: string;
  alreadyPaid: boolean;
  onGranted: () => void;
}) {
  const [hours, setHours] = useState("5");
  const [reason, setReason] = useState(`${submission.title} — approved guide`);
  const [granted, setGranted] = useState(false);
  const { busy, error, setError, run } = useMutation();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(hours);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Hours must be a number above zero.");
      return;
    }
    if (reason.trim().length < 4) {
      setError("Give the award a reason — it appears on the Associate's certificate.");
      return;
    }
    const ok = await run(() =>
      grantHours({
        user_id: submission.user_id,
        guide_id: submission.id,
        hours: value,
        reason: reason.trim(),
        approved_by: adminId,
      }),
    );
    if (!ok) return;
    setGranted(true);
    onGranted();
  }

  return (
    <Panel
      title="Award volunteer hours"
      description={`Credited to ${displayName(author)} and tied to this guide.`}
    >
      {alreadyPaid && !granted && (
        <p className="mb-4 flex items-start gap-2 text-sm text-ink bg-marker/10 border border-marker/40 rounded-lg px-3.5 py-2.5">
          <Clock className="w-4 h-4 shrink-0 mt-0.5 text-marker-dim" />
          <span>Hours have already been awarded for this guide. Granting again stacks on top.</span>
        </p>
      )}
      {granted && (
        <p className="mb-4 flex items-start gap-2 text-sm text-ink bg-good/10 border border-good/30 rounded-lg px-3.5 py-2.5">
          <BadgeCheck className="w-4 h-4 shrink-0 mt-0.5 text-good" />
          <span>
            Awarded. It's already showing in {displayName(author)}'s volunteer hours tab.
          </span>
        </p>
      )}

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[8rem_1fr_auto] sm:items-end" noValidate>
        <Field label="Hours" htmlFor="grant-hours">
          <TextInput
            id="grant-hours"
            type="number"
            min="0.5"
            step="0.5"
            value={hours}
            onChange={(e) => {
              setHours(e.target.value);
              setGranted(false);
            }}
          />
        </Field>
        <Field label="Reason" htmlFor="grant-reason">
          <TextInput
            id="grant-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setGranted(false);
            }}
          />
        </Field>
        <Button type="submit" icon={Clock} busy={busy} className="h-[42px]">
          Grant hours
        </Button>
        {error && (
          <div className="sm:col-span-3">
            <ErrorNote message={error} />
          </div>
        )}
      </form>
    </Panel>
  );
}
