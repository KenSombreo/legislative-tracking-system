"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { publicApi, publicPageUrl, ApiError } from "../../../lib/api/client";
import QrCode from "../../../components/ui/QrCode";

const EMPTY = {
  requesterName: "",
  contactNumber: "",
  email: "",
  address: "",
  requestedDocuments: "",
  purpose: "",
  copies: "1",
  certifiedTrueCopy: false,
  website: "",
};

export default function PublicRequestPage() {
  const [form, setForm] = useState(EMPTY);
  const [recordId, setRecordId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("doc")) setForm((f) => ({ ...f, requestedDocuments: p.get("doc") || "" }));
    if (p.get("record")) setRecordId(p.get("record") || undefined);
  }, []);

  const set = (field: keyof typeof EMPTY, value: string | boolean) => setForm((f) => ({ ...f, [field]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.contactNumber.trim() && !form.email.trim()) {
      setError("Please give a contact number or an email address so we can reach you.");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, any> = {
        requesterName: form.requesterName.trim(),
        requestedDocuments: form.requestedDocuments.trim(),
        purpose: form.purpose.trim(),
        copies: parseInt(form.copies, 10) || 1,
        certifiedTrueCopy: form.certifiedTrueCopy,
      };
      for (const k of ["contactNumber", "email", "address", "website"] as const) {
        if (form[k].trim()) body[k] = form[k].trim();
      }
      if (recordId) body.legislativeDocumentId = recordId;
      const res = await publicApi.post<{ referenceCode: string }>("/document-requests", body);
      setCode(res.referenceCode);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send your request. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (code) {
    const statusUrl = publicPageUrl(`/public/request/status?code=${encodeURIComponent(code)}`);
    return (
      <section className="pub-card text-center" role="status">
        <h1 className="font-serif text-3xl font-semibold">Request received</h1>
        <p className="pub-muted mt-2 text-lg">Please keep your reference code. You will need it to check or claim your request.</p>
        <p className="mt-5 text-base font-semibold uppercase tracking-wide">Reference code</p>
        <p className="font-mono text-4xl font-bold tracking-wider">{code}</p>
        <div className="mt-6 flex justify-center">
          <QrCode url={statusUrl} caption="Scan to save a link to your request" size={168} actions={false} />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={`/public/request/status?code=${encodeURIComponent(code)}`} className="pub-btn">
            Check status
          </Link>
          <Link href="/public" className="pub-btn-outline">
            Back to search
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="pub-card">
      <h1 className="font-serif text-3xl font-semibold">Request a copy</h1>
      <p className="pub-muted mt-1 text-lg">
        Ask the Office of the SB Secretary for a printed or certified true copy of an ordinance, resolution or other
        record. Fields marked <span aria-hidden>*</span>
        <span className="sr-only">with an asterisk</span> are required.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <Field id="requestedDocuments" label="Document(s) requested" required hint="Number, title or a short description.">
          <textarea
            id="requestedDocuments"
            required
            rows={3}
            maxLength={1000}
            value={form.requestedDocuments}
            onChange={(e) => set("requestedDocuments", e.target.value)}
            className="pub-input"
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field id="copies" label="Number of copies">
            <input
              id="copies"
              type="number"
              min={1}
              max={20}
              value={form.copies}
              onChange={(e) => set("copies", e.target.value)}
              className="pub-input"
            />
          </Field>
          <div className="flex items-end">
            <label className="flex min-h-[3rem] cursor-pointer items-center gap-3 text-lg font-semibold">
              <input
                type="checkbox"
                checked={form.certifiedTrueCopy}
                onChange={(e) => set("certifiedTrueCopy", e.target.checked)}
                className="h-6 w-6"
              />
              Certified true copy
            </label>
          </div>
        </div>

        <Field id="purpose" label="Purpose" required hint="e.g. business permit, school research, legal requirement.">
          <input
            id="purpose"
            required
            maxLength={500}
            value={form.purpose}
            onChange={(e) => set("purpose", e.target.value)}
            className="pub-input"
          />
        </Field>

        <Field id="requesterName" label="Your full name" required>
          <input
            id="requesterName"
            required
            maxLength={150}
            autoComplete="name"
            value={form.requesterName}
            onChange={(e) => set("requesterName", e.target.value)}
            className="pub-input"
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field id="contactNumber" label="Contact number" hint="A contact number or an email is required.">
            <input
              id="contactNumber"
              type="tel"
              maxLength={30}
              autoComplete="tel"
              value={form.contactNumber}
              onChange={(e) => set("contactNumber", e.target.value)}
              className="pub-input"
            />
          </Field>
          <Field id="email" label="Email">
            <input
              id="email"
              type="email"
              maxLength={150}
              autoComplete="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="pub-input"
            />
          </Field>
        </div>

        <Field id="address" label="Address">
          <input
            id="address"
            maxLength={300}
            autoComplete="street-address"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            className="pub-input"
          />
        </Field>

        {/* Left empty by people; filled by spam bots. */}
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
          </label>
        </div>

        <p className="pub-muted rounded-lg bg-navy-50 p-4 text-base">
          Your personal information is used only to process this request, in line with the Data Privacy Act of 2012
          (RA 10173). It is not shown on the public portal.
        </p>

        {error && (
          <p role="alert" className="rounded-lg border-2 border-red-600 bg-red-50 p-3 text-lg text-red-800">
            {error}
          </p>
        )}

        <button type="submit" disabled={saving} className="pub-btn w-full sm:w-auto">
          {saving ? "Sending…" : "Send request"}
        </button>
      </form>
    </section>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="pub-label">
        {label}
        {required && (
          <span aria-hidden className="text-red-700">
            {" "}
            *
          </span>
        )}
      </label>
      {hint && <p className="pub-muted mb-1.5 text-base">{hint}</p>}
      {children}
    </div>
  );
}
