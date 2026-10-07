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
};

type FormState = typeof EMPTY;

export default function MinutesPage() {
  const isAdmin = hasRole("ADMIN");
  const [items, setItems] = useState<SessionMinutes[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SessionMinutes | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<SessionMinutes | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await apiClient.get<SessionMinutes[]>("/minutes"));
    } catch {
      // leave list empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openForm = (m: SessionMinutes | null) => {
    setEditing(m);
    setFile(null);
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
      const payload = clean({ ...form, dateApproved: form.status === "APPROVED" ? form.dateApproved : "" });
      const saved = editing
        ? await apiClient.patch<SessionMinutes>(`/minutes/${editing._id}`, payload)
        : await apiClient.post<SessionMinutes>("/minutes", payload);
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        await apiClient.upload(`/minutes/${saved._id}/file`, fd);
      }
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save minutes");
    } finally {
      setSaving(false);
    }
  };

  const removeFile = async () => {
    if (!editing) return;
    const updated = await apiClient.delete<SessionMinutes>(`/minutes/${editing._id}/file`);
    setEditing(updated);
    load();
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
          {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-3">
            <SecondaryButton type="button" onClick={() => setOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Add minutes"}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete minutes"
        message={`Delete the minutes of the ${toDelete?.sessionNumber} session? Any attached file will also be deleted.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </ProtectedShell>
  );
}
