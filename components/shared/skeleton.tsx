import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-xl dark:bg-white/6 bg-black/6', className)} />
  )
}

export function PageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

export function WeeklySkeleton() {
  return (
    <div className="px-4 py-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-7 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
      <div className="flex gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-1 space-y-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-24" />
            <Skeleton className="h-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SprintSkeleton() {
  return (
    <div className="px-4 py-6 max-w-6xl mx-auto space-y-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-2 w-48 mt-3 rounded-full" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <Skeleton className="h-9 w-56 rounded-xl" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
