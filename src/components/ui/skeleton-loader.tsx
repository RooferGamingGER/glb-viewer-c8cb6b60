import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div
    className={cn(
      'animate-pulse rounded-md bg-muted',
      className
    )}
  />
);

export const PageSkeleton = () => (
  <div className="flex h-screen w-full flex-col bg-background">
    {/* Header skeleton */}
    <div className="flex h-14 items-center justify-between border-b border-border px-4">
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
    
    {/* Main content skeleton */}
    <div className="flex flex-1">
      {/* 3D viewer area */}
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </div>
  </div>
);

export const ViewerSkeleton = () => (
  <div className="flex h-screen w-full bg-background">
    {/* Main 3D area */}
    <div className="flex-1 flex items-center justify-center bg-muted/20">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Skeleton className="h-20 w-20 rounded-lg" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </div>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    
    {/* Sidebar skeleton */}
    <div className="hidden md:flex w-80 flex-col border-l border-border bg-card p-4">
      <Skeleton className="h-6 w-24 mb-4" />
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="mt-auto space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  </div>
);

export const CardSkeleton = () => (
  <div className="rounded-lg border border-border bg-card p-4 space-y-3">
    <Skeleton className="h-5 w-2/3" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-4/5" />
  </div>
);

export const ListSkeleton = ({ items = 5 }: { items?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-2">
        <Skeleton className="h-8 w-8 rounded" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export const ToolbarSkeleton = () => (
  <div className="flex items-center gap-2 p-2 border border-border rounded-lg bg-card">
    {Array.from({ length: 6 }).map((_, i) => (
      <Skeleton key={i} className="h-9 w-9 rounded" />
    ))}
  </div>
);
