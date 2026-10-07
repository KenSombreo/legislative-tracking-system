"use client";

import { DocumentType, DOCUMENT_TYPE_LABELS } from "../../lib/config/legislationFields";

export interface LegislationFilterValues {
  year?: string;
  documentType?: DocumentType | "";
  classification?: string;
  status?: string;
  author?: string;
  sponsor?: string;
  dateFrom?: string;
  dateTo?: string;
}

export default function LegislationFilters({
  values,
  onChange,
  years,
  showTypeFilter = true,
}: {
  values: LegislationFilterValues;
  onChange: (values: LegislationFilterValues) => void;
  years: number[];
  showTypeFilter?: boolean;
}) {
  const update = (patch: Partial<LegislationFilterValues>) => onChange({ ...values, ...patch });

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-gray-500">Year</label>
        <select
          value={values.year || ""}
          onChange={(e) => update({ year: e.target.value })}
          className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">All</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {showTypeFilter && (
        <div>
          <label className="block text-xs font-medium text-gray-500">Type</label>
          <select
            value={values.documentType || ""}
            onChange={(e) => update({ documentType: e.target.value as DocumentType | "" })}
            className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {Object.values(DocumentType).map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-500">Classification</label>
        <input
          value={values.classification || ""}
          onChange={(e) => update({ classification: e.target.value })}
          className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">Status</label>
        <input
          value={values.status || ""}
          onChange={(e) => update({ status: e.target.value })}
          className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">Author/Sponsor</label>
        <input
          value={values.author || values.sponsor || ""}
          onChange={(e) => update({ author: e.target.value, sponsor: e.target.value })}
          className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">From</label>
        <input
          type="date"
          value={values.dateFrom || ""}
          onChange={(e) => update({ dateFrom: e.target.value })}
          className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">To</label>
        <input
          type="date"
          value={values.dateTo || ""}
          onChange={(e) => update({ dateTo: e.target.value })}
          className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>

      <button
        onClick={() => onChange({})}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
      >
        Clear
      </button>
    </div>
  );
}
