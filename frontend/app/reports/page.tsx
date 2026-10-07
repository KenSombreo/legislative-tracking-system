"use client";

import { useEffect, useState } from "react";
import ProtectedShell from "../../components/layout/ProtectedShell";
import StatCard from "../../components/dashboard/StatCard";
import { apiClient } from "../../lib/api/client";
import { ReportSummary } from "../../lib/types";

interface Bucket {
  _id: string | number | null;
  count: number;
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [byYear, setByYear] = useState<Bucket[]>([]);
  const [byStatus, setByStatus] = useState<Bucket[]>([]);
  const [byClassification, setByClassification] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get<ReportSummary>("/reports/summary"),
      apiClient.get<Bucket[]>("/reports/by-year"),
      apiClient.get<Bucket[]>("/reports/by-status"),
      apiClient.get<Bucket[]>("/reports/by-classification"),
    ])
      .then(([s, y, st, c]) => {
        setSummary(s);
        setByYear(y);
        setByStatus(st);
        setByClassification(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const BucketTable = ({ title, buckets }: { title: string; buckets: Bucket[] }) => (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-600">{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {buckets.length === 0 && (
            <tr>
              <td className="py-2 text-gray-400">No data</td>
            </tr>
          )}
          {buckets.map((b, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="py-1.5 text-navy-900">{b._id ?? "Unspecified"}</td>
              <td className="py-1.5 text-right font-medium text-navy-900">{b.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <ProtectedShell>
      <h1 className="mb-4 text-xl font-bold text-navy-900">Reports</h1>
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total" value={summary?.total ?? 0} color="blue" />
            <StatCard label="Pending" value={summary?.pending ?? 0} color="yellow" />
            <StatCard label="Approved" value={summary?.approved ?? 0} color="green" />
            <StatCard label="Archived" value={summary?.archived ?? 0} color="red" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <BucketTable title="By Year" buckets={byYear} />
            <BucketTable title="By Status" buckets={byStatus} />
            <BucketTable title="By Classification" buckets={byClassification} />
          </div>
        </>
      )}
    </ProtectedShell>
  );
}
