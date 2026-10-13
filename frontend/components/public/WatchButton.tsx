"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { getWatchlist, onWatchlistChange, toggleWatch } from "../../lib/public";

/** Follow / unfollow a measure; the list is kept in this browser only. */
export default function WatchButton({ id, label, compact = false }: { id: string; label: string; compact?: boolean }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => setOn(getWatchlist().includes(id));
    sync();
    return onWatchlistChange(sync);
  }, [id]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWatch(id);
      }}
      aria-pressed={on}
      aria-label={`${on ? "Stop following" : "Follow"} ${label}`}
      className={`pub-chip inline-flex items-center gap-1.5 ${
        on ? "border-gold-500 bg-amber-50 text-amber-900" : "border-gray-300 bg-white text-navy-900 hover:border-sb-700"
      } ${compact ? "min-h-[2.5rem] px-2.5 text-sm" : ""}`}
    >
      <Star className={`h-5 w-5 ${on ? "fill-gold-500 text-gold-500" : ""}`} aria-hidden />
      {on ? "Following" : "Follow"}
    </button>
  );
}
