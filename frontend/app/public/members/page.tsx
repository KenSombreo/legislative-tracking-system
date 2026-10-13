"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { publicApi } from "../../../lib/api/client";
import { PublicMember, formatDate } from "../../../lib/public";

function initials(name: string) {
  return name
    .replace(/^(hon\.?|atty\.?|dr\.?|engr\.?)\s+/i, "")
    .split(/\s+/)
    .filter((w) => /^[A-Za-zÑñ]/.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// The last word of the name, which is how authors are usually written on measures ("Chua, JW").
function surname(name: string) {
  const words = name.replace(/,.*$/, "").trim().split(/\s+/).filter((w) => !/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(w));
  return words[words.length - 1] || name;
}

export default function PublicMembersPage() {
  const [members, setMembers] = useState<PublicMember[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    publicApi
      .get<PublicMember[]>("/members")
      .then(setMembers)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold">Council members</h1>
        <p className="pub-muted mt-1 text-lg">
          The Municipal Vice Mayor presides over the Sangguniang Bayan, whose members propose, study and vote on ordinances
          and resolutions.
        </p>
      </header>

      {error && <p className="pub-card text-lg text-red-700">Could not load the list of members. Please try again.</p>}
      {!members && !error && <p className="pub-muted text-lg">Loading…</p>}
      {members?.length === 0 && <p className="pub-card pub-muted text-lg">The list of members has not been posted yet.</p>}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members?.map((m) => (
          <li key={m._id} className="pub-card flex flex-col">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sb-800 text-lg font-bold text-white"
              >
                {initials(m.fullName)}
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold leading-tight">{m.fullName}</h2>
                <p className="pub-muted text-base">{m.position}</p>
              </div>
            </div>
            {m.committees.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-600">Committees</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {m.committees.map((c) => (
                    <li key={c} className="pub-badge border-gray-300 bg-gray-50 text-gray-800">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(m.termStart || m.termEnd) && (
              <p className="pub-muted mt-3 text-sm">
                Term: {formatDate(m.termStart) || "—"} to {formatDate(m.termEnd) || "—"}
              </p>
            )}
            <Link href={`/public?q=${encodeURIComponent(surname(m.fullName))}`} className="pub-link mt-auto pt-4 text-base">
              Search measures by {surname(m.fullName)} →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
