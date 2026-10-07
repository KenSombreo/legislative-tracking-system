"use client";

import { useEffect, useState } from "react";
import ProtectedShell from "../../components/layout/ProtectedShell";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import {
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
import { SbMember } from "../../lib/types";

const POSITIONS = [
  "Vice Mayor / Presiding Officer",
  "SB Member",
  "Liga ng mga Barangay President",
  "SK Federation President",
  "IPMR",
  "SB Secretary",
];

const EMPTY = {
  fullName: "",
  position: POSITIONS[1],
  committees: "",
  contactNumber: "",
  email: "",
  termStart: "",
  termEnd: "",
  isActive: true,
  sortOrder: "0",
};

type FormState = typeof EMPTY;

export default function MembersPage() {
  const isAdmin = hasRole("ADMIN");
  const [items, setItems] = useState<SbMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SbMember | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<SbMember | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await apiClient.get<SbMember[]>("/sb-members"));
    } catch {
      // leave list empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openForm = (m: SbMember | null) => {
    setEditing(m);
    setError(null);
    setForm(
      m
        ? {
            fullName: m.fullName,
            position: m.position,
            committees: m.committees.join(", "),
            contactNumber: m.contactNumber || "",
            email: m.email || "",
            termStart: toDateInput(m.termStart),
            termEnd: toDateInput(m.termEnd),
            isActive: m.isActive,
            sortOrder: String(m.sortOrder ?? 0),
          }
        : EMPTY
    );
    setOpen(true);
  };

  const set = (field: keyof FormState, value: string | boolean) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = clean({
      ...form,
      committees: form.committees
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      sortOrder: parseInt(form.sortOrder, 10) || 0,
    });
    try {
      if (editing) await apiClient.patch(`/sb-members/${editing._id}`, payload);
      else await apiClient.post("/sb-members", payload);
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save member");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    await apiClient.delete(`/sb-members/${toDelete._id}`).catch(() => {});
    setToDelete(null);
    load();
  };

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-[1200px]">
        <PageHeader
          title="SB members"
          description="Members of the Sangguniang Bayan, their positions and committee assignments."
          action={isAdmin && <PrimaryButton onClick={() => openForm(null)}>+ Add member</PrimaryButton>}
        />

        <section className="card mt-5 overflow-x-auto">
          {loading ? (
            <p className="px-4 py-10 text-center text-xs text-gray-500">Loading…</p>
          ) : items.length === 0 ? (
            <EmptyState
              title="No SB members yet"
              hint={isAdmin ? "Click “+ Add member” to add the first member." : "Members will appear here once the admin adds them."}
            />
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Position</th>
                  <th className="px-2 py-2 font-medium">Committees</th>
                  <th className="px-2 py-2 font-medium">Contact</th>
                  <th className="px-2 py-2 font-medium">Term</th>
                  {isAdmin && <th className="px-4 py-2" />}
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m._id} className="border-t border-gray-100 align-top text-xs">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy-900">Hon. {m.fullName}</p>
                      {!m.isActive && <span className="text-[11px] text-gray-500">Inactive</span>}
                    </td>
                    <td className="px-2 py-3 text-navy-900">{m.position}</td>
                    <td className="px-2 py-3">
                      <div className="flex flex-wrap gap-1">
                        {m.committees.length === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          m.committees.map((c) => (
                            <span key={c} className="rounded bg-navy-50 px-1.5 py-0.5 text-[11px] text-navy-900">
                              {c}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-gray-600">
                      <p>{m.contactNumber || "—"}</p>
                      {m.email && <p className="text-[11px]">{m.email}</p>}
                    </td>
                    <td className="px-2 py-3 text-gray-600">
                      {m.termStart || m.termEnd
                        ? `${formatDate(m.termStart, { year: "numeric" })} – ${formatDate(m.termEnd, { year: "numeric" })}`
                        : "—"}
                    </td>
                    {isAdmin && (
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button onClick={() => openForm(m)} className="mr-3 text-[11px] text-navy-900 underline">
                          Edit
                        </button>
                        <button onClick={() => setToDelete(m)} className="text-[11px] text-red-600 underline">
                          Remove
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

      <Modal title={editing ? "Edit SB member" : "Add SB member"} open={open} onClose={() => setOpen(false)}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" required className="sm:col-span-2">
            <input required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="e.g. Juan Dela Cruz" className="field-input" />
          </Field>
          <Field label="Position" required>
            <input
              required
              list="positions"
              value={form.position}
              onChange={(e) => set("position", e.target.value)}
              className="field-input"
            />
            <datalist id="positions">
              {POSITIONS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <Field label="Display order">
            <input type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} className="field-input" />
          </Field>
          <Field label="Committees" className="sm:col-span-2">
            <input
              value={form.committees}
              onChange={(e) => set("committees", e.target.value)}
              placeholder="Separate with commas, e.g. Appropriations, Environment Protection"
              className="field-input"
            />
          </Field>
          <Field label="Contact number">
            <input value={form.contactNumber} onChange={(e) => set("contactNumber", e.target.value)} className="field-input" />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="field-input" />
          </Field>
          <Field label="Term start">
            <input type="date" value={form.termStart} onChange={(e) => set("termStart", e.target.value)} className="field-input" />
          </Field>
          <Field label="Term end">
            <input type="date" value={form.termEnd} onChange={(e) => set("termEnd", e.target.value)} className="field-input" />
          </Field>
          <label className="flex items-center gap-2 text-xs text-navy-900 sm:col-span-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
            Currently serving
          </label>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <SecondaryButton type="button" onClick={() => setOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Add member"}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Remove SB member"
        message={`Remove ${toDelete?.fullName} from the list?`}
        confirmLabel="Remove"
        danger
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </ProtectedShell>
  );
}
