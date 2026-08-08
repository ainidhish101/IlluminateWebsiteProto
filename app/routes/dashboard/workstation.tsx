/*
  Officer Category Workstation.

  The filter is not a control the Officer operates — it is their identity.
  `profiles.officer_category` decides which submissions load, and the matching
  RLS policy refuses everything else, so there is no version of this screen
  that shows another category's drafts.

  Layout is a list on the left and the selected draft on the right: the doc
  preview and the feedback box sit side by side on desktop so notes can be
  written while reading.
*/

import { useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  ExternalLink,
  Inbox,
  RotateCcw,
  SendHorizontal,
  ShieldQuestion,
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
  formatDate,
} from "~/components/dashboard/ui";
import { RequireRole } from "~/components/dashboard/RequireRole";
import { useDashboard } from "~/lib/dashboardContext";
import { useMutation, useQuery } from "~/lib/useQuery";
import {
  displayName,
  indexProfiles,
  listProfiles,
  listSubmissionsByCategory,
  reviewSubmission,
  type SubmissionRow,
} from "~/lib/db";

export default function WorkstationTab() {
  return (
    <RequireRole minimum="officer">
      <WorkstationContent />
    </RequireRole>
  );
}

/** Google Docs renders an embeddable view at /preview for link-shared docs. */
function previewUrl(docUrl: string): string | null {
  const match = docUrl.match(/^https:\/\/docs\.google\.com\/document\/d\/([\w-]+)/i);
  return match ? `https://docs.google.com/document/d/${match[1]}/preview` : null;
}

