const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  red: "bg-red-500",
  indigo: "bg-indigo-500",
  gray: "bg-gray-500",
};

export default function StatCard({
  label,
  value,
  color = "blue",
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className={`h-1.5 ${COLOR_MAP[color] || COLOR_MAP.blue}`} />
      <div className="p-4">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-navy-900">{value}</p>
      </div>
    </div>
  );
}
