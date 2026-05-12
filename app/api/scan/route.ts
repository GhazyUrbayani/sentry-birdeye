import { NextResponse } from 'next/server';
import { z } from 'zod';

import type { HealthStatusResponse, TokenScanRecord, TokenSnapshot } from '@/types';
import { BirdeyeClient } from '@/lib/birdeye/client';
import { createBirdeyeEndpoints } from '@/lib/birdeye/endpoints';
import { cache } from '@/lib/cache/redis';
import { convexMutation, convexQuery } from '@/lib/convex/client';
import { AggressiveScorer, ConservativeScorer, ScoreEngineImpl } from '@/lib/scoring/engine';
import { generateAIBrief } from '@/lib/ai/prompts';
import { sendTelegramMessage, formatAlertMessage } from '@/lib/telegram/bot';

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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
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

async function upsertScan(record: TokenScanRecord): Promise<void> {
  try {
    await convexMutation('tokenScans:insert', { record });
  } catch (error) {
    throw new Error(`Convex insert failed: ${errorMessage(error)}`);
  }
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
    const [security, holders, overview] = await Promise.all([
      api.tokenSecurity({ address }),
      api.holders({ address }),
      api.tokenOverview({ address }),
    ]);

    const snapshot: TokenSnapshot = {
      identity: { address, symbol: item.symbol ?? null, name: item.name ?? null, logoURI: item.logoURI ?? null },
      market: overview.ok 
        ? { liquidity: overview.value.liquidity, volume24h: overview.value.volume24h, priceChange24h: overview.value.priceChange24h }
        : { liquidity: null, volume24h: null, priceChange24h: null },
      security: security.ok
        ? { mintAuthorityDisabled: security.value.mintAuthorityDisabled ?? null, freezeAuthorityDisabled: security.value.freezeAuthorityDisabled ?? null }
        : { mintAuthorityDisabled: null, freezeAuthorityDisabled: null },
      holders: holders.ok ? { top10HolderPct: holders.value.top10HolderPct ?? null } : { top10HolderPct: null },
      ageSeconds: null,
    };

    const scored = scorer.evaluate({ snapshot, now: new Date() });
    
    // Generate AI Brief
    const aiBrief = await generateAIBrief(snapshot, scored.score, scored.grade);

    const record = mapScanRecord({
      snapshot,
      score: { score: scored.score, grade: scored.grade, flags: scored.flags },
      scannedAt,
      aiBrief,
    });
    await upsertScan(record);
    records.push(record);
  }

  // Telegram Broadcast for SAFE or DEGEN tokens
  try {
    const alertableTokens = records.filter(r => r.grade === 'SAFE' || r.grade === 'DEGEN');
    if (alertableTokens.length > 0) {
      const activeSubscribers = await convexQuery<Array<{ chatId: number }>>('subscribers:listActive', {});
      if (activeSubscribers && activeSubscribers.length > 0) {
        const tgToken = process.env['TELEGRAM_BOT_TOKEN'];
        const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://sentry.birdeye.so';
        
        if (tgToken) {
          for (const token of alertableTokens) {
            const msg = formatAlertMessage({
              address: token.address,
              symbol: token.symbol,
              grade: token.grade,
              score: token.score,
              flags: token.flags,
              appUrl
            });
            // Broadcast to all active subscribers
            for (const sub of activeSubscribers) {
              await sendTelegramMessage({ token: tgToken, message: { ...msg, chatId: sub.chatId } });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Telegram broadcast failed:', err);
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

