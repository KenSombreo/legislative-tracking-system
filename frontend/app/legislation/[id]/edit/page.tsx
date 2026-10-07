"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProtectedShell from "../../../../components/layout/ProtectedShell";
import LegislationForm from "../../../../components/legislation/LegislationForm";
import { apiClient, ApiError } from "../../../../lib/api/client";
import { Legislation } from "../../../../lib/types";

export default function EditLegislationPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<Legislation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<Legislation>(`/legislation/${params.id}`)
      .then(setItem)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <ProtectedShell>
      <h1 className="mb-4 text-xl font-bold text-navy-900">Edit Legislation</h1>
      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {item && <LegislationForm documentType={item.documentType} initial={item} legislationId={item._id} />}
    </ProtectedShell>
  );
}
