// Grey placeholder cards shown while products load, the same shape as the
// real ones (square photo, name, price), so the page doesn't jump or sit
// on "Loading..." text. Hidden from screen readers; the label says it.
export function ProductSkeletonGrid({ count = 8, className = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" }) {
  return (
    <div className={className} role="status" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductSkeleton({ className = "" }) {
  return (
    <div aria-hidden="true" className={`overflow-hidden rounded-xl border border-border ${className}`}>
      <div className="aspect-square animate-pulse bg-text/5" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-4/5 animate-pulse rounded bg-text/10" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-text/10" />
      </div>
    </div>
  );
}
