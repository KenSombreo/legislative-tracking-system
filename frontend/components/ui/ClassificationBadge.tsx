export default function ClassificationBadge({ classification }: { classification: string | null | undefined }) {
  if (!classification) return <span className="text-gray-400 text-sm">—</span>;
  return (
    <span className="inline-block rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
      {classification}
    </span>
  );
}
