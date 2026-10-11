"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, ExternalLink } from "lucide-react";
import ProtectedShell from "../../../components/layout/ProtectedShell";
import DocumentUpload from "../../../components/documents/DocumentUpload";
import DocumentList from "../../../components/documents/DocumentList";
import StatusBadge from "../../../components/ui/StatusBadge";
import ClassificationBadge from "../../../components/ui/ClassificationBadge";
import StatusTracker from "../../../components/legislation/StatusTracker";
import QrCode from "../../../components/ui/QrCode";
import { apiClient, ApiError, publicPageUrl } from "../../../lib/api/client";
import { hasRole } from "../../../lib/auth";
import { Legislation, DocumentFile, UserRef } from "../../../lib/types";
import { DOCUMENT_TYPE_LABELS, getRelevantFieldsForType } from "../../../lib/config/legislationFields";
import { documentLabel } from "../../../lib/stages";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function userLabel(u: UserRef | string | null) {
  if (!u) return "—";
  if (typeof u === "string") return u;
  return u.fullName || u.username;
}

export default function LegislationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Legislation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<Legislation>(`/legislation/${params.id}`);
      setItem(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load legislation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleDeleteDoc = async (doc: DocumentFile) => {
    try {
      await apiClient.delete(`/documents/${doc._id}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete document");
    }
  };

  if (loading) {
    return (
      <ProtectedShell>
        <p className="text-sm text-gray-500">Loading...</p>
      </ProtectedShell>
    );
  }

  if (error || !item) {
    return (
      <ProtectedShell>
        <p className="text-sm text-red-600">{error || "Not found"}</p>
      </ProtectedShell>
    );
  }

  const fields = getRelevantFieldsForType(item.documentType);
  const documents = (item.documents as DocumentFile[]).filter((d) => typeof d === "object");
  const isAdmin = hasRole("ADMIN");

  const review = async (decision: "approve" | "reject") => {
    const body =
      decision === "reject" ? { reason: window.prompt("Reason for rejecting (optional):")?.trim() || undefined } : undefined;
    try {
      await apiClient.patch(`/legislation/${item._id}/${decision}`, body);
      window.dispatchEvent(new Event("approvals:changed"));
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to ${decision}`);
    }
  };

  const updateStage = async (body: { stage: string; date?: string; note?: string }) => {
    try {
      setItem(await apiClient.patch<Legislation>(`/legislation/${item._id}/stage`, body));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update stage");
    }
  };

  const setPublic = async (isPublic: boolean) => {
    try {
      setItem(await apiClient.patch<Legislation>(`/legislation/${item._id}/visibility`, { isPublic }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change public access");
    }
  };

  const setFilePublic = async (doc: DocumentFile, isPublic: boolean) => {
    try {
      await apiClient.patch(`/documents/${doc._id}/visibility`, { isPublic });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change file access");
    }
  };

  const publicUrl = publicPageUrl(`/public/legislation/${item._id}`);
  const canRelease = !item.approvalStatus || item.approvalStatus === "APPROVED";

  return (
    <ProtectedShell>
      {(item.approvalStatus === "PENDING" || item.approvalStatus === "REJECTED") && (
        <div
          className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
            item.approvalStatus === "PENDING" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <div>
            <p className="font-semibold">
              {item.approvalStatus === "PENDING" ? "Awaiting admin approval" : "Rejected by admin"}
            </p>
            <p className="text-xs">
              {item.approvalStatus === "PENDING"
                ? "This record is hidden from the public lists until an admin approves it."
                : item.rejectionReason || "No reason given."}
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button onClick={() => review("approve")} className="rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800">
                Approve
              </button>
              {item.approvalStatus === "PENDING" && (
                <button onClick={() => review("reject")} className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs text-red-700 hover:bg-red-50">
                  Reject
                </button>
              )}
            </div>
          )}
        </div>
      )}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
            {DOCUMENT_TYPE_LABELS[item.documentType]}
          </p>
          <h1 className="text-xl font-bold text-navy-900">
            {item.documentNumber} — {item.title}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={item.status} />
            <ClassificationBadge classification={item.classification} />
          </div>
        </div>
        {hasRole("ADMIN", "STAFF") && (
          <Link
            href={`/legislation/${item._id}/edit`}
            className="flex items-center gap-1.5 rounded-md bg-navy-800 px-3 py-2 text-sm text-white hover:bg-navy-900"
          >
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Details</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-gray-500">Document Number</dt>
                <dd className="text-sm text-navy-900">{item.documentNumber}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Year</dt>
                <dd className="text-sm text-navy-900">{item.year}</dd>
              </div>
              {fields.map((f) => {
                const raw = (item as any)[f.field];
                const display = f.type === "date" ? formatDate(raw) : raw || "—";
                return (
                  <div key={f.field}>
                    <dt className="text-xs text-gray-500">{f.label}</dt>
                    <dd className="text-sm text-navy-900">{display}</dd>
                  </div>
                );
              })}
            </dl>
            {item.onlineLink && (
              <a
                href={item.onlineLink}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-navy-700 hover:underline"
              >
                <ExternalLink className="h-4 w-4" /> View PDF (Online Link)
              </a>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Status tracker</h2>
            <StatusTracker item={item} onUpdate={hasRole("ADMIN", "STAFF") ? updateStage : undefined} />
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Documents</h2>
            {hasRole("ADMIN", "STAFF") && (
              <div className="mb-4">
                <DocumentUpload legislativeDocumentId={item._id} onUploaded={load} />
              </div>
            )}
            <DocumentList
              documents={documents}
              onDelete={handleDeleteDoc}
              onTogglePublic={isAdmin ? setFilePublic : undefined}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Public portal &amp; QR</h2>
            {item.isPublic ? (
              <>
                <p className="mb-4 text-xs text-emerald-700">
                  Released: shown on the public kiosk. Scanning the QR code opens this record on a phone.
                </p>
                <QrCode url={publicUrl} caption={`${documentLabel(item)} (${item.year})`} />
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block text-center text-xs text-navy-700 hover:underline"
                >
                  Open public page
                </a>
              </>
            ) : (
              <p className="text-xs text-gray-600">
                Not released. The public kiosk and QR link do not show this record
                {canRelease ? "." : " (it must be approved first)."}
              </p>
            )}
            {isAdmin && (
              <button
                onClick={() => setPublic(!item.isPublic)}
                disabled={!item.isPublic && !canRelease}
                className={`mt-4 w-full rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                  item.isPublic
                    ? "border border-red-300 bg-white text-red-700 hover:bg-red-50"
                    : "bg-navy-900 text-white hover:bg-navy-800"
                }`}
              >
                {item.isPublic ? "Withdraw from public portal" : "Release to public portal"}
              </button>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Audit History</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500">Created By</dt>
                <dd className="text-navy-900">{userLabel(item.createdBy)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Created At</dt>
                <dd className="text-navy-900">{formatDateTime(item.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Last Updated By</dt>
                <dd className="text-navy-900">{userLabel(item.updatedBy)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Last Updated At</dt>
                <dd className="text-navy-900">{formatDateTime(item.updatedAt)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </ProtectedShell>
  );
}
