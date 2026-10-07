"use client";

import { useEffect, useState } from "react";
import ProtectedShell from "../../components/layout/ProtectedShell";
import Pagination from "../../components/ui/Pagination";
import { apiClient, ApiError } from "../../lib/api/client";
import { AuditLog, PaginatedResponse, UserRef } from "../../lib/types";
import { getUser } from "../../lib/auth";

function userLabel(u: UserRef | string | null) {
  if (!u) return "System";
  if (typeof u === "string") return u;
  return u.fullName || u.username;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUser = getUser();

  const load = (page = 1) => {
    setLoading(true);
    apiClient
      .get<PaginatedResponse<AuditLog>>(`/audit-logs?page=${page}&limit=20`)
      .then((res) => {
        setLogs(res.data);
        setMeta(res.meta);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load audit logs"))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(1), []);

  if (currentUser?.role !== "ADMIN") {
    return (
      <ProtectedShell>
        <p className="text-sm text-red-600">You do not have permission to view this page.</p>
      </ProtectedShell>
    );
  }

  return (
    <ProtectedShell>
      <h1 className="mb-4 text-xl font-bold text-navy-900">Audit Logs</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">When</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">User</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Action</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Entity</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      No audit logs.
                    </td>
                  </tr>
                )}
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2">{userLabel(log.userId)}</td>
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2">{log.entityType}</td>
                    <td className="px-4 py-2">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={load} />
        </>
      )}
    </ProtectedShell>
  );
}
