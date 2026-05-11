import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

import type { HealthStatusResponse, TokenScanRecord, TokenSnapshot } from '@/types';
import { BirdeyeClient } from '@/lib/birdeye/client';
import { createBirdeyeEndpoints } from '@/lib/birdeye/endpoints';
import { cache } from '@/lib/cache/redis';
import { AggressiveScorer, ConservativeScorer, ScoreEngineImpl } from '@/lib/scoring/engine';

export const runtime = 'edge';

const ScanQuerySchema = z.object({
  trigger: z.enum(['cron', 'manual']).default('cron'),
});

function requireBearer(req: Request, expected: string): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const [kind, token] = auth.split(' ');
  return kind === 'Bearer' && token === expected;
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function toIso(d: Date): string {
  return d.toISOString();
}

function mapScanRecord(input: {
  snapshot: TokenSnapshot;
  score: { score: number; grade: TokenScanRecord['grade']; flags: TokenScanRecord['flags'] };
  aiBrief?: string | null;
  scannedAt: Date;
}): TokenScanRecord {
  const addr = input.snapshot.identity.address;
  return {
    id: crypto.randomUUID(),
    address: addr,
    symbol: input.snapshot.identity.symbol ?? null,
    score: input.score.score,
    grade: input.score.grade,
    flags: input.score.flags,
    aiBrief: input.aiBrief ?? null,
    liquidity: input.snapshot.market.liquidity ?? null,
    volume24h: input.snapshot.market.volume24h ?? null,
    priceChange24h: input.snapshot.market.priceChange24h ?? null,
    top10HolderPct: input.snapshot.holders.top10HolderPct ?? null,
    mintAuthDisabled: input.snapshot.security.mintAuthorityDisabled ?? null,
    freezeAuthDisabled: input.snapshot.security.freezeAuthorityDisabled ?? null,
    scannedAt: toIso(input.scannedAt),
  };
}

type SupabaseInsertResult = { error: { message: string } | null };
type SupabaseLike = {
  from: (table: 'token_scans') => {
    insert: (row: Record<string, unknown>) => Promise<SupabaseInsertResult>;
  };
};

async function upsertScan(supabase: SupabaseLike, record: TokenScanRecord): Promise<void> {
  // Service role bypasses RLS; still use parameterized Supabase client (SQLi-safe).
  const { error } = await supabase.from('token_scans').insert({
    id: record.id,
    address: record.address,
    symbol: record.symbol ?? null,
    score: record.score,
    grade: record.grade,
    flags: record.flags,
    ai_brief: record.aiBrief ?? null,
    liquidity: record.liquidity ?? null,
    volume_24h: record.volume24h ?? null,
    price_change_24h: record.priceChange24h ?? null,
    top10_holder_pct: record.top10HolderPct ?? null,
    mint_auth_disabled: record.mintAuthDisabled ?? null,
    freeze_auth_disabled: record.freezeAuthDisabled ?? null,
    scanned_at: record.scannedAt,
  });
  if (error) throw new Error(`Supabase insert failed: ${error.message}`);
}

export async function GET(req: Request) {
  const cronSecret = process.env['CRON_SECRET'];
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not set' }, { status: 500 });
  }
  if (!requireBearer(req, cronSecret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = ScanQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_query', issues: parsed.error.issues }, { status: 400 });
  }

  const startedAt = Date.now();

  const birdeye = new BirdeyeClient({
    apiKey: env('BIRDEYE_API_KEY'),
    baseUrl: 'https://public-api.birdeye.so',
    timeoutMs: 8000,
    retry: { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 4000 },
    circuitBreaker: { failureThreshold: 3, failureWindowMs: 10_000, openStateDurationMs: 30_000 },
  });

  const api = createBirdeyeEndpoints({ client: birdeye, cache });
  const scorer = new ScoreEngineImpl({
    conservative: new ConservativeScorer(),
    aggressive: new AggressiveScorer(),
    aggressiveAgeSecondsThreshold: 6 * 60 * 60,
  });

  const supabase = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  }) as unknown as SupabaseLike;

  // Phase 8 minimal pipeline:
  // - fetch new listings (limit 12)
  // - for each token, fetch security + holders (sequential batches in later phase)
  // - score + persist
  const listing = await api.newListing({ limit: 12 });
  if (!listing.ok) {
    return NextResponse.json(
      {
        error: 'birdeye_unreachable',
        detail: listing.error.message,
        circuit: birdeye.status(),
      },
      { status: 503 },
    );
  }

  const scannedAt = new Date();
  const records: TokenScanRecord[] = [];

  for (const item of listing.value) {
    const address = item.address;
    const [security, holders] = await Promise.all([
      api.tokenSecurity({ address }),
      api.holders({ address }),
    ]);

    const snapshot: TokenSnapshot = {
      identity: { address, symbol: item.symbol ?? null, name: item.name ?? null, logoURI: item.logoURI ?? null },
      market: { liquidity: null, volume24h: null, priceChange24h: null },
      security: security.ok
        ? { mintAuthorityDisabled: security.value.mintAuthorityDisabled ?? null, freezeAuthorityDisabled: security.value.freezeAuthorityDisabled ?? null }
        : { mintAuthorityDisabled: null, freezeAuthorityDisabled: null },
      holders: holders.ok ? { top10HolderPct: holders.value.top10HolderPct ?? null } : { top10HolderPct: null },
      ageSeconds: null,
    };

    const scored = scorer.evaluate({ snapshot, now: new Date() });
    const record = mapScanRecord({
      snapshot,
      score: { score: scored.score, grade: scored.grade, flags: scored.flags },
      scannedAt,
      aiBrief: null,
    });
    await upsertScan(supabase, record);
    records.push(record);
  }

  const durationMs = Date.now() - startedAt;
  await cache.setJson('sentry:lastScan', { lastScanAt: toIso(scannedAt) }, 24 * 60 * 60);
  return NextResponse.json({
    status: 'ok',
    trigger: parsed.data.trigger,
    scannedCount: records.length,
    lastScanAt: toIso(scannedAt),
    durationMs,
  } satisfies Pick<HealthStatusResponse, 'status' | 'lastScanAt'> & {
    trigger: string;
    scannedCount: number;
    durationMs: number;
  });
}

