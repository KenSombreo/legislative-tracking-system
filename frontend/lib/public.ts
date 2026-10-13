import { PublicLegislation } from "./types";
import { TRACKING_STAGES, currentStageIndex, stageDates } from "./tracking";

// Where a measure ended up. Kept in line with progressFilter in backend/src/legislation/legislation.service.ts.
export type Progress = "IN_PROGRESS" | "ENACTED" | "ADOPTED" | "FAILED" | "WITHDRAWN";

export const PROGRESS_OPTIONS: { key: Progress; label: string }[] = [
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "ENACTED", label: "Enacted" },
  { key: "ADOPTED", label: "Adopted" },
  { key: "FAILED", label: "Failed" },
  { key: "WITHDRAWN", label: "Withdrawn" },
];

const BADGE: Record<Progress, string> = {
  IN_PROGRESS: "border-amber-300 bg-amber-50 text-amber-900",
  ENACTED: "border-emerald-300 bg-emerald-50 text-emerald-900",
  ADOPTED: "border-emerald-300 bg-emerald-50 text-emerald-900",
  FAILED: "border-red-300 bg-red-50 text-red-900",
  WITHDRAWN: "border-gray-300 bg-gray-100 text-gray-800",
};

const THIRD_READING = TRACKING_STAGES.findIndex((s) => s.key === "THIRD_READING");

export function progressOf(item: PublicLegislation): Progress {
  const status = item.status || "";
  if (/FAIL|LOST|DEFEAT|DENIED|DISAPPROV/i.test(status)) return "FAILED";
  if (/WITHDR/i.test(status)) return "WITHDRAWN";
  if (currentStageIndex(item) >= THIRD_READING) return item.documentType === "RESOLUTION" ? "ADOPTED" : "ENACTED";
  return "IN_PROGRESS";
}

export function progressLabel(p: Progress) {
  return PROGRESS_OPTIONS.find((o) => o.key === p)!.label;
}

export function progressBadgeClass(p: Progress) {
  return BADGE[p];
}

// "Now at: In committee · step 2 of 7" and the like.
export function stepLine(item: PublicLegislation) {
  const i = currentStageIndex(item);
  const where = `${TRACKING_STAGES[i].label} · step ${i + 1} of ${TRACKING_STAGES.length}`;
  switch (progressOf(item)) {
    case "FAILED":
      return `Failed at ${where}`;
    case "WITHDRAWN":
      return `Withdrawn at ${where}`;
    case "IN_PROGRESS":
      return `Now at: ${where}`;
    default:
      return `${i === TRACKING_STAGES.length - 1 ? "Completed" : "Passed · now at"}: ${where}`;
  }
}

// Latest dated step, else the last time the record was updated.
export function lastActionDate(item: PublicLegislation) {
  const dates = Object.values(stageDates(item)).filter(Boolean) as string[];
  const latest = dates.sort().pop();
  return latest || item.updatedAt || null;
}

export function formatDate(value: string | null | undefined, month: "short" | "long" = "short") {
  return value
    ? new Date(value).toLocaleDateString("en-PH", { year: "numeric", month, day: "numeric", timeZone: "Asia/Manila" })
    : null;
}

// Calendar dates are stored as midnight; startTime is "HH:mm".
export function formatEventWhen(date: string, startTime: string | null) {
  const day = new Date(date).toLocaleDateString("en-PH", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
  if (!startTime) return day;
  const [h, m] = startTime.split(":").map((n) => parseInt(n, 10));
  return `${day}, ${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function authorLine(item: PublicLegislation) {
  const name = item.author || item.sponsor;
  if (!name) return null;
  return `${item.documentType === "RESOLUTION" ? "Sponsored by" : "Authored by"} ${name}`;
}

export interface PublicSummary {
  year: number;
  inProgress: number;
  enactedThisYear: number;
  adoptedThisYear: number;
  classifications: string[];
  nextSession: PublicEvent | null;
}

export interface PublicEvent {
  _id: string;
  eventType: "REGULAR_SESSION" | "SPECIAL_SESSION" | "COMMITTEE_HEARING" | "OTHER";
  title: string;
  date: string;
  startTime: string | null;
  venue: string | null;
  committee: string | null;
  description: string | null;
}

export interface PublicMember {
  _id: string;
  fullName: string;
  position: string;
  committees: string[];
  termStart: string | null;
  termEnd: string | null;
}

// Watchlist: measures a visitor follows, kept only in this browser.
const WATCH_KEY = "pub_watchlist";
const WATCH_EVENT = "pub-watchlist";

export function getWatchlist(): string[] {
  try {
    const ids = JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
    return Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function toggleWatch(id: string) {
  const ids = getWatchlist();
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids];
  try {
    localStorage.setItem(WATCH_KEY, JSON.stringify(next));
  } catch {
    // private mode: following just won't be remembered
  }
  window.dispatchEvent(new Event(WATCH_EVENT));
  return next;
}

export function onWatchlistChange(fn: () => void) {
  window.addEventListener(WATCH_EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(WATCH_EVENT, fn);
    window.removeEventListener("storage", fn);
  };
}
