"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProtectedShell from "../../components/layout/ProtectedShell";
import { apiClient } from "../../lib/api/client";
import { hasRole } from "../../lib/auth";
import { CalendarEvent, Legislation, PaginatedResponse, ReportSummary } from "../../lib/types";
import EventDateBlock, { EVENT_TYPE_LABELS } from "../../components/calendar/EventDateBlock";
import { formatTime } from "../../components/ui/Records";
import {
  STAGES,
  stageIndex,
  nextAction,
  statusPillClass,
  humanize,
  documentLabel,
} from "../../lib/stages";

type Tab = "ALL" | "ORDINANCE" | "RESOLUTION" | "OTHERS" | "PENDING";

const TABS: { key: Tab; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "ORDINANCE", label: "Ordinances" },
  { key: "RESOLUTION", label: "Resolutions" },
  { key: "OTHERS", label: "Others" },
  { key: "PENDING", label: "Pending review" },
];

const ROWS_SHOWN = 7;
const YEAR = new Date().getFullYear();

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function uploaderName(item: Legislation) {
  return typeof item.createdBy === "object" && item.createdBy ? item.createdBy.fullName : "staff";
}

function ProgressBar({ status }: { status: string | null }) {
  const idx = stageIndex(status);
  return (
    <div>
      <div className="flex gap-0.5">
        {STAGES.map((s, i) => (
          <span key={s.key} className={`h-1.5 w-5 rounded-sm ${i <= idx ? "bg-navy-900" : "bg-gray-200"}`} />
        ))}
      </div>
      <p className="mt-1 text-[11px] text-gray-500">{STAGES[idx].label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [items, setItems] = useState<Legislation[]>([]);
  const [total, setTotal] = useState(0);
  const [statusBuckets, setStatusBuckets] = useState<{ _id: string | null; count: number }[]>([]);
  const [pending, setPending] = useState<Legislation[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tab, setTab] = useState<Tab>("ALL");
  const [loading, setLoading] = useState(true);
  const canUpload = hasRole("ADMIN", "STAFF");
  const isAdmin = hasRole("ADMIN");

  useEffect(() => {
    (async () => {
      try {
        const [summaryRes, recentRes, statusRes, eventsRes, pendingRes] = await Promise.all([
          apiClient.get<ReportSummary>(`/reports/summary?year=${YEAR}`),
          apiClient.get<PaginatedResponse<Legislation>>("/legislation?limit=100&sort=-createdAt"),
          apiClient.get<{ _id: string | null; count: number }[]>("/reports/by-status"),
          apiClient.get<CalendarEvent[]>("/calendar?upcoming=true&limit=4").catch(() => []),
          // Only admins can list pending uploads; for others the backend would return approved records instead.
          isAdmin
            ? apiClient.get<PaginatedResponse<Legislation>>("/legislation?approvalStatus=PENDING&limit=100&sort=-createdAt")
            : Promise.resolve(null),
        ]);
        setSummary(summaryRes);
        setItems(recentRes.data);
        setTotal(recentRes.meta.total);
        setStatusBuckets(statusRes);
        setEvents(eventsRes);
        if (pendingRes) {
          setPending(pendingRes.data);
          setPendingTotal(pendingRes.meta.total);
        }
      } catch {
        // page still renders with empty state
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    switch (tab) {
      case "ORDINANCE":
      case "RESOLUTION":
        return items.filter((i) => i.documentType === tab);
      case "OTHERS":
        return items.filter((i) => i.documentType !== "ORDINANCE" && i.documentType !== "RESOLUTION");
      case "PENDING":
        return pending;
      default:
        return items;
    }
  }, [items, pending, tab]);

  const stageCounts = useMemo(() => {
    const counts = STAGES.map(() => 0);
    for (const b of statusBuckets) {
      counts[stageIndex(b._id)] += b.count;
    }
    return counts;
  }, [statusBuckets]);
  const maxStage = Math.max(1, ...stageCounts);

  const tabTotal =
    tab === "ALL" ? total : tab === "PENDING" ? pendingTotal : filtered.length;

  const rows = filtered.slice(0, ROWS_SHOWN);

  const exportCsv = () => {
    const header = ["Document", "Title", "Author/Sponsor", "Classification", "Status", "Stage", "Next action"];
    const lines = filtered.map((i) =>
      [documentLabel(i), i.title, i.author || i.sponsor || "", i.classification || "", i.status || "", STAGES[stageIndex(i.status)].label, nextAction(i)]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `legislative-records-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: `Ordinances enacted (${YEAR})`, value: summary?.ordinances ?? 0, sub: `Series of ${YEAR}`, boxed: true },
    { label: `Resolutions adopted (${YEAR})`, value: summary?.resolutions ?? 0, sub: `Series of ${YEAR}`, boxed: true },
    { label: "Pending in committee", value: stageCounts[1], sub: "Across all committees", boxed: true },
    { label: "Awaiting admin approval", value: pendingTotal, sub: "Uploaded by users", boxed: false },
  ];

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-[1200px]">
        <p className="text-[11px] text-gray-500">Sangguniang Bayan ng Liloan · Province of Southern Leyte</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-2xl font-semibold text-navy-900">Legislative records</h1>
          <div className="flex gap-2">
            <button
              onClick={exportCsv}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-navy-900 hover:bg-gray-50"
            >
              Export list
            </button>
            {canUpload && (
              <Link
                href="/legislation/new"
                className="rounded-md bg-navy-900 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-800"
              >
                + Upload document
              </Link>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="card p-4">
              <p className="text-[11px] text-gray-500">{s.label}</p>
              <p className="mt-1 font-serif text-2xl font-semibold text-navy-900">
                {loading ? "…" : s.boxed ? `[${s.value}]` : s.value}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-500">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
          {/* Recent records */}
          <section className="card min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-navy-900">Recent ordinances &amp; resolutions</h2>
              <div className="flex flex-wrap gap-1.5">
                {TABS.filter((t) => t.key !== "PENDING" || isAdmin).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`rounded-full border px-3 py-1 text-[11px] ${
                      tab === t.key
                        ? "border-navy-900 bg-navy-900 text-white"
                        : "border-gray-300 bg-white text-gray-600 hover:border-navy-700"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2 font-medium">Document</th>
                    <th className="px-2 py-2 font-medium">Author · Committee</th>
                    <th className="px-2 py-2 font-medium">Progress</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Next action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-500">
                        Loading…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-500">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((i) => (
                      <tr key={i._id} className="border-t border-gray-100 align-top">
                        <td className="max-w-[220px] px-4 py-3">
                          <Link
                            href={`/legislation/${i._id}`}
                            className="inline-block border border-navy-600 px-1 font-mono text-[11px] text-navy-900 hover:bg-navy-50"
                          >
                            {documentLabel(i)}
                          </Link>
                          <p className="mt-1 text-xs leading-snug text-navy-900">{i.title}</p>
                        </td>
                        <td className="px-2 py-3 text-xs">
                          <p className="text-navy-900">{i.author || i.sponsor || "—"}</p>
                          <p className="text-[11px] text-gray-500">{i.classification || ""}</p>
                        </td>
                        <td className="px-2 py-3">
                          <ProgressBar status={i.status} />
                        </td>
                        <td className="px-2 py-3">
                          <span
                            className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-medium ${statusPillClass(i.status)}`}
                          >
                            {humanize(i.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-navy-900">{nextAction(i)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-[11px] text-gray-500">
              <span>
                Showing {rows.length} of {tabTotal} records
              </span>
              <Link href="/legislation" className="text-navy-900 underline hover:text-navy-700">
                View all records →
              </Link>
            </div>
          </section>

          {/* Right column */}
          <div className="space-y-4">
            {isAdmin && (
              <section className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-navy-900">Awaiting admin approval</h3>
                  <span className="rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">
                    {pendingTotal}
                  </span>
                </div>
                {pending.length === 0 ? (
                  <p className="text-xs text-gray-500">Nothing waiting for review.</p>
                ) : (
                  <ul className="space-y-3">
                    {pending.slice(0, 5).map((i) => (
                      <li key={i._id} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-navy-900">{documentLabel(i)}</p>
                          <p className="text-[11px] text-gray-500">
                            Uploaded by {uploaderName(i)} · {timeAgo(i.createdAt)}
                          </p>
                        </div>
                        <Link
                          href={`/legislation/${i._id}`}
                          className="shrink-0 rounded border border-gray-300 px-2 py-1 text-[11px] text-navy-900 hover:bg-gray-50"
                        >
                          Review
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {pendingTotal > 0 && (
                  <Link href="/approvals" className="mt-3 inline-block text-[11px] text-navy-900 underline">
                    View all pending →
                  </Link>
                )}
              </section>
            )}

            <section className="card p-4">
              <h3 className="mb-3 text-sm font-semibold text-navy-900">Upcoming sessions &amp; hearings</h3>
              {events.length === 0 ? (
                <p className="text-xs text-gray-500">No sessions or hearings scheduled.</p>
              ) : (
                <ul className="space-y-3">
                  {events.map((ev) => (
                    <li key={ev._id} className="flex items-start gap-3">
                      <EventDateBlock date={ev.date} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-navy-900">{ev.title}</p>
                        <p className="text-[11px] text-gray-500">
                          {[ev.description?.split("\n")[0] || EVENT_TYPE_LABELS[ev.eventType], formatTime(ev.startTime), ev.venue]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/calendar" className="mt-3 inline-block text-[11px] text-navy-900 underline">
                Open full calendar →
              </Link>
            </section>

            <section className="card p-4">
              <h3 className="mb-3 text-sm font-semibold text-navy-900">Measures by stage</h3>
              <ul className="space-y-3">
                {STAGES.map((s, idx) => (
                  <li key={s.key}>
                    <div className="flex justify-between text-[11px] text-navy-900">
                      <span>{s.label}</span>
                      <span className="font-semibold">{stageCounts[idx]}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-navy-900"
                        style={{ width: `${(stageCounts[idx] / maxStage) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </ProtectedShell>
  );
}
