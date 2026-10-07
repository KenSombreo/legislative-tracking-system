import { formatDate } from "../ui/Records";

// Month-over-day block used in the calendar list and the dashboard's "Upcoming sessions & hearings" card.
export default function EventDateBlock({ date }: { date: string }) {
  return (
    <div className="w-10 shrink-0 rounded border border-gray-200 text-center leading-tight">
      <p className="pt-0.5 text-[9px] font-semibold uppercase text-gray-500">{formatDate(date, { month: "short" })}</p>
      <p className="pb-0.5 font-serif text-base font-semibold text-navy-900">{formatDate(date, { day: "numeric" })}</p>
    </div>
  );
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  REGULAR_SESSION: "Regular Session",
  SPECIAL_SESSION: "Special Session",
  COMMITTEE_HEARING: "Committee Hearing",
  OTHER: "Other",
};
