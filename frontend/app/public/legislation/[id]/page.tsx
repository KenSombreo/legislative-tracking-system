"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Download, ExternalLink, Eye, EyeOff, FileText } from "lucide-react";
import { publicApi, publicPageUrl, ApiError } from "../../../../lib/api/client";
import { PublicLegislation } from "../../../../lib/types";
import { DOCUMENT_TYPE_LABELS } from "../../../../lib/config/legislationFields";
import { documentLabel } from "../../../../lib/stages";
import StatusTracker from "../../../../components/legislation/StatusTracker";
import QrCode from "../../../../components/ui/QrCode";

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : null;
}

export default function PublicRecordPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<PublicLegislation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(publicPageUrl(`/public/legislation/${id}`));
    publicApi
      .get<PublicLegislation>(`/legislation/${id}`)
      .then((res) => {
        setItem(res);
        const firstPdf = res.documents?.find((d) => d.mimeType === "application/pdf");
        // Phones show embedded PDFs poorly; open the viewer only on wider screens.
        if (firstPdf && window.innerWidth >= 768) setViewing(firstPdf._id);
      })
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 404
            ? "This record is not available to the public."
            : "Could not load this record. Please try again.",
        ),
      );
  }, [id]);

  if (error) {
    return (
      <div className="pub-card text-lg">
        <p>{error}</p>
        <p className="mt-3">
          <Link href="/public" className="pub-link">
            ← Back to search
          </Link>
        </p>
      </div>
    );
  }
  if (!item) return <p className="pub-muted text-lg">Loading…</p>;

  const details: [string, string | null][] = [
    ["Type", DOCUMENT_TYPE_LABELS[item.documentType]],
    ["Number", item.documentNumber],
    ["Year", String(item.year)],
    ["Classification", item.classification],
    [item.documentType === "RESOLUTION" ? "Sponsor" : "Author", item.author || item.sponsor],
    ["Date enacted", formatDate(item.dateEnacted)],
    ["Date adopted", formatDate(item.dateAdopted)],
    ["Approved by the Mayor", formatDate(item.dateApprovedByLCE)],
    ["Enacted / approved by SP", formatDate(item.dateEnactedApprovedBySP)],
    ["SP Resolution No.", item.spResolutionNumber],
    ["Sector", item.sector],
    ["Status", item.status],
  ];
  const label = documentLabel(item);
  const files = item.documents || [];

  return (
    <div className="space-y-6">
      <Link href="/public" className="pub-link text-lg">
        ← Back to search
      </Link>

      <section className="pub-card">
        <p className="pub-muted text-base font-semibold uppercase tracking-wide">
          {label} · {item.year}
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold leading-tight">{item.title || "Untitled"}</h1>
        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {details
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <dt className="pub-muted text-base">{k}</dt>
                <dd className="text-lg font-semibold">{v}</dd>
              </div>
            ))}
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="pub-card lg:col-span-2" aria-labelledby="docs-heading">
          <h2 id="docs-heading" className="text-2xl font-semibold">
            Document
          </h2>
          {files.length === 0 && !item.onlineLink && (
            <p className="pub-muted mt-2 text-lg">
              No digital copy is available yet.{" "}
              <Link href={requestHref(item._id, label, item.title)} className="pub-link">
                Request a copy
              </Link>
              .
            </p>
          )}
          <ul className="mt-3 space-y-3">
            {files.map((f) => {
              const isPdf = f.mimeType === "application/pdf";
              const open = viewing === f._id;
              return (
                <li key={f._id} className="rounded-lg border-2 border-gray-200 p-3">
                  <p className="flex items-center gap-2 text-lg font-semibold">
                    <FileText className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="break-all">{f.originalFileName}</span>
                  </p>
                  <p className="pub-muted text-base">{(f.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isPdf && (
                      <button className="pub-btn-outline" onClick={() => setViewing(open ? null : f._id)} aria-expanded={open}>
                        {open ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                        {open ? "Hide" : "View here"}
                      </button>
                    )}
                    <a className="pub-btn-outline" href={publicApi.fileUrl(`/documents/${f._id}`)} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-5 w-5" aria-hidden /> Open
                    </a>
                    <a className="pub-btn" href={publicApi.fileUrl(`/documents/${f._id}?download=1`)}>
                      <Download className="h-5 w-5" aria-hidden /> Download
                    </a>
                  </div>
                  {open && (
                    <iframe
                      src={publicApi.fileUrl(`/documents/${f._id}`)}
                      title={`${label}: ${f.originalFileName}`}
                      className="mt-3 h-[80vh] w-full rounded-lg border border-gray-300 bg-white"
                    />
                  )}
                </li>
              );
            })}
          </ul>
          {item.onlineLink && (
            <a href={item.onlineLink} target="_blank" rel="noreferrer" className="pub-link mt-4 inline-flex items-center gap-2 text-lg">
              <ExternalLink className="h-5 w-5" aria-hidden /> View the online copy
            </a>
          )}
          <div className="mt-5 border-t border-gray-200 pt-4">
            <p className="pub-muted text-lg">Need a certified true copy or a printed copy?</p>
            <Link href={requestHref(item._id, label, item.title)} className="pub-btn mt-2">
              Request a copy
            </Link>
          </div>
        </section>

        <div className="space-y-6">
          <section className="pub-card" aria-labelledby="tracker-heading">
            <h2 id="tracker-heading" className="mb-3 text-2xl font-semibold">
              Status tracker
            </h2>
            <StatusTracker item={item} large />
          </section>
          {pageUrl && (
            <section className="pub-card">
              <h2 className="mb-3 text-xl font-semibold">Open on your phone</h2>
              <QrCode url={pageUrl} caption={`${label} (${item.year})`} size={168} actions={false} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function requestHref(id: string, label: string, title: string | null) {
  const params = new URLSearchParams({ record: id, doc: `${label}${title ? ` – ${title}` : ""}` });
  return `/public/request?${params}`;
}
