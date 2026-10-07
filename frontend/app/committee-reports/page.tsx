"use client";

import { useEffect, useMemo, useState } from "react";
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
import { CommitteeReport, SbMember } from "../../lib/types";

const RECOMMENDATIONS = [
  "For approval",
  "For approval with amendments",
  "For further study",
  "For disapproval",
];

const EMPTY = {
  reportNumber: "",
  committee: "",
  title: "",
  dateSubmitted: "",
  relatedMeasure: "",
  recommendation: "",
  summary: "",
};

type FormState = typeof EMPTY;

export default function CommitteeReportsPage() {
  const isAdmin = hasRole("ADMIN");
  const [items, setItems] = useState<CommitteeReport[]>([]);
  const [committees, setCommittees] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CommitteeReport | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<CommitteeReport | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await apiClient.get<CommitteeReport[]>("/committee-reports"));
    } catch {
      // leave list empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Committee names already assigned to SB members, offered as suggestions.
    apiClient
      .get<SbMember[]>("/sb-members")
      .then((members) => setCommittees(Array.from(new Set(members.flatMap((m) => m.committees))).sort()))
      .catch(() => {});
  }, []);

  const committeeOptions = useMemo(
    () => Array.from(new Set([...committees, ...items.map((i) => i.committee)])).sort(),
    [committees, items]
  );
  const shown = filter ? items.filter((i) => i.committee === filter) : items;

  const openForm = (r: CommitteeReport | null) => {
    setEditing(r);
    setFile(null);
    setError(null);
    setForm(
      r
        ? {
            reportNumber: r.reportNumber,
            committee: r.committee,
            title: r.title,
            dateSubmitted: toDateInput(r.dateSubmitted),
            relatedMeasure: r.relatedMeasure || "",
            recommendation: r.recommendation || "",
            summary: r.summary || "",
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
      const payload = clean(form);
      const saved = editing
        ? await apiClient.patch<CommitteeReport>(`/committee-reports/${editing._id}`, payload)
        : await apiClient.post<CommitteeReport>("/committee-reports", payload);
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        await apiClient.upload(`/committee-reports/${saved._id}/file`, fd);
      }
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  const removeFile = async () => {
    if (!editing) return;
    setEditing(await apiClient.delete<CommitteeReport>(`/committee-reports/${editing._id}/file`));
    load();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    await apiClient.delete(`/committee-reports/${toDelete._id}`).catch(() => {});
    setToDelete(null);
    load();
  };

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-[1200px]">
        <PageHeader
          title="Committee reports"
          description="Reports submitted by the standing committees on measures referred to them."
          action={isAdmin && <PrimaryButton onClick={() => openForm(null)}>+ Add report</PrimaryButton>}
        />

        <section className="card mt-5">
          {items.length > 0 && (
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 text-xs">
              <span className="text-gray-500">Committee</span>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-xs">
                <option value="">All committees</option>
                {committeeOptions.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
          <div className="overflow-x-auto">
            {loading ? (
              <p className="px-4 py-10 text-center text-xs text-gray-500">Loading…</p>
            ) : shown.length === 0 ? (
              <EmptyState
                title={items.length === 0 ? "No committee reports yet" : "No reports for this committee"}
                hint={
                  items.length === 0
                    ? isAdmin
                      ? "Click “+ Add report” to add the first committee report."
                      : "Reports will appear here once the admin adds them."
                    : undefined
                }
              />
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2 font-medium">Report</th>
                    <th className="px-2 py-2 font-medium">Committee</th>
                    <th className="px-2 py-2 font-medium">Measure</th>
                    <th className="px-2 py-2 font-medium">Recommendation</th>
                    <th className="px-2 py-2 font-medium">Submitted</th>
                    <th className="px-2 py-2 font-medium">File</th>
                    {isAdmin && <th className="px-4 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r._id} className="border-t border-gray-100 align-top text-xs">
                      <td className="max-w-[280px] px-4 py-3">
                        <span className="inline-block border border-navy-600 px-1 font-mono text-[11px] text-navy-900">
                          Committee Report No. {r.reportNumber}
                        </span>
                        <p className="mt-1 leading-snug text-navy-900">{r.title}</p>
                      </td>
                      <td className="px-2 py-3 text-navy-900">{r.committee}</td>
                      <td className="px-2 py-3 font-mono text-[11px] text-navy-900">{r.relatedMeasure || "—"}</td>
                      <td className="px-2 py-3 text-navy-900">{r.recommendation || "—"}</td>
                      <td className="whitespace-nowrap px-2 py-3 text-navy-900">{formatDate(r.dateSubmitted)}</td>
                      <td className="px-2 py-3">
                        {r.attachment ? (
                          <a
                            href={apiClient.fileUrl(`/committee-reports/${r._id}/file`)}
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
                          <button onClick={() => openForm(r)} className="mr-3 text-[11px] text-navy-900 underline">
                            Edit
                          </button>
                          <button onClick={() => setToDelete(r)} className="text-[11px] text-red-600 underline">
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <Modal title={editing ? "Edit committee report" : "Add committee report"} open={open} onClose={() => setOpen(false)} wide>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Report no." required>
            <input required value={form.reportNumber} onChange={(e) => set("reportNumber", e.target.value)} placeholder={`e.g. ${new Date().getFullYear()}-05`} className="field-input" />
          </Field>
          <Field label="Committee" required className="sm:col-span-2">
            <input required list="committees" value={form.committee} onChange={(e) => set("committee", e.target.value)} placeholder="e.g. Committee on Education" className="field-input" />
            <datalist id="committees">
              {committeeOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Title" required className="sm:col-span-3">
            <input required value={form.title} onChange={(e) => set("title", e.target.value)} className="field-input" />
          </Field>
          <Field label="Related measure">
            <input value={form.relatedMeasure} onChange={(e) => set("relatedMeasure", e.target.value)} placeholder="e.g. Ord. No. 2026-07" className="field-input" />
          </Field>
          <Field label="Recommendation">
            <input list="recommendations" value={form.recommendation} onChange={(e) => set("recommendation", e.target.value)} className="field-input" />
            <datalist id="recommendations">
              {RECOMMENDATIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </Field>
          <Field label="Date submitted">
            <input type="date" value={form.dateSubmitted} onChange={(e) => set("dateSubmitted", e.target.value)} className="field-input" />
          </Field>
          <Field label="Summary" className="sm:col-span-3">
            <textarea rows={3} value={form.summary} onChange={(e) => set("summary", e.target.value)} className="field-input resize-y" />
          </Field>
          <Field label="Signed report" className="sm:col-span-3">
            <AttachmentInput current={editing?.attachment} file={file} onFile={setFile} onRemoveCurrent={editing ? removeFile : undefined} />
          </Field>
          {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-3">
            <SecondaryButton type="button" onClick={() => setOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Add report"}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete committee report"
        message={`Delete Committee Report No. ${toDelete?.reportNumber}? Any attached file will also be deleted.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </ProtectedShell>
  );
}
