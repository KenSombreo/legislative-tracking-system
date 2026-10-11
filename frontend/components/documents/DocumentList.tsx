"use client";

import { useState } from "react";
import { FileText, Eye, Download, Trash2, X } from "lucide-react";
import { DocumentFile } from "../../lib/types";
import { apiClient } from "../../lib/api/client";
import { hasRole } from "../../lib/auth";

const TEXT_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Indexing text…", cls: "bg-gray-100 text-gray-600" },
  TEXT: { label: "Searchable", cls: "bg-emerald-50 text-emerald-700" },
  OCR: { label: "Searchable (OCR)", cls: "bg-emerald-50 text-emerald-700" },
  NO_TEXT: { label: "Scanned, not searchable", cls: "bg-amber-50 text-amber-800" },
  FAILED: { label: "Text unreadable", cls: "bg-red-50 text-red-700" },
};

// Files saved before the per-file flag existed count as public only when they are the main document.
function fileIsPublic(doc: DocumentFile) {
  return doc.isPublic ?? doc.documentCategory === "MAIN_DOCUMENT";
}

export default function DocumentList({
  documents,
  onDelete,
  onTogglePublic,
}: {
  documents: DocumentFile[];
  onDelete?: (doc: DocumentFile) => void;
  onTogglePublic?: (doc: DocumentFile, isPublic: boolean) => void;
}) {
  const [preview, setPreview] = useState<DocumentFile | null>(null);

  if (!documents || documents.length === 0) {
    return <p className="text-sm text-gray-400">No documents uploaded.</p>;
  }

  return (
    <>
      <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 bg-white">
        {documents.map((doc) => (
          <li key={doc._id} className="flex items-center justify-between px-4 py-2 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium text-navy-900">{doc.originalFileName}</p>
                <p className="text-xs text-gray-400">
                  {doc.documentCategory.replace(/_/g, " ")} · {(doc.fileSize / 1024).toFixed(1)} KB
                </p>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {doc.textStatus && TEXT_STATUS[doc.textStatus] && (
                    <span className={`rounded px-1.5 py-px text-[10px] font-medium ${TEXT_STATUS[doc.textStatus].cls}`}>
                      {TEXT_STATUS[doc.textStatus].label}
                    </span>
                  )}
                  {onTogglePublic ? (
                    <button
                      onClick={() => onTogglePublic(doc, !fileIsPublic(doc))}
                      title="Whether the public portal shows this file (once the record is released)"
                      className={`rounded px-1.5 py-px text-[10px] font-medium ${
                        fileIsPublic(doc) ? "bg-sky-50 text-sky-800 hover:bg-sky-100" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {fileIsPublic(doc) ? "Public file · make internal" : "Internal file · make public"}
                    </button>
                  ) : (
                    <span className="rounded bg-gray-100 px-1.5 py-px text-[10px] font-medium text-gray-600">
                      {fileIsPublic(doc) ? "Public file" : "Internal file"}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {doc.mimeType === "application/pdf" ? (
                <button
                  onClick={() => setPreview(doc)}
                  className="flex items-center gap-1 text-navy-700 hover:underline"
                >
                  <Eye className="h-4 w-4" /> View PDF
                </button>
              ) : (
                <a
                  href={apiClient.fileUrl(`/documents/${doc._id}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-navy-700 hover:underline"
                >
                  <Eye className="h-4 w-4" /> View
                </a>
              )}
              <a
                href={apiClient.fileUrl(`/documents/${doc._id}?download=1`)}
                className="flex items-center gap-1 text-navy-700 hover:underline"
              >
                <Download className="h-4 w-4" /> Download
              </a>
              {onDelete && hasRole("ADMIN", "STAFF") && (
                <button onClick={() => onDelete(doc)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <p className="truncate text-sm font-medium text-navy-900">{preview.originalFileName}</p>
              <button onClick={() => setPreview(null)} className="text-gray-500 hover:text-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <iframe
              src={apiClient.fileUrl(`/documents/${preview._id}`)}
              className="h-full w-full flex-1 rounded-b-lg"
              title={preview.originalFileName}
            />
          </div>
        </div>
      )}
    </>
  );
}
