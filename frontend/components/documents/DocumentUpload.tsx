"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { apiClient, ApiError } from "../../lib/api/client";

export default function DocumentUpload({
  legislativeDocumentId,
  onUploaded,
}: {
  legislativeDocumentId: string;
  onUploaded: () => void;
}) {
  const [category, setCategory] = useState("MAIN_DOCUMENT");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("legislativeDocumentId", legislativeDocumentId);
      form.append("documentCategory", category);
      await apiClient.upload("/documents/upload", form);
      onUploaded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-gray-300 p-3">
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
      >
        <option value="MAIN_DOCUMENT">Main Document</option>
        <option value="SUPPORTING_DOCUMENT">Supporting Document</option>
        <option value="ATTACHMENT">Attachment</option>
      </select>
      <label className="flex cursor-pointer items-center gap-2 rounded-md bg-navy-800 px-3 py-1.5 text-sm text-white hover:bg-navy-900">
        <Upload className="h-4 w-4" />
        {uploading ? "Uploading..." : "Upload File"}
        <input
          type="file"
          className="hidden"
          disabled={uploading}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
