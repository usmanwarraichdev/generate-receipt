import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      id="main"
      aria-busy="true"
      className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
    >
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-4 w-20 bg-ink/10" />
      <Skeleton className="mt-3 h-12 w-64 bg-ink/10" />
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-28 rounded-2xl bg-ink/[0.07]" />
        ))}
      </div>
      <Skeleton className="mt-10 h-72 rounded-2xl bg-ink/[0.07]" />
    </main>
  );
}
