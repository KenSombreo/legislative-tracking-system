import { Legislation } from "./types";

// Legislative pipeline stages used by the dashboard progress bars and "Measures by stage".
export const STAGES = [
  { key: "FILED", label: "Filed / 1st reading" },
  { key: "COMMITTEE", label: "In committee" },
  { key: "READING", label: "2nd–3rd reading" },
  { key: "APPROVED", label: "Approved" },
  { key: "POSTED", label: "SP review / posted" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

export function stageIndex(status: string | null | undefined): number {
  const s = (status || "").toUpperCase().replace(/[\s-]+/g, "_");
  if (!s) return 0;
  if (/POST|PUBLISH|SP_|ARCHIV|DONE/.test(s)) return 4;
  if (/APPROV|ENACT|ADOPT/.test(s)) return 3;
  if (/SECOND|THIRD|2ND|3RD|REVIEW/.test(s)) return 2;
  if (/COMMITTEE|PENDING|REFER/.test(s)) return 1;
  return 0;
}

export function nextAction(item: Legislation): string {
  if (item.remarks) return item.remarks.split("\n")[0];
  switch (stageIndex(item.status)) {
    case 0:
      return "Refer to committee";
    case 1:
      return "Committee hearing";
    case 2:
      return "Session vote";
    case 3:
      return "Forward to Mayor";
    default:
      return "Done";
  }
}

const PILL: { test: RegExp; cls: string }[] = [
  { test: /PENDING_APPROVAL|FOR_REVIEW/, cls: "bg-amber-100 text-amber-800" },
  { test: /SP_REVIEW|UNDER_SP/, cls: "bg-navy-900 text-white" },
  { test: /COMMITTEE/, cls: "bg-sky-100 text-sky-800" },
  { test: /THIRD|SECOND|3RD|2ND/, cls: "bg-orange-100 text-orange-800" },
  { test: /APPROV|ENACT|ADOPT/, cls: "bg-emerald-100 text-emerald-800" },
  { test: /POST/, cls: "bg-teal-100 text-teal-800" },
  { test: /FIRST|1ST|FILED|DRAFT/, cls: "bg-amber-50 text-amber-800" },
  { test: /ARCHIV/, cls: "bg-gray-200 text-gray-700" },
  { test: /PENDING/, cls: "bg-amber-100 text-amber-800" },
];

export function statusPillClass(status: string | null | undefined) {
  const s = (status || "").toUpperCase().replace(/[\s-]+/g, "_");
  return PILL.find((p) => p.test.test(s))?.cls || "bg-gray-100 text-gray-700";
}

export function humanize(value: string | null | undefined) {
  if (!value) return "—";
  if (value !== value.toUpperCase()) return value;
  const words = value.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function documentLabel(item: Pick<Legislation, "documentType" | "documentNumber" | "year">) {
  const prefix =
    item.documentType === "ORDINANCE"
      ? "Ordinance No."
      : item.documentType === "RESOLUTION"
        ? "Resolution No."
        : "Appropriation Ord. No.";
  return `${prefix} ${item.documentNumber}`;
}
