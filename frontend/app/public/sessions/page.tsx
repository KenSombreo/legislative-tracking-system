"use client";

import { useEffect, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { publicApi } from "../../../lib/api/client";
import { PublicEvent, formatEventWhen } from "../../../lib/public";

const TYPE_LABEL: Record<PublicEvent["eventType"], string> = {
  REGULAR_SESSION: "Regular session",
  SPECIAL_SESSION: "Special session",
  COMMITTEE_HEARING: "Committee hearing",
  OTHER: "Event",
};

export default function PublicSessionsPage() {
  const [data, setData] = useState<{ upcoming: PublicEvent[]; past: PublicEvent[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    publicApi
      .get<{ upcoming: PublicEvent[]; past: PublicEvent[] }>("/sessions")
      .then(setData)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl font-semibold">Sessions and hearings</h1>
        <p className="pub-muted mt-1 text-lg">
          Sessions of the Sangguniang Bayan are open to the public. Committee hearings are where residents can speak on a
          proposed measure.
        </p>
      </header>

      {error && <p className="pub-card text-lg text-red-700">Could not load the calendar. Please try again.</p>}
      {!data && !error && <p className="pub-muted text-lg">Loading…</p>}

      {data && (
        <>
          <EventList title="Coming up" events={data.upcoming} empty="No sessions or hearings have been scheduled yet." />
          <EventList title="Recent (last 90 days)" events={data.past} empty="No sessions or hearings in the last 90 days." />
        </>
      )}
    </div>
  );
}

function EventList({ title, events, empty }: { title: string; events: PublicEvent[]; empty: string }) {
  return (
    <section>
      <h2 className="mb-3 text-2xl font-semibold">{title}</h2>
      {events.length === 0 ? (
        <p className="pub-card pub-muted text-lg">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li key={e._id} className="pub-card">
              <p className="flex flex-wrap items-center gap-2">
                <span className="pub-badge border-sb-100 bg-sb-50 text-sb-900">{TYPE_LABEL[e.eventType]}</span>
                {e.committee && <span className="pub-badge border-gray-300 bg-gray-50 text-gray-800">{e.committee}</span>}
              </p>
              <h3 className="mt-2 text-xl font-semibold">{e.title}</h3>
              <p className="mt-2 flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5 shrink-0" aria-hidden /> {formatEventWhen(e.date, e.startTime)}
              </p>
              {e.venue && (
                <p className="pub-muted mt-1 flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 shrink-0" aria-hidden /> {e.venue}
                </p>
              )}
              {e.description && <p className="pub-muted mt-3 whitespace-pre-line text-base">{e.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
