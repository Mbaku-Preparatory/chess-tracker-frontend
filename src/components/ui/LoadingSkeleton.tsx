interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export function LoadingSkeleton({ lines = 3, className = "" }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-gray-200"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card animate-pulse p-6">
      <div className="mb-4 h-5 w-1/3 rounded bg-gray-200" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-5/6 rounded bg-gray-200" />
        <div className="h-4 w-2/3 rounded bg-gray-200" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card animate-pulse overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex gap-8">
          {[100, 80, 120, 60, 80].map((w, i) => (
            <div key={i} className="h-4 rounded bg-gray-200" style={{ width: w }} />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-gray-100 p-4">
          <div className="flex gap-8">
            {[100, 80, 120, 60, 80].map((w, j) => (
              <div key={j} className="h-4 rounded bg-gray-100" style={{ width: w }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
