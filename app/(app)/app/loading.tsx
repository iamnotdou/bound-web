export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading bonded agents…</span>

      <div className="max-w-2xl" aria-hidden>
        <div className="bg-muted h-3 w-28 animate-pulse rounded" />
        <div className="bg-muted mt-4 h-9 w-64 animate-pulse rounded" />
        <div className="bg-muted mt-4 h-4 w-full animate-pulse rounded" />
        <div className="bg-muted mt-2 h-4 w-4/5 animate-pulse rounded" />
      </div>

      <div
        className="mt-8 flex flex-col gap-4 lg:flex-row lg:justify-between"
        aria-hidden
      >
        <div className="bg-muted h-10 w-full animate-pulse rounded-md lg:max-w-sm" />
        <div className="bg-muted h-10 w-full animate-pulse rounded-md sm:w-72" />
      </div>

      <div
        className="ring-foreground/6.5 bg-card mt-9 divide-border divide-y rounded-xl shadow ring-1"
        aria-hidden
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-4">
            <div className="bg-muted h-4 w-40 animate-pulse rounded" />
            <div className="bg-muted h-5 w-20 animate-pulse rounded-full" />
            <div className="bg-muted ml-auto h-4 w-16 animate-pulse rounded" />
            <div className="bg-muted hidden h-4 w-16 animate-pulse rounded sm:block" />
            <div className="bg-muted hidden h-4 w-24 animate-pulse rounded md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