function WorkstationContent() {
  const { user } = useDashboard();
  const category = user.officerCategory;

  const submissions = useQuery(
    () => listSubmissionsByCategory(category ?? ""),
    [category],
    { enabled: !!category },
  );
  const profiles = useQuery(() => listProfiles(), []);
  const rows = submissions.data ?? [];
  const authors = useMemo(() => indexProfiles(profiles.data ?? []), [profiles.data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((row) => row.id === selectedId) ?? null;

  // Keep a selection alive across reloads; fall back to the first row.
  useEffect(() => {
    if (rows.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !rows.some((row) => row.id === selectedId)) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId]);

  if (!category) {
    return (
      <>
        <PageHeader eyebrow="Review" title="Category workstation" />
        <Panel>
          <EmptyState
            icon={ShieldQuestion}
            title="No category assigned to you yet."
            description="A Director sets your review category from the User Management tab. Until then there's nothing for this workstation to filter to."
          />
        </Panel>
      </>
    );
  }

  const waiting = rows.filter((row) => row.status === "pending_officer");
  const passedUp = rows.filter((row) => row.status === "pending_admin");

  return (
    <>
      <PageHeader
        eyebrow="Review"
        title="Category workstation"
        description={`Filtered to ${category}. You see every submission in this category and nothing outside it.`}
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatTile
          label="Waiting on you"
          value={waiting.length}
          hint="Status: pending Officer review"
          icon={ClipboardCheck}
          tone={waiting.length > 0 ? "flag" : "good"}
        />
        <StatTile
          label="Passed to Directors"
          value={passedUp.length}
          hint="Cleared by you, awaiting approval"
          icon={SendHorizontal}
          tone="pen"
        />
        <StatTile
          label="Total in category"
          value={rows.length}
          hint={category}
          icon={Inbox}
          tone="marker"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[22rem_1fr] items-start">
        <Panel title="Submissions" description={`${category} only.`}>
          <DataBoundary loading={submissions.loading} error={submissions.error}>
            {rows.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Queue is empty."
                description={`No Associate has filed a guide under ${category} yet.`}
              />
            ) : (
              <ul className="space-y-2">
                {rows.map((row) => (
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
                        {displayName(authors.get(row.user_id))}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <StatusPill status={row.status} />
                        <Chip>{formatDate(row.created_at)}</Chip>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </DataBoundary>
        </Panel>

        {selected ? (
          <ReviewPane
            key={selected.id}
            submission={selected}
            authorName={displayName(authors.get(selected.user_id))}
            reviewerId={user.id}
            onReviewed={submissions.reload}
          />
        ) : (
          <Panel>
            <EmptyState
              icon={ClipboardCheck}
              title="Pick a submission to review."
              description="Choose one from the list to read the draft and leave feedback."
            />
          </Panel>
        )}
      </div>
    </>
  );
}

function ReviewPane({
  submission,
  authorName,
  reviewerId,
  onReviewed,
}: {
  submission: SubmissionRow;
  authorName: string;
  reviewerId: string;
  onReviewed: () => void;
}) {
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const { busy, error, setError, run } = useMutation();
  const preview = previewUrl(submission.doc_url);
  const decided = submission.status === "approved" || submission.status === "rejected";

  async function decide(status: "pending_admin" | "changes_requested") {
    if (status === "changes_requested" && feedback.trim().length < 5) {
      setError("Say what needs changing — the Associate only sees this note.");
      return;
    }
    const ok = await run(() =>
      reviewSubmission(submission.id, {
        status,
        feedback: feedback.trim() || null,
        reviewerId,
      }),
    );
    if (ok) onReviewed();
  }

  return (
    <Panel
      title={submission.title}
      description={`Submitted by ${authorName} · ${formatDate(submission.created_at)}`}
      action={
        <a
          href={submission.doc_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-pen hover:text-pen-dim transition-colors"
        >
          Open in Docs <ExternalLink className="w-3.5 h-3.5" />
        </a>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2 items-start">
        <div>
          <p className="course-code text-[0.62rem] uppercase tracking-wide text-ink-soft mb-2">
            Draft
          </p>
          {preview ? (
            <div className="border border-rule rounded-lg overflow-hidden bg-paper-dim">
              <iframe
                title={`Preview of ${submission.title}`}
                src={preview}
                className="w-full h-[30rem] block"
                style={{ border: 0 }}
                loading="lazy"
              />
            </div>
          ) : (
            <div className="border border-rule rounded-lg p-5 bg-paper-dim">
              <p className="text-ink-soft text-sm leading-relaxed">
                This link can't be previewed inline. Open it in a new tab to read the draft.
              </p>
            </div>
          )}
          <p className="text-ink-soft text-xs leading-relaxed mt-2">
            A blank preview usually means the doc isn't link-shared yet — ask the Associate to set
            it to "anyone with the link can comment".
          </p>

          {submission.notes && (
            <div className="mt-4 border border-rule rounded-lg p-4 bg-paper-dim">
              <p className="course-code text-[0.6rem] uppercase text-ink-soft mb-1.5">
                Note from the Associate
              </p>
              <p className="text-ink text-sm leading-relaxed whitespace-pre-wrap">
                {submission.notes}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={submission.status} />
            <Chip tone="pen">{submission.category}</Chip>
          </div>

          {error && <ErrorNote message={error} />}

          <Field
            label="Feedback"
            htmlFor="review-feedback"
            hint="The Associate sees this verbatim, whichever button you press."
          >
            <TextArea
              id="review-feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={9}
              placeholder="What's working, what needs another pass, and anything a Director should know."
              className="min-h-[12rem]"
            />
          </Field>

          {decided ? (
            <p className="text-ink-soft text-sm leading-relaxed">
              A Director has already made the final call on this guide. Feedback is read-only now.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              <Button
                icon={SendHorizontal}
                busy={busy}
                onClick={() => decide("pending_admin")}
                className="flex-1 min-w-[12rem]"
              >
                Pass to Directors
              </Button>
              <Button
                variant="secondary"
                icon={RotateCcw}
                busy={busy}
                onClick={() => decide("changes_requested")}
                className="flex-1 min-w-[12rem]"
              >
                Request changes
              </Button>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
