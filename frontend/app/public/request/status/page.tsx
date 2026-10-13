"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { publicApi, ApiError } from "../../../../lib/api/client";
import { RequestStatus } from "../../../../lib/types";
import { REQUEST_STATUS } from "../../../../lib/requests";

interface RequestLookup {
  referenceCode: string;
  requestedDocuments: string;
  copies: number;
  certifiedTrueCopy: boolean;
  status: RequestStatus;
  responseMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function RequestStatusPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<RequestLookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async (value: string) => {
    const c = value.trim().toUpperCase();
    if (!c) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await publicApi.get<RequestLookup>(`/document-requests/${encodeURIComponent(c)}`));
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? "No request found with that reference code. Please check the code and try again."
          : "Could not check the request. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("code");
    if (initial) {
      setCode(initial);
      lookup(initial);
    }
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.replace(`/public/request/status?code=${encodeURIComponent(code.trim().toUpperCase())}`);
    lookup(code);
  };

  const status = result ? REQUEST_STATUS[result.status] : null;

  return (
    <div className="space-y-6">
      <section className="pub-card">
        <h1 className="font-serif text-3xl font-semibold">Check my request</h1>
        <p className="pub-muted mt-1 text-lg">Enter the reference code you received, e.g. DR-2026-AB12CD.</p>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="code" className="sr-only">
            Reference code
          </label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="DR-2026-XXXXXX"
            className="pub-input font-mono uppercase"
            autoComplete="off"
            required
          />
          <button type="submit" className="pub-btn shrink-0" disabled={loading}>
            {loading ? "Checking…" : "Check"}
          </button>
        </form>
      </section>

      <div aria-live="polite">
        {error && <p className="pub-card text-lg text-red-700">{error}</p>}
        {result && status && (
          <section className="pub-card">
            <p className="pub-muted text-base">Reference code</p>
            <p className="font-mono text-2xl font-bold">{result.referenceCode}</p>
            <p className={`mt-4 inline-block rounded-lg px-4 py-2 text-xl font-bold ${status.cls}`}>{status.label}</p>
            <p className="mt-2 text-lg">{status.publicHint}</p>
            {result.responseMessage && (
              <p className="mt-4 rounded-lg bg-sb-50 p-4 text-lg">
                <strong>Message from the SB office:</strong> {result.responseMessage}
              </p>
            )}
            <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="pub-muted text-base">Requested</dt>
                <dd className="text-lg">{result.requestedDocuments}</dd>
              </div>
              <div>
                <dt className="pub-muted text-base">Copies</dt>
                <dd className="text-lg">
                  {result.copies}
                  {result.certifiedTrueCopy ? " (certified true copy)" : ""}
                </dd>
              </div>
              <div>
                <dt className="pub-muted text-base">Filed on</dt>
                <dd className="text-lg">{new Date(result.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </section>
        )}
      </div>
    </div>
  );
}
