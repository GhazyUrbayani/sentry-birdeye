import { Suspense } from 'react';
import { RadarFeed } from '@/components/RadarFeed/RadarFeed';
import { TokenCard } from '@/components/TokenCard/TokenCard';
import { TokenCardSkeleton } from '@/components/TokenCard/TokenCardSkeleton';
import { convexQuery } from '@/lib/convex/client';
import type { TokenScanRecord } from '@/types';

export const runtime = 'edge';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

async function LatestTokens() {
  try {
    const tokens = await convexQuery<TokenScanRecord[]>('tokenScans:listLatest', { limit: 12 });

    return (
      <div className="grid gap-3 md:grid-cols-2">
        {tokens.map((t) => (
          <TokenCard key={t.id} token={t} />
        ))}
      </div>
    );
  } catch (error) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        Failed to load tokens. ({errorMessage(error)})
      </div>
    );
  }
}

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Edge + Redis cache + Convex
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">SENTRY — Pre-Trade Intelligence</h1>
        <p className="max-w-2xl text-sm text-white/70">
          Latest scans stream in real time. Grades are computed via strategy-based scoring with circuit-breaker protected Birdeye calls.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">Latest Scans</h2>
          <Suspense
            fallback={
              <div className="grid gap-3 md:grid-cols-2">
                <TokenCardSkeleton />
                <TokenCardSkeleton />
                <TokenCardSkeleton />
                <TokenCardSkeleton />
              </div>
            }
          >
            <LatestTokens />
          </Suspense>
        </section>

        <RadarFeed />
      </div>
    </main>
  );
}

