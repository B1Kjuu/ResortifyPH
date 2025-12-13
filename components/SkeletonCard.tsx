export default function SkeletonCard() {
  return (
    <div className="animate-pulse">
      {/* Image skeleton - square like Airbnb */}
      <div className="aspect-square bg-slate-200 rounded-xl"></div>
      {/* Content skeleton */}
      <div className="mt-3 space-y-2">
        <div className="flex justify-between">
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded w-8"></div>
        </div>
        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
        <div className="h-3 bg-slate-200 rounded w-1/3"></div>
        <div className="h-4 bg-slate-200 rounded w-1/4 mt-1"></div>
      </div>
    </div>
  )
}
