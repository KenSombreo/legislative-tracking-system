"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { publicApi, publicPageUrl, ApiError } from "../../lib/api/client";
import { PaginatedResponse, PublicLegislation } from "../../lib/types";
import { DocumentType } from "../../lib/config/legislationFields";
import { PROGRESS_OPTIONS, PublicSummary, formatEventWhen } from "../../lib/public";
import MeasureCard from "../../components/public/MeasureCard";
import QrCode from "../../components/ui/QrCode";

interface Filters {
  q: string;
  type: string;
  progress: string;
  topic: string;
  year: string;
  sort: string;
}

const EMPTY: Filters = { q: "", type: "", progress: "", topic: "", year: "", sort: "" };

const TYPES = [
  { key: DocumentType.ORDINANCE, label: "Ordinances" },
  { key: DocumentType.APPROPRIATION_ORDINANCE, label: "Appropriation ordinances" },
  { key: DocumentType.RESOLUTION, label: "Resolutions" },
];

const SORTS = [
  { key: "", label: "Latest action" },
  { key: "-year", label: "Newest year first" },
  { key: "year", label: "Oldest year first" },
  { key: "documentNumber", label: "Number (A–Z)" },
];

function readFilters(): Filters {
  const p = new URLSearchParams(window.location.search);
  return Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p.get(k) || ""])) as unknown as Filters;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export default function PublicSearchPage() {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [filters, setFilters] = useState<Filters | null>(null);
  const [page, setPage] = useState(1);
  const [years, setYears] = useState<number[]>([]);
  const [summary, setSummary] = useState<PublicSummary | null>(null);
  const [result, setResult] = useState<PaginatedResponse<PublicLegislation> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portalUrl, setPortalUrl] = useState("");

  useEffect(() => {
    const initial = readFilters();
    setDraft(initial.q);
    setFilters(initial);
    setPortalUrl(publicPageUrl("/public"));
    publicApi.get<number[]>("/legislation/years").then(setYears).catch(() => {});
    publicApi.get<PublicSummary>("/summary").then(setSummary).catch(() => {});
  }, []);

  useEffect(() => {
    if (!filters) return;
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (filters.q) params.set("search", filters.q);
    if (filters.type) params.set("documentType", filters.type);
    if (filters.progress) params.set("progress", filters.progress);
    if (filters.topic) params.set("classification", filters.topic);
    if (filters.year) params.set("year", filters.year);
    params.set("sort", filters.sort || "-updatedAt");
    setLoading(true);
    setError(null);
    publicApi
      .get<PaginatedResponse<PublicLegislation>>(`/legislation?${params}`)
      .then(setResult)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load records. Please try again."))
      .finally(() => setLoading(false));
  }, [filters, page]);

  const apply = (next: Filters) => {
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    router.replace(qs ? `/public?${qs}` : "/public", { scroll: false });
    setPage(1);
    setFilters(next);
  };

  const set = (key: keyof Filters, value: string) => filters && apply({ ...filters, [key]: value });
  const toggle = (key: keyof Filters, value: string) => filters && set(key, filters[key] === value ? "" : value);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filters) apply({ ...filters, q: draft.trim() });
  };

  const clearAll = () => {
    setDraft("");
    apply({ ...EMPTY, sort: filters?.sort || "" });
  };

  const hasFilters = !!(filters && (filters.q || filters.type || filters.progress || filters.topic || filters.year));

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-sb-800 to-sb-950 px-5 py-8 text-white sm:px-8 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-sb-100">Legislative Tracker</p>
        <h1 className="mt-2 max-w-3xl font-serif text-3xl font-semibold leading-tight sm:text-4xl">
          See what the Sangguniang Bayan is deciding
        </h1>
        <p className="mt-3 max-w-3xl text-lg text-sb-100">
          Search every ordinance and resolution of the Sangguniang Bayan ng Liloan. Follow each one from filing to the
          Mayor&apos;s approval, read the documents, and see who authored it.
        </p>

        <form onSubmit={submit} className="mt-6 max-w-3xl" role="search">
          <label htmlFor="q" className="mb-1.5 block text-base font-semibold">
            Search legislation
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="q"
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Try “tricycle”, “CCTV”, “2026-411” or an author’s name"
              className="pub-input border-white"
              autoComplete="off"
            />
            <button type="submit" className="pub-btn shrink-0 bg-gold-400 text-sb-950 hover:bg-gold-500">
              <Search className="h-5 w-5" aria-hidden /> Search
            </button>
          </div>
        </form>

        {summary && (
          <p className="mt-5 max-w-3xl text-base text-sb-100">
            <strong className="text-white">{plural(summary.inProgress, "measure is", "measures are")}</strong> moving through the
            Sanggunian,{" "}
            <strong className="text-white">{plural(summary.enactedThisYear, "ordinance has", "ordinances have")}</strong> been enacted and{" "}
            <strong className="text-white">{plural(summary.adoptedThisYear, "resolution", "resolutions")}</strong> adopted in{" "}
            {summary.year}
            {summary.nextSession ? (
              <>
                , and the next session is{" "}
                <Link href="/public/sessions" className="font-semibold text-white underline underline-offset-2">
                  {formatEventWhen(summary.nextSession.date, summary.nextSession.startTime)}
                </Link>
                .
              </>
            ) : (
              "."
            )}
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[17rem_1fr]">
        <aside aria-labelledby="filters-heading" className="space-y-5 lg:sticky lg:top-4 lg:self-start">
          <h2 id="filters-heading" className="text-xl font-semibold">
            Narrow results
          </h2>

          <fieldset>
            <legend className="pub-label">Type</legend>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              {TYPES.map((t) => (
                <FilterChip key={t.key} on={filters?.type === t.key} onClick={() => toggle("type", t.key)}>
                  {t.label}
                </FilterChip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="pub-label">Status</legend>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              {PROGRESS_OPTIONS.map((p) => (
                <FilterChip key={p.key} on={filters?.progress === p.key} onClick={() => toggle("progress", p.key)}>
                  {p.label}
                </FilterChip>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="topic" className="pub-label">
              Topic
            </label>
            <select id="topic" value={filters?.topic || ""} onChange={(e) => set("topic", e.target.value)} className="pub-input">
              <option value="">All topics</option>
              {summary?.classifications.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="year" className="pub-label">
              Year
            </label>
            <select id="year" value={filters?.year || ""} onChange={(e) => set("year", e.target.value)} className="pub-input">
              <option value="">All years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {hasFilters && (
            <button onClick={clearAll} className="pub-btn-outline w-full">
              Clear all filters
            </button>
          )}
        </aside>

        <section aria-live="polite" aria-busy={loading} aria-labelledby="results-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 id="results-heading" className="text-xl font-semibold">
              {result ? (
                <>
                  Showing {result.data.length} of {plural(result.meta.total, "measure", "measures")}
                  {filters?.q && <span className="pub-muted font-normal"> for “{filters.q}”</span>}
                </>
              ) : (
                "Measures"
              )}
            </h2>
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-base font-semibold">
                Sort by
              </label>
              <select id="sort" value={filters?.sort || ""} onChange={(e) => set("sort", e.target.value)} className="pub-input w-auto">
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="pub-card text-lg text-red-700">{error}</p>}
          {loading && !result && <p className="pub-muted text-lg">Loading…</p>}
          {result && result.data.length === 0 && (
            <div className="pub-card text-lg">
              <p>No released records match your search.</p>
              <p className="pub-muted mt-2">
                Try fewer words or clear a filter, or{" "}
                <Link href="/public/request" className="pub-link">
                  ask the SB office for a copy
                </Link>
                .
              </p>
            </div>
          )}

          <ul className={`space-y-3 ${loading ? "opacity-60" : ""}`}>
            {result?.data.map((item) => (
              <li key={item._id}>
                <MeasureCard item={item} />
              </li>
            ))}
          </ul>

          {result && result.meta.totalPages > 1 && (
            <nav aria-label="Pages" className="mt-5 flex items-center justify-between gap-3">
              <button className="pub-btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                ← Previous
              </button>
              <span className="text-lg">
                Page {result.meta.page} of {result.meta.totalPages}
              </span>
              <button className="pub-btn-outline" disabled={page >= result.meta.totalPages} onClick={() => setPage(page + 1)}>
                Next →
              </button>
            </nav>
          )}
        </section>
      </div>

      {portalUrl && (
        <section className="pub-card flex flex-col items-center gap-4 sm:flex-row">
          <QrCode url={portalUrl} size={128} actions={false} />
          <div>
            <h2 className="text-xl font-semibold">Continue on your phone</h2>
            <p className="pub-muted mt-1 text-lg">
              Scan this code with your phone camera to open these public records on your own device.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`pub-chip ${on ? "border-sb-800 bg-sb-800 text-white" : "border-gray-300 bg-white text-navy-900 hover:border-sb-700"}`}
    >
      {on && <span aria-hidden>✓ </span>}
      {children}
    </button>
  );
}
