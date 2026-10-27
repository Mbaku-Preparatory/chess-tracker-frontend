export function CardSkeleton() {
  return (
    <div className="card animate-pulse p-6">
      <div className="mb-4 h-5 w-1/3 rounded bg-gray-200 dark:bg-dark-elevated" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-5/6 rounded bg-gray-200" />
        <div className="h-4 w-2/3 rounded bg-gray-200" />
      </div>
    </div>
  );
}
