"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FileSpreadsheet, Printer } from "lucide-react";
import ProtectedShell from "../../components/layout/ProtectedShell";
import StatCard from "../../components/dashboard/StatCard";
import { apiClient, ApiError } from "../../lib/api/client";
import { ActivityDoc, ReportSummary } from "../../lib/types";
import { categoryLabel, isVideo } from "../../lib/activities";
import { DocumentType } from "../../lib/config/legislationFields";
import { documentLabel } from "../../lib/stages";
import { currentStage, stageLabel } from "../../lib/tracking";

interface Bucket {
  _id: string | number | null;
  count: number;
}

interface NameCount {
  name: string;
  count: number;
}

interface Measure {
  _id: string;
  documentType: DocumentType;
  documentNumber: string;
  year: number;
  title: string | null;
  classification: string | null;
  author: string | null;
  sponsor: string | null;
  status: string | null;
  stage?: string | null;
  dateEnacted: string | null;
  dateAdopted: string | null;
  dateApprovedByLCE: string | null;
}

interface PeriodReport {
  period: { year: number; quarter: number | null; from: string; to: string; generatedAt: string };
  totals: {
    ordinances: number;
    appropriationOrdinances: number;
    resolutions: number;
    approvedByLce: number;
    regularSessions: number;
    specialSessions: number;
    committeeReports: number;
    documentRequests: number;
    documentRequestsReleased: number;
    inProcess: number;
    activitiesDocumented: number;
  };
  byClassification: NameCount[];
  byAuthor: NameCount[];
  byCommittee: NameCount[];
  quarters: { quarter: number; ordinances: number; resolutions: number; sessions: number; committeeReports: number }[] | null;
  measures: Measure[];
  sessions: { _id: string; sessionType: string; sessionNumber: string; sessionDate: string; presidingOfficer: string | null; status: string }[];
  committeeReports: {
    _id: string;
    reportNumber: string;
    committee: string;
    title: string;
    dateSubmitted: string;
    relatedMeasure: string | null;
    recommendation: string | null;
  }[];
  inProcess: Measure[];
  documentation: ActivityDoc[];
}

type ReportKind = "accomplishment" | "legislative";

const QUARTER_NAMES = ["1st Quarter (January–March)", "2nd Quarter (April–June)", "3rd Quarter (July–September)", "4th Quarter (October–December)"];
const ORDINAL = ["1st", "2nd", "3rd", "4th"];

function fmt(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Manila" }) : "—";
}

function reportTitle(kind: ReportKind, r: PeriodReport) {
  const scope = r.period.quarter ? "Quarterly" : "Annual";
  return `${scope} ${kind === "accomplishment" ? "Accomplishment" : "Legislative"} Report`;
}

function periodLabel(r: PeriodReport) {
  return r.period.quarter ? `${QUARTER_NAMES[r.period.quarter - 1]} ${r.period.year}` : `Calendar Year ${r.period.year}`;
}

export default function ReportsPage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [quarter, setQuarter] = useState<number | 0>(Math.floor(new Date().getMonth() / 3) + 1);
  const [kind, setKind] = useState<ReportKind>("accomplishment");
  const [years, setYears] = useState<number[]>([thisYear]);
  const [report, setReport] = useState<PeriodReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [byYear, setByYear] = useState<Bucket[]>([]);
  const [byStatus, setByStatus] = useState<Bucket[]>([]);
  const [byClassification, setByClassification] = useState<Bucket[]>([]);

  useEffect(() => {
    apiClient
      .get<number[]>("/legislation/years")
      .then((ys) => setYears([...new Set([thisYear, ...ys])].sort((a, b) => b - a)))
      .catch(() => {});
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
      .catch(() => {});
  }, [thisYear]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiClient
      .get<PeriodReport>(`/reports/period?year=${year}${quarter ? `&quarter=${quarter}` : ""}`)
      .then(setReport)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load report"))
      .finally(() => setLoading(false));
  }, [year, quarter]);

  return (
    <ProtectedShell>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 print:hidden">
        <h1 className="text-xl font-bold text-navy-900">Reports</h1>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-gray-600">
            Report
            <select value={kind} onChange={(e) => setKind(e.target.value as ReportKind)} className="field-input mt-1 w-auto">
              <option value="accomplishment">Accomplishment report</option>
              <option value="legislative">Legislative report (list of measures)</option>
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Period
            <select value={quarter} onChange={(e) => setQuarter(parseInt(e.target.value, 10))} className="field-input mt-1 w-auto">
              <option value={0}>Whole year (annual)</option>
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={q}>
                  {QUARTER_NAMES[q - 1]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Year
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} className="field-input mt-1 w-auto">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => window.print()}
            disabled={!report}
            className="flex items-center gap-1.5 rounded-md bg-navy-800 px-3 py-2 text-sm text-white hover:bg-navy-900 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" /> Print / PDF
          </button>
          <button
            onClick={() => report && downloadCsv(kind, report)}
            disabled={!report}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-navy-900 hover:bg-gray-50 disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </button>
        </div>
      </div>
      <p className="mb-4 text-xs text-gray-500 print:hidden">
        A measure is counted in the quarter of its date enacted (ordinances) or date adopted (resolutions). Records still
        waiting for admin approval are left out.
      </p>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {loading && !report ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        report && (
          <article className={`mx-auto max-w-4xl rounded-lg border border-gray-200 bg-white p-8 text-navy-950 print:max-w-none print:border-0 print:p-0 ${loading ? "opacity-60" : ""}`}>
            <ReportHeader title={reportTitle(kind, report)} period={periodLabel(report)} />
            {kind === "accomplishment" ? <Accomplishment r={report} /> : <Legislative r={report} />}
            <Signatories />
            <p className="mt-6 text-[10px] text-gray-400">Generated {new Date(report.period.generatedAt).toLocaleString("en-PH")} · Legislative Tracking System</p>
          </article>
        )
      )}

      <section className="mt-10 print:hidden">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">All-time overview</h2>
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
      </section>
    </ProtectedShell>
  );
}

