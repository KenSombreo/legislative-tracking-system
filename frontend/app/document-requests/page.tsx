"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedShell from "../../components/layout/ProtectedShell";
import Pagination from "../../components/ui/Pagination";
import SearchBar from "../../components/ui/SearchBar";
import { apiClient, ApiError } from "../../lib/api/client";
import { hasRole } from "../../lib/auth";
import { DocumentRequest, PaginatedResponse, RequestStatus } from "../../lib/types";
import { REQUEST_STATUS } from "../../lib/requests";

const STATUSES = Object.keys(REQUEST_STATUS) as RequestStatus[];

export default function DocumentRequestsPage() {
  const [items, setItems] = useState<DocumentRequest[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [status, setStatus] = useState<RequestStatus | "">("PENDING");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const allowed = hasRole("ADMIN", "STAFF");

  const load = (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    apiClient
      .get<PaginatedResponse<DocumentRequest>>(`/document-requests?${params}`)
      .then((res) => {
        setItems(res.data);
        setMeta(res.meta);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load requests"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (allowed) load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search]);

  const save = async (id: string, body: Partial<DocumentRequest>) => {
    try {
      const updated = await apiClient.patch<DocumentRequest>(`/document-requests/${id}`, body);
      setItems((list) => list.map((r) => (r._id === id ? { ...r, ...updated, legislativeDocumentId: r.legislativeDocumentId } : r)));
      window.dispatchEvent(new Event("requests:changed"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update request");
    }
  };

  if (!allowed) {
    return (
      <ProtectedShell>
        <p className="text-sm text-red-600">You do not have permission to view this page.</p>
      </ProtectedShell>
    );
  }

  return (
    <ProtectedShell>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-navy-900">Document requests</h1>
        <a href="/public/request" target="_blank" rel="noreferrer" className="text-xs text-navy-700 hover:underline">
          Open the public request form ↗
        </a>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        Requests for copies filed from the public portal. Requesters check progress with their reference code and see
        only the status and the &ldquo;message to requester&rdquo;.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["", ...STATUSES] as const).map((s) => (
          <button
            key={s || "ALL"}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              status === s ? "bg-navy-900 text-white" : "bg-white text-navy-900 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {s ? REQUEST_STATUS[s].label : "All"}
          </button>
        ))}
        <div className="ml-auto">
          <SearchBar value={search} onChange={setSearch} placeholder="Reference, name, document..." />
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <ul className="space-y-2">
            {items.length === 0 && (
              <li className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">
                No requests.
              </li>
            )}
            {items.map((r) => (
              <RequestRow
                key={r._id}
                request={r}
                open={openId === r._id}
                onToggle={() => setOpenId(openId === r._id ? null : r._id)}
                onSave={(body) => save(r._id, body)}
              />
            ))}
          </ul>
          <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={load} />
        </>
      )}
    </ProtectedShell>
  );
}

function RequestRow({
  request: r,
  open,
  onToggle,
  onSave,
}: {
  request: DocumentRequest;
  open: boolean;
  onToggle: () => void;
  onSave: (body: Partial<DocumentRequest>) => Promise<void>;
}) {
  const [status, setStatus] = useState<RequestStatus>(r.status);
  const [responseMessage, setResponseMessage] = useState(r.responseMessage || "");
  const [internalNotes, setInternalNotes] = useState(r.internalNotes || "");
  const [saving, setSaving] = useState(false);
  const record = r.legislativeDocumentId && typeof r.legislativeDocumentId === "object" ? r.legislativeDocumentId : null;
  const handler = r.handledBy && typeof r.handledBy === "object" ? r.handledBy.fullName || r.handledBy.username : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ status, responseMessage, internalNotes });
    setSaving(false);
  };

  return (
    <li className="rounded-lg border border-gray-200 bg-white">
      <button onClick={onToggle} aria-expanded={open} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left text-sm">
        <span className="font-mono text-xs font-semibold text-navy-900">{r.referenceCode}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${REQUEST_STATUS[r.status].cls}`}>
          {REQUEST_STATUS[r.status].label}
        </span>
        <span className="min-w-0 flex-1 truncate text-navy-900">{r.requestedDocuments}</span>
        <span className="text-xs text-gray-500">
          {r.requesterName} · {new Date(r.createdAt).toLocaleDateString()}
        </span>
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-6 border-t border-gray-100 px-4 py-4 text-sm lg:grid-cols-2">
          <dl className="space-y-2">
            <Item label="Requested">{r.requestedDocuments}</Item>
            {record && (
              <Item label="Linked record">
                <Link href={`/legislation/${record._id}`} className="text-navy-700 hover:underline">
                  {record.documentNumber} — {record.title}
                </Link>
              </Item>
            )}
            <Item label="Copies">
              {r.copies}
              {r.certifiedTrueCopy ? " · certified true copy" : ""}
            </Item>
            <Item label="Purpose">{r.purpose}</Item>
            <Item label="Requester">{r.requesterName}</Item>
            <Item label="Contact">{[r.contactNumber, r.email].filter(Boolean).join(" · ") || "—"}</Item>
            {r.address && <Item label="Address">{r.address}</Item>}
            {handler && <Item label="Last handled by">{handler}</Item>}
          </dl>
          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="field-label">Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as RequestStatus)} className="field-input">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {REQUEST_STATUS[s].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label">Message to requester (shown on the public status page)</span>
              <textarea
                rows={2}
                maxLength={1000}
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder="e.g. Ready for pick-up on weekdays, 8AM–5PM. Fee: ₱50 per certified copy."
                className="field-input"
              />
            </label>
            <label className="block">
              <span className="field-label">Internal notes (staff only)</span>
              <textarea
                rows={2}
                maxLength={2000}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className="field-input"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-navy-800 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-900 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </form>
        </div>
      )}
    </li>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-navy-900">{children}</dd>
    </div>
  );
}
