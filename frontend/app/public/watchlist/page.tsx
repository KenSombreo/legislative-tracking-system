"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { publicApi } from "../../../lib/api/client";
import { PublicLegislation } from "../../../lib/types";
import { getWatchlist, onWatchlistChange, toggleWatch } from "../../../lib/public";
import MeasureCard from "../../../components/public/MeasureCard";

export default function PublicWatchlistPage() {
  const [ids, setIds] = useState<string[] | null>(null);
  const [items, setItems] = useState<Record<string, PublicLegislation | null>>({});

  useEffect(() => {
    const sync = () => setIds(getWatchlist());
    sync();
    return onWatchlistChange(sync);
  }, []);

  // Fetch the ones not loaded yet. A record withdrawn from the portal comes back 404 and is shown as such.
  useEffect(() => {
    (ids || [])
      .filter((id) => !(id in items))
      .forEach((id) => {
        publicApi
          .get<PublicLegislation>(`/legislation/${id}`)
          .then((rec) => setItems((prev) => ({ ...prev, [id]: rec })))
          .catch(() => setItems((prev) => ({ ...prev, [id]: null })));
      });
  }, [ids, items]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold">My watchlist</h1>
        <p className="pub-muted mt-1 text-lg">
          Measures you follow, with where each one is now. The list is saved on this device only. No account is needed.
        </p>
      </header>

      {ids && ids.length === 0 && (
        <div className="pub-card text-lg">
          <p>You are not following any measure yet.</p>
          <p className="pub-muted mt-2">
            Press <strong>Follow</strong> on a measure in{" "}
            <Link href="/public" className="pub-link">
              Legislation
            </Link>{" "}
            to keep track of it here.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {ids?.map((id) => {
          const item = items[id];
          if (item === undefined) return <li key={id} className="pub-card pub-muted text-lg">Loading…</li>;
          if (item === null)
            return (
              <li key={id} className="pub-card flex flex-wrap items-center justify-between gap-3 text-lg">
                <span className="pub-muted">This record is no longer available to the public.</span>
                <button className="pub-btn-outline" onClick={() => toggleWatch(id)}>
                  Remove
                </button>
              </li>
            );
          return (
            <li key={id}>
              <MeasureCard item={item} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
