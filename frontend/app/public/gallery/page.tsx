"use client";

import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";
import { publicApi } from "../../../lib/api/client";
import { ActivityDoc, ActivityMedia } from "../../../lib/types";
import { categoryLabel, isVideo } from "../../../lib/activities";
import { formatDate } from "../../../lib/public";

const mediaUrl = (a: ActivityDoc, m: ActivityMedia) => publicApi.fileUrl(`/activities/${a._id}/media/${m._id}`);

export default function PublicGalleryPage() {
  const [items, setItems] = useState<ActivityDoc[] | null>(null);
  const [error, setError] = useState(false);
  const [viewing, setViewing] = useState<{ activity: ActivityDoc; media: ActivityMedia } | null>(null);

  useEffect(() => {
    publicApi
      .get<ActivityDoc[]>("/activities")
      .then(setItems)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setViewing(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold">Photos and videos</h1>
        <p className="pub-muted mt-1 text-lg">Sessions, public hearings and other activities of the Sangguniang Bayan.</p>
      </header>

      {error && <p className="pub-card text-lg text-red-700">Could not load the photos. Please try again.</p>}
      {!items && !error && <p className="pub-muted text-lg">Loading…</p>}
      {items?.length === 0 && <p className="pub-card pub-muted text-lg">No photos or videos have been posted yet.</p>}

      {items?.map((a) => (
        <section key={a._id} className="pub-card" aria-labelledby={`act-${a._id}`}>
          <p className="flex flex-wrap items-center gap-2">
            <span className="pub-badge border-sb-100 bg-sb-50 text-sb-900">{categoryLabel(a.category)}</span>
            <span className="pub-muted text-base">
              {formatDate(a.date, "long")}
              {a.venue && ` · ${a.venue}`}
            </span>
          </p>
          <h2 id={`act-${a._id}`} className="mt-2 text-2xl font-semibold">
            {a.title}
          </h2>
          {a.description && <p className="pub-muted mt-1 whitespace-pre-line text-lg">{a.description}</p>}
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {a.media.map((m) => (
              <li key={m._id}>
                <button
                  type="button"
                  onClick={() => setViewing({ activity: a, media: m })}
                  className="relative block aspect-[4/3] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
                  aria-label={`${isVideo(m) ? "Play video" : "View photo"}: ${m.caption || a.title}`}
                >
                  {isVideo(m) ? (
                    <>
                      <video src={`${mediaUrl(a, m)}#t=0.5`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="rounded-full bg-black/60 p-3 text-white">
                          <Play className="h-7 w-7" aria-hidden />
                        </span>
                      </span>
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(a, m)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </button>
                {m.caption && <p className="mt-1 text-base">{m.caption}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={() => setViewing(null)}>
          <button className="absolute right-4 top-4 flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-lg font-semibold text-black" onClick={() => setViewing(null)}>
            <X className="h-5 w-5" aria-hidden /> Close
          </button>
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {isVideo(viewing.media) ? (
              <video src={mediaUrl(viewing.activity, viewing.media)} controls autoPlay playsInline className="max-h-[80vh] w-full rounded" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(viewing.activity, viewing.media)} alt={viewing.media.caption || viewing.activity.title} className="max-h-[80vh] rounded object-contain" />
            )}
            <figcaption className="mt-3 text-center text-lg text-white">
              {viewing.media.caption || viewing.activity.title}
              <span className="block text-base text-gray-300">{formatDate(viewing.activity.date, "long")}</span>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