function ReportHeader({ title, period }: { title: string; period: string }) {
  return (
    <header className="mb-6 text-center">
      <div className="flex items-center justify-center gap-4 sm:gap-8">
        <Image src="/logo.png" alt="Seal of the Sangguniang Bayan, Liloan, Southern Leyte" width={88} height={88} className="h-20 w-20 shrink-0" priority />
        <div className="min-w-0">
          <p className="text-xs">Republic of the Philippines</p>
          <p className="text-xs">Province of Southern Leyte</p>
          <p className="text-xs">Municipality of Liloan</p>
          <p className="mt-1 font-serif text-base font-semibold">OFFICE OF THE SANGGUNIANG BAYAN</p>
        </div>
        <Image src="/bagong-pilipinas.png" alt="Bagong Pilipinas" width={86} height={80} className="h-20 w-auto shrink-0" priority />
      </div>
      <div className="mt-3 border-b-2 border-emerald-800" />
      <h2 className="mt-4 font-serif text-xl font-bold uppercase">{title}</h2>
      <p className="text-sm">{period}</p>
    </header>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 break-inside-avoid-page">
      <h3 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold uppercase">
        {n}. {title}
      </h3>
      {children}
    </section>
  );
}

function Table({ head, rows, empty = "None for this period." }: { head: string[]; rows: (string | number)[][]; empty?: string }) {
  if (rows.length === 0) return <p className="text-sm italic text-gray-500">{empty}</p>;
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} className="border border-gray-300 bg-gray-50 px-2 py-1 text-left font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="break-inside-avoid">
            {row.map((cell, j) => (
              <td key={j} className="border border-gray-300 px-2 py-1 align-top">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function measureRows(list: Measure[]) {
  return list.map((m, i) => [
    i + 1,
    documentLabel(m),
    m.title || "—",
    m.author || m.sponsor || "—",
    fmt(m.dateEnacted || m.dateAdopted),
    fmt(m.dateApprovedByLCE),
  ]);
}

const MEASURE_HEAD = ["#", "No.", "Title", "Author / Sponsor", "Enacted / Adopted", "Approved by Mayor"];

function summaryRows(r: PeriodReport): [string, number][] {
  const t = r.totals;
  return [
    ["Ordinances enacted", t.ordinances],
    ["Appropriation ordinances enacted", t.appropriationOrdinances],
    ["Resolutions adopted", t.resolutions],
    ["Measures approved by the Municipal Mayor", t.approvedByLce],
    ["Regular sessions held", t.regularSessions],
    ["Special sessions held", t.specialSessions],
    ["Committee reports submitted", t.committeeReports],
    ["Document requests received from the public", t.documentRequests],
    ["Document requests served (ready / released)", t.documentRequestsReleased],
    ["Activities with photo / video documentation", t.activitiesDocumented ?? 0],
  ];
}

function quarterRows(r: PeriodReport) {
  return (r.quarters || []).map((q) => [`${ORDINAL[q.quarter - 1]} Quarter`, q.ordinances, q.resolutions, q.sessions, q.committeeReports]);
}

function Accomplishment({ r }: { r: PeriodReport }) {
  const ordinances = r.measures.filter((m) => m.documentType !== "RESOLUTION");
  const resolutions = r.measures.filter((m) => m.documentType === "RESOLUTION");
  return (
    <>
      <Section n="I" title="Summary of accomplishments">
        <Table head={["Indicator", "Number"]} rows={summaryRows(r)} />
      </Section>
      {r.quarters && (
        <Section n="I-A" title="Accomplishments per quarter">
          <Table head={["Quarter", "Ordinances (incl. appropriation)", "Resolutions", "Sessions", "Committee reports"]} rows={quarterRows(r)} />
        </Section>
      )}
      <Section n="II" title="Ordinances enacted">
        <Table head={MEASURE_HEAD} rows={measureRows(ordinances)} />
      </Section>
      <Section n="III" title="Resolutions adopted">
        <Table head={MEASURE_HEAD} rows={measureRows(resolutions)} />
      </Section>
      <Section n="IV" title="Sessions conducted">
        <Table
          head={["#", "Session", "Date", "Presiding officer", "Minutes"]}
          rows={r.sessions.map((s, i) => [
            i + 1,
            `${s.sessionNumber} ${s.sessionType === "SPECIAL" ? "Special" : "Regular"} Session`,
            fmt(s.sessionDate),
            s.presidingOfficer || "—",
            s.status === "APPROVED" ? "Approved" : "Draft",
          ])}
        />
      </Section>
      <Section n="V" title="Committee reports submitted">
        <Table
          head={["#", "Report No.", "Committee", "Subject", "Recommendation", "Date"]}
          rows={r.committeeReports.map((c, i) => [i + 1, c.reportNumber, c.committee, c.title, c.recommendation || "—", fmt(c.dateSubmitted)])}
        />
      </Section>
      <Section n="VI" title="Measures still in process">
        <p className="mb-2 text-xs text-gray-600">Filed measures not yet enacted or adopted, with their current stage.</p>
        <Table
          head={["#", "No.", "Title", "Author / Sponsor", "Current stage"]}
          rows={r.inProcess.map((m, i) => [i + 1, documentLabel(m), m.title || "—", m.author || m.sponsor || "—", stageLabel(currentStage(m))])}
        />
      </Section>
      <Section n="VII" title="Photo / video documentation">
        <Documentation list={r.documentation || []} />
      </Section>
    </>
  );
}

// Photos two to a row with captions, like the annex of a printed accomplishment report. Videos play
// on screen; on paper they show as a labelled box, since they cannot be printed.
function Documentation({ list }: { list: ActivityDoc[] }) {
  if (list.length === 0)
    return <p className="text-sm italic text-gray-500">No photo or video documentation for this period. Add it under “Photo &amp; video documentation”.</p>;
  return (
    <div className="space-y-5">
      {list.map((a) => (
        <div key={a._id}>
          <p className="break-after-avoid text-xs font-semibold">
            {a.title}
            <span className="font-normal text-gray-600">
              {" "}
              · {fmt(a.date)} · {categoryLabel(a.category)}
              {a.venue && ` · ${a.venue}`}
            </span>
          </p>
          {a.description && <p className="mt-0.5 text-xs text-gray-700">{a.description}</p>}
          <div className="mt-2 grid grid-cols-2 gap-3">
            {a.media.map((m) => {
              const src = apiClient.fileUrl(`/activity-docs/${a._id}/media/${m._id}`);
              return (
                <figure key={m._id} className="break-inside-avoid">
                  {isVideo(m) ? (
                    <>
                      <video src={`${src}#t=0.5`} controls preload="metadata" playsInline className="aspect-[4/3] w-full rounded border border-gray-300 bg-black object-contain print:hidden" />
                      <div className="hidden aspect-[4/3] w-full flex-col items-center justify-center rounded border border-gray-400 text-center text-xs print:flex">
                        <span className="text-2xl">▶</span>
                        Video: {m.originalFileName}
                        <span className="text-[10px] text-gray-500">Digital copy on file at the Office of the SB Secretary</span>
                      </div>
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={m.caption || a.title} className="aspect-[4/3] w-full rounded border border-gray-300 object-cover" />
                  )}
                  <figcaption className="mt-1 text-center text-[11px] italic">{m.caption || a.title}</figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Legislative({ r }: { r: PeriodReport }) {
  const t = r.totals;
  return (
    <>
      <Section n="I" title="Number of measures">
        <Table
          head={["Type", "Number"]}
          rows={[
            ["Ordinances", t.ordinances],
            ["Appropriation ordinances", t.appropriationOrdinances],
            ["Resolutions", t.resolutions],
            ["Total", t.ordinances + t.appropriationOrdinances + t.resolutions],
          ]}
        />
      </Section>
      {r.quarters && (
        <Section n="I-A" title="Measures per quarter">
          <Table head={["Quarter", "Ordinances (incl. appropriation)", "Resolutions"]} rows={(r.quarters || []).map((q) => [`${ORDINAL[q.quarter - 1]} Quarter`, q.ordinances, q.resolutions])} />
        </Section>
      )}
      <Section n="II" title="By classification">
        <Table head={["Classification", "Number"]} rows={r.byClassification.map((c) => [c.name, c.count])} />
      </Section>
      <Section n="III" title="By author / sponsor">
        <Table head={["Author / Sponsor", "Number"]} rows={r.byAuthor.map((c) => [c.name, c.count])} />
      </Section>
      <Section n="IV" title="List of measures">
        <Table
          head={["#", "No.", "Title", "Classification", "Author / Sponsor", "Enacted / Adopted", "Approved by Mayor", "Status"]}
          rows={r.measures.map((m, i) => [
            i + 1,
            documentLabel(m),
            m.title || "—",
            m.classification || "—",
            m.author || m.sponsor || "—",
            fmt(m.dateEnacted || m.dateAdopted),
            fmt(m.dateApprovedByLCE),
            m.status || "—",
          ])}
        />
      </Section>
    </>
  );
}

function Signatories() {
  return (
    <div className="mt-12 grid grid-cols-2 gap-12 break-inside-avoid text-sm">
      {[
        ["Prepared by:", "Secretary to the Sangguniang Bayan"],
        ["Noted by:", "Municipal Vice Mayor / Presiding Officer"],
      ].map(([label, role]) => (
        <div key={label}>
          <p>{label}</p>
          <div className="mt-10 border-b border-gray-800" />
          <p className="mt-1 text-xs">{role}</p>
        </div>
      ))}
    </div>
  );
}

function BucketTable({ title, buckets }: { title: string; buckets: Bucket[] }) {
  return (
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
}

// CSV with a UTF-8 BOM, which Excel opens directly (keeps ñ and dashes intact).
function downloadCsv(kind: ReportKind, r: PeriodReport) {
  const lines: (string | number)[][] = [
    ["Sangguniang Bayan ng Liloan, Southern Leyte"],
    [reportTitle(kind, r)],
    [periodLabel(r)],
    [],
  ];
  const block = (title: string, head: string[], rows: (string | number)[][]) => {
    lines.push([title], head, ...rows, []);
  };
  if (kind === "accomplishment") {
    block("Summary of accomplishments", ["Indicator", "Number"], summaryRows(r));
    if (r.quarters) block("Per quarter", ["Quarter", "Ordinances", "Resolutions", "Sessions", "Committee reports"], quarterRows(r));
    block("Ordinances enacted", MEASURE_HEAD, measureRows(r.measures.filter((m) => m.documentType !== "RESOLUTION")));
    block("Resolutions adopted", MEASURE_HEAD, measureRows(r.measures.filter((m) => m.documentType === "RESOLUTION")));
    block(
      "Sessions conducted",
      ["#", "Session", "Date", "Presiding officer"],
      r.sessions.map((s, i) => [i + 1, `${s.sessionNumber} ${s.sessionType}`, fmt(s.sessionDate), s.presidingOfficer || ""]),
    );
    block(
      "Committee reports",
      ["#", "Report No.", "Committee", "Subject", "Recommendation", "Date"],
      r.committeeReports.map((c, i) => [i + 1, c.reportNumber, c.committee, c.title, c.recommendation || "", fmt(c.dateSubmitted)]),
    );
    block(
      "Measures still in process",
      ["#", "No.", "Title", "Author / Sponsor", "Current stage"],
      r.inProcess.map((m, i) => [i + 1, documentLabel(m), m.title || "", m.author || m.sponsor || "", stageLabel(currentStage(m))]),
    );
    block(
      "Photo / video documentation",
      ["#", "Activity", "Date", "Kind", "Venue", "Photos", "Videos"],
      (r.documentation || []).map((a, i) => [
        i + 1,
        a.title,
        fmt(a.date),
        categoryLabel(a.category),
        a.venue || "",
        a.media.filter((m) => !isVideo(m)).length,
        a.media.filter(isVideo).length,
      ]),
    );
  } else {
    block("By classification", ["Classification", "Number"], r.byClassification.map((c) => [c.name, c.count]));
    block("By author / sponsor", ["Author / Sponsor", "Number"], r.byAuthor.map((c) => [c.name, c.count]));
    block(
      "List of measures",
      ["#", "No.", "Title", "Classification", "Author / Sponsor", "Enacted / Adopted", "Approved by Mayor", "Status"],
      r.measures.map((m, i) => [
        i + 1,
        documentLabel(m),
        m.title || "",
        m.classification || "",
        m.author || m.sponsor || "",
        fmt(m.dateEnacted || m.dateAdopted),
        fmt(m.dateApprovedByLCE),
        m.status || "",
      ]),
    );
  }
  const csv = lines.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  const period = r.period.quarter ? `Q${r.period.quarter}-${r.period.year}` : `CY${r.period.year}`;
  a.download = `SB-Liloan-${kind}-report-${period}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
