"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import ProtectedShell from "../../components/layout/ProtectedShell";
import { apiClient, ApiError } from "../../lib/api/client";
import { DocumentFile } from "../../lib/types";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<DocumentFile[]>("/documents")
      .then(setDocs)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load documents"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedShell>
      <h1 className="mb-4 text-xl font-bold text-navy-900">Documents</h1>
      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">File</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Category</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Size</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Legislation</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Uploaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No documents uploaded yet.
                  </td>
                </tr>
              )}
              {docs.map((doc) => (
                <tr key={doc._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <a
                      href={apiClient.fileUrl(`/documents/${doc._id}`)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-navy-700 hover:underline"
                    >
                      <FileText className="h-4 w-4" /> {doc.originalFileName}
                    </a>
                  </td>
                  <td className="px-4 py-2">{doc.documentCategory.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2">{(doc.fileSize / 1024).toFixed(1)} KB</td>
                  <td className="px-4 py-2">
                    <Link href={`/legislation/${doc.legislativeDocumentId}`} className="text-navy-700 hover:underline">
                      View
                    </Link>
                  </td>
                  <td className="px-4 py-2">{new Date(doc.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProtectedShell>
  );
}
