import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/** A single content card placeholder: image + title + a couple of text lines. */
export function CardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border/50 bg-card shadow-soft">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="mt-auto h-4 w-28" />
      </div>
    </div>
  );
}

/** Grid of card placeholders — for Projects, Blogs, Shop, and "Latest Updates". */
export function CardGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-8 md:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Grid of square image placeholders — for the home gallery. */
export function ImageGridSkeleton({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 md:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full" />
      ))}
    </div>
  );
}

/** Vertical list of compact event rows — for the home "Upcoming Events" panel. */
export function EventListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 rounded-xl border border-border/50 bg-card p-4 shadow-soft">
          <Skeleton className="h-20 w-20 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Large placeholder standing in for the flip-book event gallery. */
export function EventsBookSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
      <div className="mt-6 flex items-center justify-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
  );
}

/** Full project-detail page placeholder: hero + body text. */
export function ProjectDetailSkeleton() {
  return (
    <section className="section-padding bg-secondary/20">
      <div className="container-wide">
        <Skeleton className="mb-8 h-9 w-28" />
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Skeleton className="aspect-[4/3] w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="mt-12 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </section>
  );
}

/** Generic page placeholder — route-transition (lazy) fallback. */
export function PageSkeleton() {
  return (
    <div className="section-padding" aria-busy="true" aria-live="polite">
      <div className="container-wide space-y-8">
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <Skeleton className="mx-auto h-10 w-2/3" />
          <Skeleton className="mx-auto h-4 w-full" />
          <Skeleton className="mx-auto h-4 w-4/5" />
        </div>
        <CardGridSkeleton count={3} />
      </div>
    </div>
  );
}

/** Admin list/table placeholder — stacked row cards. */
export function AdminListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start justify-between gap-4 rounded-xl border border-border/50 bg-card p-4 shadow-soft">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Admin form placeholder — field rows inside a card. */
export function AdminFormSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="max-w-2xl space-y-5 rounded-lg border border-border/50 bg-card p-5 shadow-soft">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
}
