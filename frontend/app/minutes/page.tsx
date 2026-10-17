"use client";

import { useEffect, useState } from "react";
import ProtectedShell from "../../components/layout/ProtectedShell";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import {
  AttachmentInput,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  clean,
  formatDate,
  toDateInput,
} from "../../components/ui/Records";
import { apiClient, ApiError } from "../../lib/api/client";
import { hasRole } from "../../lib/auth";
import { SessionMinutes } from "../../lib/types";

const EMPTY = {
  sessionType: "REGULAR" as SessionMinutes["sessionType"],
  sessionNumber: "",
  sessionDate: "",
  venue: "SB Session Hall",
  presidingOfficer: "",
  summary: "",
  status: "DRAFT" as SessionMinutes["status"],
  dateApproved: "",
  transcript: "",
};

type FormState = typeof EMPTY;

// How often the list is refreshed while a recording is being transcribed.
const POLL_MS = 15000;

const isTranscribing = (m: SessionMinutes | null | undefined) =>
  m?.transcriptStatus === "PENDING" || m?.transcriptStatus === "PROCESSING";

export default function MinutesPage() {
  const isAdmin = hasRole("ADMIN");
  const [items, setItems] = useState<SessionMinutes[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SessionMinutes | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<SessionMinutes | null>(null);
  const [viewing, setViewing] = useState<SessionMinutes | null>(null);

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const list = await apiClient.get<SessionMinutes[]>("/minutes");
      setItems(list);
      // Keep an open form in step with transcription progress, without overwriting text being typed.
      setEditing((cur) => {
        const fresh = cur && list.find((m) => m._id === cur._id);
        if (!fresh) return cur;
        if (fresh.transcript && fresh.transcript !== cur.transcript) {
          setForm((f) => (f.transcript.trim() ? f : { ...f, transcript: fresh.transcript || "" }));
        }
        return fresh;
      });
    } catch {
      // leave list as is
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const anyTranscribing = items.some(isTranscribing);
  useEffect(() => {
    if (!anyTranscribing) return;
    const timer = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(timer);
  }, [anyTranscribing]);

  const openForm = (m: SessionMinutes | null) => {
    setEditing(m);
    setFile(null);
    setAudio(null);
    setError(null);
    setForm(
      m
        ? {
            sessionType: m.sessionType,
            sessionNumber: m.sessionNumber,
            sessionDate: toDateInput(m.sessionDate),
            venue: m.venue || "",
            presidingOfficer: m.presidingOfficer || "",
            summary: m.summary || "",
            status: m.status,
            dateApproved: toDateInput(m.dateApproved),
            transcript: m.transcript || "",
          }
        : EMPTY
    );
    setOpen(true);
  };

  const set = (field: keyof FormState, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { transcript, ...rest } = form;
      const payload: Record<string, any> = clean({ ...rest, dateApproved: form.status === "APPROVED" ? form.dateApproved : "" });
      // Only send the transcript when it was edited, so saving never wipes one that finished meanwhile.
      if (editing && transcript !== (editing.transcript || "")) payload.transcript = transcript.trim() || null;
      const saved = editing
        ? await apiClient.patch<SessionMinutes>(`/minutes/${editing._id}`, payload)
        : await apiClient.post<SessionMinutes>("/minutes", payload);
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        await apiClient.upload(`/minutes/${saved._id}/file`, fd);
      }
      if (audio) {
        const fd = new FormData();
        fd.append("file", audio);
        setUploadProgress(0);
        await apiClient.uploadWithProgress(`/minutes/${saved._id}/recording`, fd, setUploadProgress);
      }
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save minutes");
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const removeFile = async () => {
    if (!editing) return;
    const updated = await apiClient.delete<SessionMinutes>(`/minutes/${editing._id}/file`);
    setEditing(updated);
    load();
  };

  const removeRecording = async () => {
    if (!editing) return;
    const updated = await apiClient.delete<SessionMinutes>(`/minutes/${editing._id}/recording`);
    setEditing(updated);
    load(true);
  };

  const retranscribe = async () => {
    if (!editing) return;
    setError(null);
    try {
      const updated = await apiClient.post<SessionMinutes>(`/minutes/${editing._id}/recording/transcribe`);
      setEditing(updated);
      set("transcript", "");
      load(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start transcription");
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    await apiClient.delete(`/minutes/${toDelete._id}`).catch(() => {});
    setToDelete(null);
    load();
  };

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-[1200px]">
        <PageHeader
          title="Minutes of sessions"
          description="Approved and draft minutes of regular and special sessions."
          action={isAdmin && <PrimaryButton onClick={() => openForm(null)}>+ Add minutes</PrimaryButton>}
        />

        <section className="card mt-5 overflow-x-auto">
          {loading ? (
            <p className="px-4 py-10 text-center text-xs text-gray-500">Loading…</p>
          ) : items.length === 0 ? (
            <EmptyState
              title="No minutes yet"
              hint={isAdmin ? "Click “+ Add minutes” to record the first session." : "Minutes will appear here once the admin adds them."}
            />
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2 font-medium">Session</th>
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Presiding officer</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">File</th>
                  <th className="px-2 py-2 font-medium">Recording</th>
                  {isAdmin && <th className="px-4 py-2" />}
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m._id} className="border-t border-gray-100 align-top text-xs">
                    <td className="max-w-[320px] px-4 py-3">
                      <p className="font-semibold text-navy-900">
                        {m.sessionNumber} {m.sessionType === "SPECIAL" ? "Special" : "Regular"} Session
                      </p>
                      {m.venue && <p className="text-[11px] text-gray-500">{m.venue}</p>}
                      {m.summary && <p className="mt-1 line-clamp-2 text-[11px] text-gray-600">{m.summary}</p>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-navy-900">{formatDate(m.sessionDate)}</td>
                    <td className="px-2 py-3 text-navy-900">{m.presidingOfficer || "—"}</td>
                    <td className="px-2 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                          m.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {m.status === "APPROVED" ? "Approved" : "Draft"}
                      </span>
                      {m.dateApproved && <p className="mt-1 text-[11px] text-gray-500">{formatDate(m.dateApproved)}</p>}
                    </td>
                    <td className="px-2 py-3">
                      {m.attachment ? (
                        <a
                          href={apiClient.fileUrl(`/minutes/${m._id}/file`)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-navy-900 underline"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3">
                      <TranscriptBadge minutes={m} />
                      {m.transcript && (
                        <button onClick={() => setViewing(m)} className="block text-[11px] text-navy-900 underline">
                          Transcript
                        </button>
                      )}
                      {!m.recording && !m.transcript && <span className="text-gray-400">—</span>}
                    </td>
                    {isAdmin && (
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button onClick={() => openForm(m)} className="mr-3 text-[11px] text-navy-900 underline">
                          Edit
                        </button>
                        <button onClick={() => setToDelete(m)} className="text-[11px] text-red-600 underline">
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <Modal title={editing ? "Edit minutes" : "Add minutes of session"} open={open} onClose={() => setOpen(false)} wide>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Session type">
            <select value={form.sessionType} onChange={(e) => set("sessionType", e.target.value)} className="field-input">
              <option value="REGULAR">Regular session</option>
              <option value="SPECIAL">Special session</option>
            </select>
          </Field>
          <Field label="Session no." required>
            <input required value={form.sessionNumber} onChange={(e) => set("sessionNumber", e.target.value)} placeholder="e.g. 32nd" className="field-input" />
          </Field>
          <Field label="Session date" required>
            <input required type="date" value={form.sessionDate} onChange={(e) => set("sessionDate", e.target.value)} className="field-input" />
          </Field>
          <Field label="Venue">
            <input value={form.venue} onChange={(e) => set("venue", e.target.value)} className="field-input" />
          </Field>
          <Field label="Presiding officer" className="sm:col-span-2">
            <input value={form.presidingOfficer} onChange={(e) => set("presidingOfficer", e.target.value)} className="field-input" />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className="field-input">
              <option value="DRAFT">Draft</option>
              <option value="APPROVED">Approved</option>
            </select>
          </Field>
          {form.status === "APPROVED" && (
            <Field label="Date approved">
              <input type="date" value={form.dateApproved} onChange={(e) => set("dateApproved", e.target.value)} className="field-input" />
            </Field>
          )}
          <Field label="Summary / highlights" className="sm:col-span-3">
            <textarea
              rows={3}
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
              placeholder="Measures taken up, actions taken, etc."
              className="field-input resize-y"
            />
          </Field>
          <Field label="Signed minutes" className="sm:col-span-3">
            <AttachmentInput current={editing?.attachment} file={file} onFile={setFile} onRemoveCurrent={editing ? removeFile : undefined} />
          </Field>
          <Field label="Session recording (turned into text automatically)" className="sm:col-span-3">
            <RecordingInput
              minutes={editing}
              file={audio}
              onFile={setAudio}
              onRemoveCurrent={removeRecording}
              onRetranscribe={retranscribe}
            />
          </Field>
          {editing && (editing.recording || editing.transcript) && (
            <Field label="Transcript" className="sm:col-span-3">
              {isTranscribing(editing) && !form.transcript ? (
                <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-[11px] text-gray-600">
                  The recording is being turned into text. This can take a while for a long session. You can close this window;
                  the transcript will appear here when it is done.
                </p>
              ) : (
                <>
                  <textarea
                    rows={12}
                    value={form.transcript}
                    onChange={(e) => set("transcript", e.target.value)}
                    placeholder="No transcript yet."
                    className="field-input resize-y font-mono text-[11px] leading-relaxed"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Machine transcription: check names, numbers and local terms against the recording, and correct them here.
                  </p>
                </>
              )}
            </Field>
          )}
          {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-3">
            <SecondaryButton type="button" onClick={() => setOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {uploadProgress !== null
                ? `Uploading recording ${Math.round(uploadProgress * 100)}%`
                : saving
                  ? "Saving..."
                  : editing
                    ? "Save changes"
                    : "Add minutes"}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <Modal
        title={viewing ? `Transcript · ${viewing.sessionNumber} ${viewing.sessionType === "SPECIAL" ? "Special" : "Regular"} Session` : ""}
        open={!!viewing}
        onClose={() => setViewing(null)}
        wide
      >
        {viewing?.recording && (
          <audio controls preload="none" src={apiClient.fileUrl(`/minutes/${viewing._id}/recording`)} className="mb-3 w-full" />
        )}
        <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-xs leading-relaxed text-navy-900">
          {viewing?.transcript}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete minutes"
        message={`Delete the minutes of the ${toDelete?.sessionNumber} session? Any attached file and recording will also be deleted.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </ProtectedShell>
  );
}

function TranscriptBadge({ minutes }: { minutes: SessionMinutes }) {
  if (!minutes.recording) return null;
  const { transcriptStatus } = minutes;
  const [label, style] =
    transcriptStatus === "PENDING"
      ? ["Queued", "bg-gray-100 text-gray-700"]
      : transcriptStatus === "PROCESSING"
        ? ["Transcribing…", "bg-blue-50 text-blue-800"]
        : transcriptStatus === "FAILED"
          ? ["Failed", "bg-red-50 text-red-700"]
          : transcriptStatus === "DONE"
            ? ["Transcribed", "bg-emerald-100 text-emerald-800"]
            : ["Audio only", "bg-gray-100 text-gray-700"];
  return (
    <span className={`mb-1 inline-block rounded px-2 py-0.5 text-[11px] font-medium ${style}`} title={minutes.transcriptError || undefined}>
      {label}
    </span>
  );
}

// Audio picker for the session recording, with a player and transcription controls for one already uploaded.
function RecordingInput({
  minutes,
  file,
  onFile,
  onRemoveCurrent,
  onRetranscribe,
}: {
  minutes: SessionMinutes | null;
  file: File | null;
  onFile: (f: File | null) => void;
  onRemoveCurrent: () => void;
  onRetranscribe: () => void;
}) {
  const current = minutes?.recording;
  return (
    <div className="rounded-md border border-dashed border-gray-300 bg-navy-50/40 px-3 py-3 text-xs">
      {minutes && current && !file && (
        <div className="mb-2 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-navy-900">{current.originalFileName}</span>
              <TranscriptBadge minutes={minutes} />
            </span>
            <span className="flex gap-3">
              {!isTranscribing(minutes) && (
                <button type="button" onClick={onRetranscribe} className="text-[11px] text-navy-900 underline">
                  {minutes.transcriptStatus === "FAILED" ? "Try again" : "Transcribe again"}
                </button>
              )}
              <button type="button" onClick={onRemoveCurrent} className="text-[11px] text-red-600 underline">
                Remove recording
              </button>
            </span>
          </div>
          {minutes.transcriptStatus === "FAILED" && minutes.transcriptError && (
            <p className="text-[11px] text-red-600">{minutes.transcriptError}</p>
          )}
          <audio controls preload="none" src={apiClient.fileUrl(`/minutes/${minutes._id}/recording`)} className="w-full" />
        </div>
      )}
      {file && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="truncate text-navy-900">{file.name}</span>
          <button type="button" onClick={() => onFile(null)} className="text-[11px] text-gray-500 underline">
            Clear
          </button>
        </div>
      )}
      <label className="inline-block cursor-pointer rounded border border-gray-300 bg-white px-2 py-1 text-[11px] text-navy-900 hover:bg-gray-50">
        {current || file ? "Replace recording" : "Choose recording"}
        <input
          type="file"
          accept="audio/*,video/*,.mp3,.m4a,.wav,.aac,.ogg,.opus,.amr,.flac,.wma"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0] || null);
            e.target.value = "";
          }}
        />
      </label>
      <span className="ml-2 text-[11px] text-gray-500">MP3, M4A, WAV, etc. · up to 200 MB · replacing it re-transcribes</span>
    </div>
  );
}
