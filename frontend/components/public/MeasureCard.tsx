import Link from "next/link";
import { PublicLegislation } from "../../lib/types";
import { documentLabel } from "../../lib/stages";
import { TRACKING_STAGES, currentStageIndex } from "../../lib/tracking";
import { authorLine, formatDate, lastActionDate, progressBadgeClass, progressLabel, progressOf, stepLine } from "../../lib/public";
import WatchButton from "./WatchButton";

/** One measure in the public list: number, outcome, topic, title, where it is now, who filed it. */
export default function MeasureCard({ item }: { item: PublicLegislation }) {
  const progress = progressOf(item);
  const label = documentLabel(item);
  const step = currentStageIndex(item);
  const last = formatDate(lastActionDate(item));
  const by = authorLine(item);

  return (
    <article className="pub-card relative transition-colors hover:border-sb-700">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-base font-semibold text-sb-800">{label}</span>
        <span className={`pub-badge ${progressBadgeClass(progress)}`}>{progressLabel(progress)}</span>
        {item.classification && <span className="pub-badge border-gray-300 bg-gray-50 text-gray-800">{item.classification}</span>}
        <span className="relative z-10 ml-auto">
          <WatchButton id={item._id} label={label} compact />
        </span>
      </div>

      <h3 className="mt-2 text-xl font-semibold leading-snug">
        {/* The whole card is the link target; the button above sits on top of it. */}
        <Link href={`/public/legislation/${item._id}`} className="after:absolute after:inset-0 after:content-[''] hover:underline">
          {item.title || "Untitled"}
        </Link>
      </h3>

      <div className="mt-3 flex gap-1" aria-hidden>
        {TRACKING_STAGES.map((s, i) => (
          <span
            key={s.key}
            className={`h-1.5 flex-1 rounded-full ${
              i < step ? "bg-sb-600" : i === step ? (progress === "IN_PROGRESS" ? "bg-gold-500" : progress === "FAILED" ? "bg-red-500" : progress === "WITHDRAWN" ? "bg-gray-400" : "bg-sb-600") : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-base font-semibold">{stepLine(item)}</p>
      <p className="pub-muted mt-1 text-base">
        {[last && `Last action ${last}`, by].filter(Boolean).join(" · ")}
      </p>
    </article>
  );
}
