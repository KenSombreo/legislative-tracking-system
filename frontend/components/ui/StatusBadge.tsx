const COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  FOR_REVIEW: "bg-yellow-100 text-yellow-800",
  DRAFT: "bg-gray-100 text-gray-800",
  APPROVED: "bg-green-100 text-green-800",
  ENACTED: "bg-green-100 text-green-800",
  ADOPTED: "bg-green-100 text-green-800",
  ARCHIVED: "bg-red-100 text-red-800",
};

export default function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-gray-400 text-sm">—</span>;
  const key = status.toUpperCase().replace(/\s+/g, "_");
  const classes = COLORS[key] || "bg-blue-100 text-blue-800";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      {status}
    </span>
  );
}
