"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import ProtectedShell from "../layout/ProtectedShell";
import LegislationTable from "./LegislationTable";
import LegislationFilters, { LegislationFilterValues } from "./LegislationFilters";
import SearchBar from "../ui/SearchBar";
import Pagination from "../ui/Pagination";
import ConfirmDialog from "../ui/ConfirmDialog";
import { apiClient, ApiError } from "../../lib/api/client";
import { hasRole } from "../../lib/auth";
import { Legislation, PaginatedResponse } from "../../lib/types";
import { DocumentType } from "../../lib/config/legislationFields";

export default function LegislationListPage({
  title,
  endpoint,
  documentTypePreset,
  newHref,
}: {
  title: string;
  endpoint: string;
  documentTypePreset?: DocumentType;
  newHref: string;
}) {
  const [items, setItems] = useState<Legislation[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("search") || ""
  );
  const [filters, setFilters] = useState<LegislationFilterValues>({});
  const [years, setYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Legislation | null>(null);

  const load = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (filters.year) params.set("year", filters.year);
      if (!documentTypePreset && filters.documentType) params.set("documentType", filters.documentType);
      if (filters.classification) params.set("classification", filters.classification);
      if (filters.status) params.set("status", filters.status);
      if (filters.author) params.set("author", filters.author);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      const res = await apiClient.get<PaginatedResponse<Legislation>>(`${endpoint}?${params.toString()}`);
      setItems(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load legislation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiClient.get<number[]>("/legislation/years").then(setYears).catch(() => {});
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters]);

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await apiClient.delete(`/legislation/${toDelete._id}`);
      setToDelete(null);
      load(meta.page);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete");
      setToDelete(null);
    }
  };

  return (
    <ProtectedShell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy-900">{title}</h1>
        {hasRole("ADMIN", "STAFF") && (
          <Link
            href={newHref}
            className="flex items-center gap-1.5 rounded-md bg-navy-800 px-3 py-2 text-sm text-white hover:bg-navy-900"
          >
            <Plus className="h-4 w-4" /> New
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search title, number, author..." />
      </div>

      <div className="mb-4">
        <LegislationFilters
          values={filters}
          onChange={setFilters}
          years={years}
          showTypeFilter={!documentTypePreset}
        />
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <LegislationTable
            items={items}
            canEdit={hasRole("ADMIN", "STAFF")}
            canDelete={hasRole("ADMIN")}
            onDelete={setToDelete}
            showType={!documentTypePreset}
          />
          <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={load} />
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete Legislation"
        message={`Are you sure you want to delete "${toDelete?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </ProtectedShell>
  );
}
