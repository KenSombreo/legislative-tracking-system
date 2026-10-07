"use client";

import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { Legislation } from "../../lib/types";
import StatusBadge from "../ui/StatusBadge";
import ClassificationBadge from "../ui/ClassificationBadge";
import { DOCUMENT_TYPE_LABELS } from "../../lib/config/legislationFields";

export default function LegislationTable({
  items,
  canEdit,
  canDelete,
  onDelete,
  showType = true,
}: {
  items: Legislation[];
  canEdit: boolean;
  canDelete: boolean;
  onDelete: (item: Legislation) => void;
  showType?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Number</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Year</th>
            {showType && <th className="px-4 py-2 text-left font-semibold text-gray-600">Type</th>}
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Title</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Classification</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Author/Sponsor</th>
            <th className="px-4 py-2 text-right font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                No records found.
              </td>
            </tr>
          )}
          {items.map((item) => (
            <tr key={item._id} className="hover:bg-gray-50">
              <td className="px-4 py-2 font-medium text-navy-900">{item.documentNumber}</td>
              <td className="px-4 py-2">{item.year}</td>
              {showType && <td className="px-4 py-2">{DOCUMENT_TYPE_LABELS[item.documentType]}</td>}
              <td className="max-w-xs truncate px-4 py-2" title={item.title}>
                {item.title}
              </td>
              <td className="px-4 py-2">
                <ClassificationBadge classification={item.classification} />
              </td>
              <td className="px-4 py-2">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-4 py-2">{item.author || item.sponsor || "—"}</td>
              <td className="px-4 py-2">
                <div className="flex justify-end gap-2">
                  <Link href={`/legislation/${item._id}`} className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
                    <Eye className="h-4 w-4" />
                  </Link>
                  {canEdit && (
                    <Link
                      href={`/legislation/${item._id}/edit`}
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => onDelete(item)}
                      className="rounded p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
