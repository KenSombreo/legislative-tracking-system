"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { publicApi, publicPageUrl, ApiError } from "../../lib/api/client";
import { PaginatedResponse, PublicLegislation } from "../../lib/types";
import { DOCUMENT_TYPE_LABELS, DocumentType } from "../../lib/config/legislationFields";
import { documentLabel } from "../../lib/stages";
import { stageLabel, currentStage } from "../../lib/tracking";
import QrCode from "../../components/ui/QrCode";

interface Filters {
  q: string;
  type: string;
  year: string;
}

function readFilters(): Filters {
  const p = new URLSearchParams(window.location.search);
  return { q: p.get("q") || "", type: p.get("type") || "", year: p.get("year") || "" };
}

export default function PublicSearchPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Filters>({ q: "", type: "", year: "" });
  const [filters, setFilters] = useState<Filters | null>(null);
  const [page, setPage] = useState(1);
  const [years, setYears] = useState<number[]>([]);
  const [result, setResult] = useState<PaginatedResponse<PublicLegislation> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portalUrl, setPortalUrl] = useState("");

  useEffect(() => {
    const initial = readFilters();
    setDraft(initial);
    setFilters(initial);
    setPortalUrl(publicPageUrl("/public"));
    publicApi.get<number[]>("/legislation/years").then(setYears).catch(() => {});
  }, []);

  useEffect(() => {
    if (!filters) return;
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (filters.q) params.set("search", filters.q);
    if (filters.type) params.set("documentType", filters.type);
    if (filters.year) params.set("year", filters.year);
    if (!filters.q) params.set("sort", "-year");
    setLoading(true);
    setError(null);
    publicApi
      .get<PaginatedResponse<PublicLegislation>>(`/legislation?${params}`)
      .then(setResult)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load records. Please try again."))
      .finally(() => setLoading(false));
  }, [filters, page]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = { ...draft, q: draft.q.trim() };
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    router.replace(qs ? `/public?${qs}` : "/public");
    setPage(1);
    setFilters(next);
  };

  const clear = () => {
    const empty = { q: "", type: "", year: "" };
    setDraft(empty);
    setPage(1);
    setFilters(empty);
    router.replace("/public");
  };

  const hasFilters = !!(filters?.q || filters?.type || filters?.year);

  return (
    <div className="space-y-6">
      <section className="pub-card">
        <h1 className="font-serif text-3xl font-semibold">Search ordinances and resolutions</h1>
        <p className="pub-muted mt-1 text-lg">Type a number, title, year, or any word that appears in the document.</p>

        <form onSubmit={submit} className="mt-5 space-y-4" role="search">
          <div>
            <label htmlFor="q" className="pub-label">
              Search
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="q"
                type="search"
                value={draft.q}
                onChange={(e) => setDraft({ ...draft, q: e.target.value })}
                placeholder="e.g. 2023-05, tricycle, environment"
                className="pub-input"
                autoComplete="off"
              />
              <button type="submit" className="pub-btn shrink-0">
                <Search className="h-5 w-5" aria-hidden /> Search
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="type" className="pub-label">
                Type of record
              </label>
              <select
                id="type"
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                className="pub-input"
              >
                <option value="">All types</option>
                {Object.values(DocumentType).map((t) => (
                  <option key={t} value={t}>
                    {DOCUMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="year" className="pub-label">
                Year
              </label>
              <select
                id="year"
                value={draft.year}
                onChange={(e) => setDraft({ ...draft, year: e.target.value })}
                className="pub-input"
              >
                <option value="">All years</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </section>

      <section aria-live="polite" aria-busy={loading}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-semibold">
            {hasFilters ? "Search results" : "Latest records"}
            {result && <span className="pub-muted ml-2 text-lg font-normal">({result.meta.total} found)</span>}
          </h2>
          {hasFilters && (
            <button onClick={clear} className="pub-link text-lg">
              Clear search
            </button>
          )}
        </div>

        {error && <p className="pub-card text-lg text-red-700">{error}</p>}
        {loading && !result && <p className="pub-muted text-lg">Loading…</p>}
        {result && result.data.length === 0 && (
          <div className="pub-card text-lg">
            <p>No released records match your search.</p>
            <p className="pub-muted mt-2">
              Try fewer words, or{" "}
              <Link href="/public/request" className="pub-link">
                ask the SB office for a copy
              </Link>
              .
            </p>
          </div>
        )}

        <ul className="space-y-3">
          {result?.data.map((item) => (
            <li key={item._id}>
              <Link
                href={`/public/legislation/${item._id}`}
                className="pub-card block transition-colors hover:border-navy-700"
              >
                <p className="pub-muted text-base font-semibold uppercase tracking-wide">
                  {documentLabel(item)} · {item.year}
                </p>
                <p className="mt-1 text-xl font-semibold leading-snug">{item.title || "Untitled"}</p>
                <p className="pub-muted mt-2 text-base">
                  Stage: <strong>{stageLabel(currentStage(item))}</strong>
                  {(item.author || item.sponsor) && <> · {item.author || item.sponsor}</>}
                </p>
              </Link>
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
            <button
              className="pub-btn-outline"
              disabled={page >= result.meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next →
            </button>
          </nav>
        )}
      </section>

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
