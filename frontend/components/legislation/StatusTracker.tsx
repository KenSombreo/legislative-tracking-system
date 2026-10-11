"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Legislation, PublicLegislation, StageEntry, UserRef } from "../../lib/types";
import { TRACKING_STAGES, currentStageIndex, stageDates, stageLabel } from "../../lib/tracking";

function formatDate(value: string | undefined) {
  return value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : null;
}

function who(u: UserRef | string | null | undefined) {
  if (!u || typeof u === "string") return null;
  return u.fullName || u.username;
}

/**
 * Where a measure is in the legislative process, as a list of steps. With `onUpdate`, staff can
 * move it to another step and see the history with notes.
 */
export default function StatusTracker({
  item,
  onUpdate,
  large = false,
}: {
  item: Legislation | PublicLegislation;
  onUpdate?: (body: { stage: string; date?: string; note?: string }) => Promise<void>;
  large?: boolean;
}) {
  const current = currentStageIndex(item);
  const dates = stageDates(item);
  const history = [...(item.stageHistory || [])].reverse();

  return (
    <div>
      <p className={`${large ? "text-lg" : "text-sm"} text-navy-900`}>
        Current stage: <strong>{TRACKING_STAGES[current].label}</strong>
      </p>
      <ol className="mt-4" aria-label="Legislative progress">
        {TRACKING_STAGES.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const date = formatDate(dates[s.key]);
          return (
            <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0" aria-current={active ? "step" : undefined}>
              {i < TRACKING_STAGES.length - 1 && (
                <span
                  aria-hidden
                  className={`absolute top-8 h-[calc(100%-2rem)] w-0.5 ${large ? "left-[1.1rem]" : "left-[0.85rem]"} ${
                    done ? "bg-emerald-500" : "bg-gray-200"
                  }`}
                />
              )}
              <span
                aria-hidden
                className={`relative z-10 flex shrink-0 items-center justify-center rounded-full border-2 font-semibold ${
                  large ? "h-9 w-9 text-base" : "h-7 w-7 text-xs"
                } ${
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : active
                      ? "border-navy-900 bg-navy-900 text-white"
                      : "border-gray-300 bg-white text-gray-400"
                }`}
              >
                {done ? <Check className={large ? "h-5 w-5" : "h-4 w-4"} /> : i + 1}
              </span>
              <div className={large ? "pt-1" : "pt-0.5"}>
                <p className={`${large ? "text-lg" : "text-sm"} font-semibold ${i > current ? "text-gray-500" : "text-navy-900"}`}>
                  {s.label}
                  <span className="sr-only">{done ? " (completed)" : active ? " (current stage)" : " (not yet reached)"}</span>
                </p>
                {(done || active) && date && <p className={`${large ? "text-base" : "text-xs"} text-gray-600`}>{date}</p>}
                {active && <p className={`${large ? "text-base" : "text-xs"} text-gray-600`}>{s.hint}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {onUpdate && <StageUpdateForm currentIndex={current} onUpdate={onUpdate} />}

      {onUpdate && history.length > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Tracker history</h3>
          <ul className="space-y-2 text-sm">
            {history.map((h: StageEntry, i) => (
              <li key={i}>
                <span className="font-medium text-navy-900">{stageLabel(h.stage)}</span>{" "}
                <span className="text-gray-500">
                  · {formatDate(h.date)}
                  {who(h.changedBy) && ` · ${who(h.changedBy)}`}
                </span>
                {h.note && <p className="text-xs text-gray-600">{h.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StageUpdateForm({
  currentIndex,
  onUpdate,
}: {
  currentIndex: number;
  onUpdate: (body: { stage: string; date?: string; note?: string }) => Promise<void>;
}) {
  const next = TRACKING_STAGES[Math.min(currentIndex + 1, TRACKING_STAGES.length - 1)].key;
  const [stage, setStage] = useState<string>(next);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdate({ stage, date: date || undefined, note: note.trim() || undefined });
      setNote("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 space-y-3 rounded-md border border-gray-200 bg-paper p-3">
      <p className="text-xs font-semibold text-navy-900">Update stage</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-xs text-gray-600">
          Stage
          <select value={stage} onChange={(e) => setStage(e.target.value)} className="field-input mt-1">
            {TRACKING_STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-600">
          Date reached
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field-input mt-1" />
        </label>
      </div>
      <label className="block text-xs text-gray-600">
        Note (staff only, optional)
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="e.g. Referred to Committee on Transportation"
          className="field-input mt-1"
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-900 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save stage"}
      </button>
    </form>
  );
}
