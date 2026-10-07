"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Landmark, Upload, X } from "lucide-react";
import { apiClient, ApiError } from "../../../lib/api/client";
import { getUser, isAuthenticated } from "../../../lib/auth";
import { Legislation } from "../../../lib/types";
import { DocumentType } from "../../../lib/config/legislationFields";

const TYPE_OPTIONS: { label: string; type: DocumentType | null }[] = [
  { label: "Ordinance", type: DocumentType.ORDINANCE },
  { label: "Resolution", type: DocumentType.RESOLUTION },
  { label: "Appropriation ordinance", type: DocumentType.APPROPRIATION_ORDINANCE },
  { label: "Executive order", type: null },
  { label: "Minutes of session", type: null },
  { label: "Committee report", type: null },
  { label: "Other", type: null },
];

const NUMBER_LABEL: Record<DocumentType, string> = {
  [DocumentType.ORDINANCE]: "Ordinance No.",
  [DocumentType.RESOLUTION]: "Resolution No.",
  [DocumentType.APPROPRIATION_ORDINANCE]: "Appropriation Ord. No.",
};

// The three date fields required by the backend for each document type.
const DATE_FIELDS: Record<DocumentType, { field: string; label: string }[]> = {
  [DocumentType.ORDINANCE]: [
    { field: "dateEnacted", label: "Date enacted" },
    { field: "dateApprovedByLCE", label: "Date approved (LCE)" },
    { field: "dateEnactedApprovedBySP", label: "Date approved by SP" },
  ],
  [DocumentType.RESOLUTION]: [
    { field: "dateAdopted", label: "Date adopted" },
    { field: "dateApprovedByLCE", label: "Date approved (LCE)" },
  ],
  [DocumentType.APPROPRIATION_ORDINANCE]: [
    { field: "dateEnacted", label: "Date enacted" },
    { field: "dateApprovedByLCE", label: "Date approved (LCE)" },
    { field: "dateEnactedApprovedBySP", label: "Date approved by SP" },
  ],
};

const SESSION_TYPES = ["Regular session", "Special session"];
const MAX_FILE_BYTES = 25 * 1024 * 1024;

interface Option {
  _id: string;
  name: string;
  code?: string;
  documentTypes: string[];
  isActive: boolean;
}

export default function UploadDocumentPage() {
  return (
    <Suspense fallback={null}>
      <UploadDocumentInner />
    </Suspense>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="card px-5 pb-5 pt-1">
      <legend className="px-1 text-xs font-semibold text-navy-900">
        {n}. {title}
      </legend>
      {children}
    </fieldset>
  );
}

function UploadDocumentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInput = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const user = ready ? getUser() : null;
  const isAdmin = user?.role === "ADMIN";

  const presetType = searchParams.get("type") as DocumentType | null;
  const [docType, setDocType] = useState<DocumentType>(
    presetType && Object.values(DocumentType).includes(presetType) ? presetType : DocumentType.ORDINANCE
  );
  const [classifications, setClassifications] = useState<Option[]>([]);
  const [statuses, setStatuses] = useState<Option[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState<Record<string, string>>({
    documentNumber: "",
    year: String(currentYear),
    title: "",
    author: "",
    coAuthors: "",
    committee: "",
    classification: "",
    sessionType: SESSION_TYPES[0],
    sessionNo: "",
    status: "",
    summary: "",
    keywords: "",
  });
  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    setReady(true);
    Promise.all([apiClient.get<Option[]>("/classifications"), apiClient.get<Option[]>("/statuses")])
      .then(([c, s]) => {
        setClassifications(c.filter((x) => x.isActive !== false));
        setStatuses(s.filter((x) => x.isActive !== false));
      })
      .catch(() => {});
  }, [router]);

  const forType = (list: Option[]) => list.filter((o) => !o.documentTypes?.length || o.documentTypes.includes(docType));
  const typeStatuses = forType(statuses);
  const typeClassifications = forType(classifications);
  const needsClassification = docType !== DocumentType.APPROPRIATION_ORDINANCE;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const accepted: File[] = [];
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE_BYTES) {
        setError(`${f.name} is larger than 25 MB.`);
        continue;
      }
      accepted.push(f);
    }
    setFiles((prev) => [...prev, ...accepted]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    // Fields the backend has no column for are kept in remarks so nothing entered is lost.
    const remarks = [
      form.summary.trim(),
      form.coAuthors && `Co-authors: ${form.coAuthors}`,
      form.committee && `Committee referred: ${form.committee}`,
      `Session: ${form.sessionType}${form.sessionNo ? ` (${form.sessionNo})` : ""}`,
      form.keywords && `Keywords: ${form.keywords}`,
    ]
      .filter(Boolean)
      .join("\n");

    const payload: Record<string, any> = {
      documentType: docType,
      documentNumber: form.documentNumber.trim(),
      year: parseInt(form.year, 10),
      title: form.title.trim(),
      status: form.status,
      remarks,
      [docType === DocumentType.RESOLUTION ? "sponsor" : "author"]: form.author.trim(),
    };
    if (needsClassification) payload.classification = form.classification;
    for (const d of DATE_FIELDS[docType]) {
      if (form[d.field]) payload[d.field] = form[d.field];
    }

    try {
      const created = await apiClient.post<Legislation>("/legislation", payload);
      for (const [idx, file] of files.entries()) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("legislativeDocumentId", created._id);
        fd.append("documentCategory", idx === 0 ? "MAIN_DOCUMENT" : "SUPPORTING_DOCUMENT");
        await apiClient.upload("/documents/upload", fd);
      }
      router.push(`/legislation/${created._id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to upload document");
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper">
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  const numberLabel = NUMBER_LABEL[docType];
  const dateFields = DATE_FIELDS[docType];

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between bg-navy-900 px-6 py-3 text-white">
        <Link href="/dashboard" className="leading-tight">
          <span className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-gray-200" />
            <span className="font-serif text-sm font-semibold">SB Liloan</span>
          </span>
          <span className="block pl-6 text-[11px] text-gray-400">Southern Leyte · Legislative Records</span>
        </Link>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-semibold text-navy-950">
            {isAdmin ? "Admin" : "User"}
          </span>
          <span className="text-gray-200">{user?.fullName}</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-6">
        <Link href="/dashboard" className="text-[11px] text-gray-600 hover:text-navy-900">
          ← Back to records
        </Link>
        <h1 className="mt-4 font-serif text-2xl font-semibold text-navy-900">Upload a legislative document</h1>
        <p className="mt-1 text-xs text-gray-600">
          Fill in the details below and attach the signed copy. Uploads by users go to the SB Secretary for approval
          before they appear in the public records.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_240px]">
          <div className="space-y-5">
            <Section n={1} title="Document type">
              <div className="mt-2 flex flex-wrap gap-2">
                {TYPE_OPTIONS.map((opt) => {
                  const active = opt.type === docType;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      disabled={!opt.type}
                      title={opt.type ? undefined : "Not yet supported"}
                      onClick={() => opt.type && setDocType(opt.type)}
                      className={`rounded-md border px-3 py-2 text-xs ${
                        active
                          ? "border-navy-900 bg-navy-900 font-semibold text-white"
                          : "border-gray-300 bg-white text-navy-900 hover:border-navy-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section n={2} title="Basic details">
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="field-label">{numberLabel} *</label>
                  <input
                    required
                    value={form.documentNumber}
                    onChange={(e) => update("documentNumber", e.target.value)}
                    placeholder={`e.g. ${currentYear}-09`}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Series of</label>
                  <select value={form.year} onChange={(e) => update("year", e.target.value)} className="field-input">
                    {Array.from({ length: 30 }, (_, i) => currentYear + 1 - i).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="field-label">Title *</label>
                  <textarea
                    required
                    rows={2}
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="e.g. An Ordinance regulating ... in the Municipality of Liloan, Southern Leyte"
                    className="field-input resize-y"
                  />
                </div>
                <div>
                  <label className="field-label">{docType === DocumentType.RESOLUTION ? "Sponsor" : "Author / Sponsor"} *</label>
                  <input
                    required
                    value={form.author}
                    onChange={(e) => update("author", e.target.value)}
                    placeholder="SB member name"
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Co-authors</label>
                  <input
                    value={form.coAuthors}
                    onChange={(e) => update("coAuthors", e.target.value)}
                    placeholder="Separate names with commas"
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Committee referred</label>
                  <input
                    value={form.committee}
                    onChange={(e) => update("committee", e.target.value)}
                    placeholder="e.g. Appropriations"
                    className="field-input"
                  />
                </div>
                {needsClassification && (
                  <div>
                    <label className="field-label">Subject / category *</label>
                    <select
                      required
                      value={form.classification}
                      onChange={(e) => update("classification", e.target.value)}
                      className="field-input"
                    >
                      <option value="">Select category...</option>
                      {typeClassifications.map((c) => (
                        <option key={c._id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </Section>

            <Section n={3} title="Session & status">
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="field-label">Session type</label>
                  <select value={form.sessionType} onChange={(e) => update("sessionType", e.target.value)} className="field-input">
                    {SESSION_TYPES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Session no.</label>
                  <input
                    value={form.sessionNo}
                    onChange={(e) => update("sessionNo", e.target.value)}
                    placeholder="e.g. 32nd"
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Status *</label>
                  <select required value={form.status} onChange={(e) => update("status", e.target.value)} className="field-input">
                    <option value="">Select status...</option>
                    {typeStatuses.map((s) => (
                      <option key={s._id} value={s.code || s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                {dateFields.map((d) => (
                  <div key={d.field}>
                    <label className="field-label">{d.label} *</label>
                    <input
                      required
                      type="date"
                      value={form[d.field] || ""}
                      onChange={(e) => update(d.field, e.target.value)}
                      className="field-input"
                    />
                  </div>
                ))}
                <div className="sm:col-span-3">
                  <label className="field-label">Summary / abstract</label>
                  <textarea
                    rows={3}
                    value={form.summary}
                    onChange={(e) => update("summary", e.target.value)}
                    placeholder="Short description of what this document provides or requests"
                    className="field-input resize-y"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="field-label">Keywords</label>
                  <input
                    value={form.keywords}
                    onChange={(e) => update("keywords", e.target.value)}
                    placeholder="e.g. plastics, environment, barangay"
                    className="field-input"
                  />
                </div>
              </div>
            </Section>

            <Section n={4} title="Files">
              <div
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-12 text-center ${
                  dragOver ? "border-navy-700 bg-navy-50" : "border-gray-300 bg-navy-50/40"
                }`}
              >
                <Upload className="h-5 w-5 text-navy-900" />
                <p className="mt-3 text-xs font-semibold text-navy-900">Drop the signed document here or click to browse</p>
                <p className="mt-1 text-[11px] text-gray-500">PDF, DOCX or scanned JPG/PNG · up to 25 MB</p>
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
              {files.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {files.map((f, idx) => (
                    <li key={`${f.name}-${idx}`} className="flex items-center justify-between rounded border border-gray-200 px-3 py-1.5 text-xs">
                      <span className="truncate text-navy-900">
                        {f.name}
                        <span className="ml-2 text-gray-400">
                          {(f.size / 1024 / 1024).toFixed(1)} MB{idx === 0 ? " · main document" : ""}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-gray-400 hover:text-red-600"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <Link
                href="/dashboard"
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-navy-900 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
              >
                {saving ? "Uploading..." : isAdmin ? "Publish record" : "Submit for approval"}
              </button>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-navy-900">Preview</h3>
              <p className="mt-2 font-mono text-[11px] text-navy-900">
                {numberLabel} {form.documentNumber || "____"} , Series of {form.year}
              </p>
              {form.title || form.author || files.length ? (
                <div className="mt-2 space-y-1 text-[11px] text-gray-600">
                  {form.title && <p className="text-navy-900">{form.title}</p>}
                  {form.author && <p>By {form.author}</p>}
                  {files.length > 0 && <p>{files.length} file{files.length === 1 ? "" : "s"} attached</p>}
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-gray-500">Title, author and files will appear here as you fill in the form.</p>
              )}
            </div>

            <div className="card p-4">
              <h3 className="text-xs font-semibold text-navy-900">Before you upload</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[11px] text-gray-700">
                <li>Attach the signed copy with the SB Secretary&apos;s certification.</li>
                <li>Use the official numbering, e.g. {numberLabel} {currentYear}-09.</li>
                <li>Scan at 300 dpi so text stays readable.</li>
                <li>For ordinances, record the date sent to the Sangguniang Panlalawigan.</li>
              </ul>
            </div>

            <div className="card p-4">
              <h3 className="text-xs font-semibold text-navy-900">Viewing as</h3>
              <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-md border border-navy-900 text-xs">
                <span className={`py-1.5 text-center ${!isAdmin ? "bg-navy-900 font-semibold text-white" : "text-navy-900"}`}>User</span>
                <span className={`py-1.5 text-center ${isAdmin ? "bg-navy-900 font-semibold text-white" : "text-navy-900"}`}>Admin</span>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                {isAdmin
                  ? "As an admin, your upload is published to the records immediately."
                  : "Your upload is held for admin approval before it appears in the records."}
              </p>
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
}
