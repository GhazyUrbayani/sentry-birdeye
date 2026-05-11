export function TokenCardSkeleton() {
  return (
    <div className="min-h-[120px] w-full rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/10" />
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-white/10" />
            <div className="h-3 w-40 rounded bg-white/10" />
          </div>
        </div>
        <div className="h-5 w-16 rounded-full bg-white/10" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="h-3 w-full rounded bg-white/10" />
        <div className="h-3 w-full rounded bg-white/10" />
        <div className="h-3 w-full rounded bg-white/10" />
      </div>
    </div>
  );
}

