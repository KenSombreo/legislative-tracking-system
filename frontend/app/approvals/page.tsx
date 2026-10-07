"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedShell from "../../components/layout/ProtectedShell";
import { EmptyState, Field, Modal, PageHeader, PrimaryButton, SecondaryButton, formatDate } from "../../components/ui/Records";
import { apiClient, ApiError } from "../../lib/api/client";
import { hasRole } from "../../lib/auth";
import { Legislation, PaginatedResponse } from "../../lib/types";
import { documentLabel, humanize } from "../../lib/stages";

type View = "PENDING" | "REJECTED";

function uploader(item: Legislation) {
  return typeof item.createdBy === "object" && item.createdBy ? item.createdBy.fullName : "—";
}

export default function ApprovalsPage() {
  const router = useRouter();
  const isAdmin = hasRole("ADMIN");
  const [view, setView] = useState<View>("PENDING");
  const [items, setItems] = useState<Legislation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Legislation | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async (v: View) => {
    setLoading(true);
    try {
      const res = await apiClient.get<PaginatedResponse<Legislation>>(`/legislation?approvalStatus=${v}&limit=100&sort=-createdAt`);
      setItems(res.data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/dashboard");
      return;
    }
    load(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const approve = async (item: Legislation) => {
    setBusyId(item._id);
    setError(null);
    try {
      await apiClient.patch(`/legislation/${item._id}/approve`);
      setItems((prev) => prev.filter((i) => i._id !== item._id));
      window.dispatchEvent(new Event("approvals:changed"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to approve");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejecting) return;
    setBusyId(rejecting._id);
    setError(null);
    try {
      await apiClient.patch(`/legislation/${rejecting._id}/reject`, reason.trim() ? { reason: reason.trim() } : {});
      setItems((prev) => prev.filter((i) => i._id !== rejecting._id));
      setRejecting(null);
      window.dispatchEvent(new Event("approvals:changed"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reject");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-[1200px]">
        <PageHeader
          title="Pending approvals"
          description="Documents uploaded by staff wait here until an admin approves them. Approved records appear in the public lists."
        />

        <section className="card mt-5">
          <div className="flex gap-1.5 border-b border-gray-200 px-4 py-3">
            {(["PENDING", "REJECTED"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-full border px-3 py-1 text-[11px] ${
                  view === v ? "border-navy-900 bg-navy-900 text-white" : "border-gray-300 bg-white text-gray-600 hover:border-navy-700"
                }`}
              >
                {v === "PENDING" ? "Awaiting review" : "Rejected"}
              </button>
            ))}
          </div>

          {error && <p className="px-4 pt-3 text-sm text-red-600">{error}</p>}

          <div className="overflow-x-auto">
            {loading ? (
              <p className="px-4 py-10 text-center text-xs text-gray-500">Loading…</p>
            ) : items.length === 0 ? (
              <EmptyState
                title={view === "PENDING" ? "Nothing waiting for approval" : "No rejected uploads"}
                hint={view === "PENDING" ? "When staff upload a document, it will appear here for review." : undefined}
              />
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2 font-medium">Document</th>
                    <th className="px-2 py-2 font-medium">Author</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Uploaded</th>
                    {view === "REJECTED" && <th className="px-2 py-2 font-medium">Reason</th>}
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i._id} className="border-t border-gray-100 align-top text-xs">
                      <td className="max-w-[300px] px-4 py-3">
                        <Link
                          href={`/legislation/${i._id}`}
                          className="inline-block border border-navy-600 px-1 font-mono text-[11px] text-navy-900 hover:bg-navy-50"
                        >
                          {documentLabel(i)}
                        </Link>
                        <p className="mt-1 leading-snug text-navy-900">{i.title}</p>
                      </td>
                      <td className="px-2 py-3 text-navy-900">{i.author || i.sponsor || "—"}</td>
                      <td className="px-2 py-3 text-navy-900">{humanize(i.status)}</td>
                      <td className="px-2 py-3 text-gray-600">
                        <p>{uploader(i)}</p>
                        <p className="text-[11px]">{formatDate(i.createdAt)}</p>
                      </td>
                      {view === "REJECTED" && <td className="px-2 py-3 text-gray-600">{i.rejectionReason || "—"}</td>}
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Link href={`/legislation/${i._id}`} className="mr-2 rounded border border-gray-300 px-2 py-1 text-[11px] text-navy-900 hover:bg-gray-50">
                          Review
                        </Link>
                        <button
                          disabled={busyId === i._id}
                          onClick={() => approve(i)}
                          className="mr-2 rounded bg-navy-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        {view === "PENDING" && (
                          <button
                            disabled={busyId === i._id}
                            onClick={() => {
                              setReason("");
                              setRejecting(i);
                            }}
                            className="rounded border border-red-300 px-2 py-1 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <Modal title="Reject upload" open={!!rejecting} onClose={() => setRejecting(null)}>
        <form onSubmit={reject} className="space-y-4">
          <p className="text-xs text-gray-600">
            {rejecting && documentLabel(rejecting)} will not appear in the records. You can still approve it later from the Rejected tab.
          </p>
          <Field label="Reason (shown to the uploader)">
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Signed copy missing the SB Secretary's certification"
              className="field-input resize-y"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <SecondaryButton type="button" onClick={() => setRejecting(null)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={!!busyId} className="!bg-red-600 hover:!bg-red-700">
              Reject upload
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </ProtectedShell>
  );
}
