import { Legislation } from "./types";

// Steps of the status tracker. Kept in sync with backend/src/common/config/tracking-stages.config.ts.
export const TRACKING_STAGES = [
  { key: "FILED", label: "Filed / 1st reading", hint: "Submitted to the Sanggunian and read for the first time." },
  { key: "COMMITTEE", label: "In committee", hint: "Referred to a committee for study and public hearing." },
  { key: "SECOND_READING", label: "2nd reading", hint: "Discussed and amended on the floor." },
  { key: "THIRD_READING", label: "3rd reading / enacted", hint: "Voted on and enacted (or adopted) by the Sanggunian." },
  { key: "LCE_APPROVAL", label: "Approved by Mayor", hint: "Signed by the Local Chief Executive." },
  { key: "SP_REVIEW", label: "SP review", hint: "Under review by the Sangguniang Panlalawigan." },
  { key: "EFFECTIVE", label: "Posted / in effect", hint: "Published or posted and now in effect." },
] as const;

export type TrackingStageKey = (typeof TRACKING_STAGES)[number]["key"];

// The fields the tracker reads; both staff records and public records have them.
type Trackable = Partial<
  Pick<
    Legislation,
    | "documentType"
    | "status"
    | "stage"
    | "stageHistory"
    | "dateEnacted"
    | "dateAdopted"
    | "dateApprovedByLCE"
    | "dateEnactedApprovedBySP"
  >
>;

export function stageLabel(key: string | null | undefined) {
  return TRACKING_STAGES.find((s) => s.key === key)?.label || "—";
}

// Records from before the tracker (or never moved on it) get a stage from their dates and status text.
function deriveStage(item: Trackable): TrackingStageKey {
  const s = (item.status || "").toUpperCase();
  if (item.dateEnactedApprovedBySP || /POST|PUBLISH|EFFECT|ARCHIV/.test(s)) return "EFFECTIVE";
  if (/(^|[^A-Z])SP([^A-Z]|$)|PANLALAWIGAN/.test(s)) return "SP_REVIEW";
  if (item.dateApprovedByLCE) return "LCE_APPROVAL";
  if (item.dateEnacted || item.dateAdopted || /APPROV|ENACT|ADOPT|THIRD|3RD/.test(s)) return "THIRD_READING";
  if (/SECOND|2ND/.test(s)) return "SECOND_READING";
  if (/COMMITTEE|REFER/.test(s)) return "COMMITTEE";
  return "FILED";
}

export function currentStage(item: Trackable): TrackingStageKey {
  return (item.stage as TrackingStageKey) || deriveStage(item);
}

export function currentStageIndex(item: Trackable) {
  return TRACKING_STAGES.findIndex((s) => s.key === currentStage(item));
}

// Date each step was reached: the latest tracker entry for it, else the matching record date.
export function stageDates(item: Trackable): Partial<Record<TrackingStageKey, string>> {
  const dates: Partial<Record<TrackingStageKey, string>> = {};
  const enacted = item.dateEnacted || item.dateAdopted;
  if (enacted) dates.THIRD_READING = enacted;
  if (item.dateApprovedByLCE) dates.LCE_APPROVAL = item.dateApprovedByLCE;
  if (item.dateEnactedApprovedBySP && item.documentType !== "RESOLUTION") dates.EFFECTIVE = item.dateEnactedApprovedBySP;
  for (const entry of item.stageHistory || []) dates[entry.stage as TrackingStageKey] = entry.date;
  return dates;
}
