import { TokenCardSkeleton } from '@/components/TokenCard/TokenCardSkeleton';

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <div className="h-6 w-64 rounded bg-white/10" />
        <div className="mt-2 h-4 w-96 rounded bg-white/10" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <TokenCardSkeleton />
        <TokenCardSkeleton />
        <TokenCardSkeleton />
        <TokenCardSkeleton />
      </div>
    </main>
  );
}

