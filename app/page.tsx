import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RadarFeed } from '@/components/RadarFeed/RadarFeed';
import { TokenCard } from '@/components/TokenCard/TokenCard';
import { TokenCardSkeleton } from '@/components/TokenCard/TokenCardSkeleton';
import type { TokenScansRow, TokenScanRecord } from '@/types';

export const runtime = 'edge';

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function mapRow(row: TokenScansRow): TokenScanRecord {
  return {
    id: row.id,
    address: row.address,
    symbol: row.symbol,
    score: row.score,
    grade: row.grade,
    flags: (row.flags ?? []) as unknown as TokenScanRecord['flags'],
    aiBrief: row.ai_brief,
    liquidity: row.liquidity,
    volume24h: row.volume_24h,
    priceChange24h: row.price_change_24h,
    top10HolderPct: row.top10_holder_pct,
    mintAuthDisabled: row.mint_auth_disabled,
    freezeAuthDisabled: row.freeze_auth_disabled,
    scannedAt: row.scanned_at,
  };
}

async function LatestTokens() {
  const supabase = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from('token_scans')
    .select('*')
    .order('scanned_at', { ascending: false })
    .limit(12);

  if (error) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        Failed to load tokens. ({error.message})
      </div>
    );
  }

  const rows = (data ?? []) as unknown as TokenScansRow[];
  const tokens = rows.map(mapRow);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {tokens.map((t) => (
        <TokenCard key={t.id} token={t} />
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Edge + Redis cache + Supabase
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

