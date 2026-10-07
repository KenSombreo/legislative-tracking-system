"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DocumentType,
  DOCUMENT_TYPE_LABELS,
  getRelevantFieldsForType,
} from "../../lib/config/legislationFields";
import { apiClient, ApiError } from "../../lib/api/client";
import { Legislation, DocumentFile } from "../../lib/types";
import DocumentUpload from "../documents/DocumentUpload";
import DocumentList from "../documents/DocumentList";

function toDateInputValue(value: string | null | undefined) {
  if (!value) return "";
  return value.substring(0, 10);
}

export default function LegislationForm({
  documentType,
  initial,
  legislationId,
}: {
  documentType: DocumentType;
  initial?: Partial<Legislation>;
  legislationId?: string;
}) {
  const router = useRouter();
  const isEdit = !!legislationId;
  const fields = getRelevantFieldsForType(documentType);
  const [recordId, setRecordId] = useState<string | null>(legislationId || null);
  const [documents, setDocuments] = useState<DocumentFile[]>(
    isEdit && Array.isArray(initial?.documents) ? (initial!.documents as DocumentFile[]).filter((d) => typeof d === "object") : []
  );

  const [form, setForm] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {
      documentNumber: initial?.documentNumber || "",
      year: initial?.year ? String(initial.year) : String(new Date().getFullYear()),
      title: initial?.title || "",
    };
    for (const f of fields) {
      const raw = (initial as any)?.[f.field];
      base[f.field] = f.type === "date" ? toDateInputValue(raw) : raw || "";
    }
    return base;
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload: Record<string, any> = {
      documentType,
      documentNumber: form.documentNumber,
      year: parseInt(form.year, 10),
      title: form.title,
    };
    for (const f of fields) {
      const value = form[f.field];
      if (value === "" || value === undefined) continue;
      payload[f.field] = value;
    }

    try {
      if (recordId) {
        await apiClient.patch(`/legislation/${recordId}`, payload);
        router.push(`/legislation/${recordId}`);
      } else {
        const created = await apiClient.post<Legislation>("/legislation", payload);
        setRecordId(created._id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save legislation");
    } finally {
      setSaving(false);
    }
  };

  const refreshDocuments = async () => {
    if (!recordId) return;
    const res = await apiClient.get<Legislation>(`/legislation/${recordId}`);
    setDocuments((res.documents as DocumentFile[]).filter((d) => typeof d === "object"));
  };

  const handleDeleteDoc = async (doc: DocumentFile) => {
    await apiClient.delete(`/documents/${doc._id}`);
    refreshDocuments();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {DOCUMENT_TYPE_LABELS[documentType]}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Document Number <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={form.documentNumber}
            onChange={(e) => update("documentNumber", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Year <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="number"
            value={form.year}
            onChange={(e) => update("year", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {fields.map((f) => (
          <div key={f.field} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
            <label className="block text-sm font-medium text-gray-700">
              {f.label} {f.required && <span className="text-red-500">*</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea
                required={f.required}
                value={form[f.field] || ""}
                onChange={(e) => update(f.field, e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            ) : (
              <input
                required={f.required}
                type={f.type === "date" ? "date" : "text"}
                value={form[f.field] || ""}
                onChange={(e) => update(f.field, e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-50"
        >
          {saving ? "Saving..." : recordId ? "Save Changes" : "Create"}
        </button>
      </div>

      {recordId && (
        <div className="border-t border-gray-200 pt-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Upload Documents
          </h2>
          <div className="mb-4">
            <DocumentUpload legislativeDocumentId={recordId} onUploaded={refreshDocuments} />
          </div>
          <DocumentList documents={documents} onDelete={handleDeleteDoc} />
          {!isEdit && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => router.push(`/legislation/${recordId}`)}
                className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900"
              >
                Done — View Record
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
