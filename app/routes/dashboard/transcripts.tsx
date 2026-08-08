/*
  Transcript Hub — drag-and-drop upload into a private Supabase Storage
  bucket, plus a pointer at the manual course-entry fallback.

  Files are never public: the bucket is private and downloads go through a
  short-lived signed URL minted on click.
*/

import { useRef, useState } from "react";
import { Link } from "react-router";
import {
  Download,
  FileText,
  Keyboard,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  Button,
  DataBoundary,
  EmptyState,
  ErrorNote,
  Field,
  PageHeader,
  Panel,
  TableWrap,
  Td,
  Th,
  TextArea,
  formatDate,
} from "~/components/dashboard/ui";
import { useDashboard } from "~/lib/dashboardContext";
import { useMutation, useQuery } from "~/lib/useQuery";
import {
  deleteTranscript,
  listTranscripts,
  transcriptUrl,
  uploadTranscript,
  type TranscriptRow,
} from "~/lib/db";
import { errorMessage } from "~/lib/supabase";

const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.webp,.heic";
const MAX_BYTES = 10 * 1024 * 1024;

export default function TranscriptsTab() {
  const { user } = useDashboard();
  const transcripts = useQuery(() => listTranscripts(user.id), [user.id]);
  const rows = transcripts.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Personal"
        title="Transcripts"
        description="Upload a PDF or a photo of your transcript, or skip the file entirely and type your courses in by hand."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] items-start">
        <Panel
          title="Uploaded files"
          description="Stored privately. Download links expire an hour after you click them."
        >
          <DataBoundary loading={transcripts.loading} error={transcripts.error}>
            {rows.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Nothing uploaded yet."
                description="Drop a file into the panel beside this one, or enter your courses manually instead."
              />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>File</Th>
                    <Th>Note</Th>
                    <Th>Uploaded</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <TranscriptRowView key={row.id} row={row} onChanged={transcripts.reload} />
                  ))}
                </tbody>
              </TableWrap>
            )}
          </DataBoundary>
        </Panel>

        <div className="space-y-6">
          <UploadPanel userId={user.id} onUploaded={transcripts.reload} />

          <Panel title="No file handy?">
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-pen/10 text-pen shrink-0">
                <Keyboard className="w-4 h-4" />
              </span>
              <div>
                <p className="text-ink-soft text-sm leading-relaxed mb-4">
                  Type courses in one at a time instead. It takes a few minutes and gives you a
                  live GPA that an uploaded PDF can't.
                </p>
                <Link
                  to="/dashboard/academics"
                  className="inline-flex items-center px-3.5 py-2 border border-rule hover:border-pen rounded-lg text-sm font-semibold text-ink transition-colors"
                >
                  Enter courses manually
                </Link>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function TranscriptRowView({ row, onChanged }: { row: TranscriptRow; onChanged: () => void }) {
  const { busy, run } = useMutation();
  const [linkError, setLinkError] = useState("");

  async function openFile() {
    try {
      const url = await transcriptUrl(row.file_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setLinkError(errorMessage(error, "Couldn't open that file."));
    }
  }

  return (
    <tr>
      <Td>
        <span className="flex items-center gap-2 text-ink font-medium">
          <FileText className="w-4 h-4 text-ink-soft shrink-0" />
          <span className="truncate max-w-[16rem]">{row.file_name}</span>
        </span>
        {linkError && <span className="block text-flag text-xs mt-1">{linkError}</span>}
      </Td>
      <Td className="text-ink-soft">{row.note || "—"}</Td>
      <Td className="text-ink-soft whitespace-nowrap">{formatDate(row.uploaded_at)}</Td>
      <Td className="text-right whitespace-nowrap">
        <button
          type="button"
          onClick={openFile}
          className="p-1.5 text-ink-soft hover:text-pen transition-colors rounded"
          aria-label={`Open ${row.file_name}`}
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (await run(() => deleteTranscript(row))) onChanged();
          }}
          className="p-1.5 text-ink-soft hover:text-flag transition-colors rounded disabled:opacity-50"
          aria-label={`Delete ${row.file_name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </Td>
    </tr>
  );
}

function UploadPanel({ userId, onUploaded }: { userId: string; onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const { busy, error, setError, run } = useMutation();

  function accept(candidate: File | undefined) {
    if (!candidate) return;
    if (candidate.size > MAX_BYTES) {
      setError("That file is over 10 MB. Compress it or export a smaller PDF.");
      return;
    }
    setError(null);
    setFile(candidate);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Pick a file first.");
      return;
    }
    const ok = await run(() => uploadTranscript(userId, file, note.trim()));
    if (!ok) return;
    setFile(null);
    setNote("");
    if (inputRef.current) inputRef.current.value = "";
    onUploaded();
  }

  return (
    <Panel title="Upload a transcript">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <ErrorNote message={error} />}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            accept(e.dataTransfer.files?.[0]);
          }}
          className={`rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors ${
            dragging ? "border-pen bg-pen/5" : "border-rule bg-paper-dim"
          }`}
        >
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-pen/10 text-pen mb-3">
            <UploadCloud className="w-5 h-5" />
          </span>
          <p className="text-ink text-sm font-semibold">
            {file ? file.name : "Drop your transcript here"}
          </p>
          <p className="text-ink-soft text-xs mt-1.5 leading-relaxed">
            {file
              ? `${(file.size / 1024 / 1024).toFixed(2)} MB — ready to upload`
              : "PDF or image, up to 10 MB"}
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 px-3.5 py-2 border border-rule bg-paper hover:border-pen rounded-lg text-sm font-semibold text-ink transition-colors"
          >
            {file ? "Choose a different file" : "Browse files"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="sr-only"
            onChange={(e) => accept(e.target.files?.[0])}
          />
        </div>

        <Field label="Note" htmlFor="transcript-note" hint="Optional — e.g. 'through junior fall'.">
          <TextArea
            id="transcript-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="min-h-[4rem]"
          />
        </Field>

        <Button type="submit" icon={UploadCloud} busy={busy} disabled={!file} className="w-full">
          Upload transcript
        </Button>
      </form>
    </Panel>
  );
}
