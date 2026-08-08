/*
  Content submission portal (Associate+).

  An Associate files a Google Doc link under one category. The category
  decides which Officer sees it — there is no manual routing step — so the
  form makes that consequence explicit rather than burying it in a dropdown.
*/

import { useState } from "react";
import { ExternalLink, FileEdit, Info, Send } from "lucide-react";
import {
  Button,
  Chip,
  DataBoundary,
  EmptyState,
  ErrorNote,
  Field,
  PageHeader,
  Panel,
  SelectInput,
  StatusPill,
  TableWrap,
  Td,
  Th,
  TextArea,
  TextInput,
  formatDate,
} from "~/components/dashboard/ui";
import { RequireRole } from "~/components/dashboard/RequireRole";
import { useDashboard } from "~/lib/dashboardContext";
import { useMutation, useQuery } from "~/lib/useQuery";
import { createSubmission, listMySubmissions, type SubmissionRow } from "~/lib/db";
import { GUIDE_CATEGORIES, type GuideCategory } from "~/lib/roles";

export default function SubmitTab() {
  return (
    <RequireRole minimum="associate">
      <SubmitContent />
    </RequireRole>
  );
}

function SubmitContent() {
  const { user } = useDashboard();
  const submissions = useQuery(() => listMySubmissions(user.id), [user.id]);
  const rows = submissions.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Contribute"
        title="Submit content"
        description="Share a draft guide as a Google Doc link. An Officer in that category reviews it first, then a Director approves and awards hours."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem] items-start">
        <Panel
          title="Your submissions"
          description="Status updates here as reviewers move it along."
        >
          <DataBoundary loading={submissions.loading} error={submissions.error}>
            {rows.length === 0 ? (
              <EmptyState
                icon={Send}
                title="Nothing submitted yet."
                description="Draft the guide in Google Docs, set sharing to 'anyone with the link can comment', then paste the link beside this panel."
              />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Guide</Th>
                    <Th>Category</Th>
                    <Th>Status</Th>
                    <Th>Submitted</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <SubmissionRowView key={row.id} row={row} />
                  ))}
                </tbody>
              </TableWrap>
            )}
          </DataBoundary>
        </Panel>

        <SubmitForm userId={user.id} onSubmitted={submissions.reload} />
      </div>
    </>
  );
}

function SubmissionRowView({ row }: { row: SubmissionRow }) {
  return (
    <>
      <tr>
        <Td>
          <a
            href={row.doc_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-ink font-medium hover:text-pen transition-colors"
          >
            <span className="truncate max-w-[16rem]">{row.title}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0 text-ink-soft" />
          </a>
        </Td>
        <Td>
          <Chip tone="pen">{row.category}</Chip>
        </Td>
        <Td>
          <StatusPill status={row.status} />
        </Td>
        <Td className="text-ink-soft whitespace-nowrap">{formatDate(row.created_at)}</Td>
      </tr>
      {row.feedback && (
        <tr>
          <Td className="pt-0 pb-4" />
          <td colSpan={3} className="px-5 sm:px-6 pb-4 border-b border-rule">
            <div className="flex items-start gap-2.5 bg-paper-dim border border-rule rounded-lg p-3.5">
              <FileEdit className="w-4 h-4 text-pen shrink-0 mt-0.5" />
              <div>
                <p className="course-code text-[0.6rem] uppercase text-ink-soft mb-1">
                  Reviewer feedback
                </p>
                <p className="text-ink text-sm leading-relaxed whitespace-pre-wrap">
                  {row.feedback}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const DOC_URL_RE = /^https:\/\/(docs\.google\.com|drive\.google\.com)\//i;

function SubmitForm({ userId, onSubmitted }: { userId: string; onSubmitted: () => void }) {
  const [title, setTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [category, setCategory] = useState<GuideCategory>(GUIDE_CATEGORIES[0]);
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const { busy, error, setError, run } = useMutation();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setDone(false);
    if (title.trim().length < 4) {
      setError("Give the guide a title reviewers will recognize.");
      return;
    }
    if (!DOC_URL_RE.test(docUrl.trim())) {
      setError("Paste a Google Docs or Drive link (it should start with https://docs.google.com/).");
      return;
    }
    const ok = await run(() =>
      createSubmission({
        user_id: userId,
        title: title.trim(),
        doc_url: docUrl.trim(),
        category,
        notes: notes.trim() || null,
      }),
    );
    if (!ok) return;
    setTitle("");
    setDocUrl("");
    setNotes("");
    setDone(true);
    onSubmitted();
  }

  return (
    <Panel title="New submission" className="lg:sticky lg:top-24">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <ErrorNote message={error} />}
        {done && (
          <p className="flex items-start gap-2 text-sm text-ink bg-good/10 border border-good/30 rounded-lg px-3.5 py-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-good" />
            <span>Sent. It's now in the {category} Officer's queue.</span>
          </p>
        )}

        <Field label="Guide title" htmlFor="submit-title">
          <TextInput
            id="submit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="How to actually prep for AP CSA"
          />
        </Field>

        <Field
          label="Google Doc URL"
          htmlFor="submit-url"
          hint="Set sharing to 'anyone with the link can comment' so reviewers can leave notes."
        >
          <TextInput
            id="submit-url"
            type="url"
            value={docUrl}
            onChange={(e) => setDocUrl(e.target.value)}
            placeholder="https://docs.google.com/document/d/…"
          />
        </Field>

        <Field
          label="Category"
          htmlFor="submit-category"
          hint="This routes your draft — only the Officer for this category will see it."
        >
          <SelectInput
            id="submit-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as GuideCategory)}
          >
            {GUIDE_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field
          label="Notes for the Officer"
          htmlFor="submit-notes"
          hint="Optional — what you'd like them to look at hardest."
        >
          <TextArea
            id="submit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="min-h-[5rem]"
          />
        </Field>

        <Button type="submit" icon={Send} busy={busy} className="w-full">
          Submit for review
        </Button>
      </form>
    </Panel>
  );
}
