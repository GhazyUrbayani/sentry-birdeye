import { NextResponse } from 'next/server';

import type { HealthStatusResponse } from '@/types';
import { BirdeyeClient } from '@/lib/birdeye/client';
import { cache } from '@/lib/cache/redis';
import { convexQuery } from '@/lib/convex/client';

export const runtime = 'edge';

const startedAtMs = Date.now();

async function convexReachable(): Promise<boolean> {
  try {
    await convexQuery('tokenScans:listLatest', { limit: 1 });
    return true;
  } catch {
    return false;
  }
}

async function birdeyeReachable(): Promise<boolean> {
  const apiKey = process.env['BIRDEYE_API_KEY'];
  if (!apiKey) return false;
  const client = new BirdeyeClient({
    apiKey,
    baseUrl: 'https://public-api.birdeye.so',
    timeoutMs: 4000,
    retry: { maxRetries: 0, baseDelayMs: 1000, maxDelayMs: 4000 },
    circuitBreaker: { failureThreshold: 3, failureWindowMs: 10_000, openStateDurationMs: 30_000 },
  });
  const res = await client.getJson<unknown>(
    '/defi/token_trending?sort_by=rank&interval=24h&sort_type=asc&offset=0&limit=1&ui_amount_mode=scaled',
  );
  return res.ok;
}

export async function GET() {
  const [redisOk, convexOk, birdeyeOk, lastScan] = await Promise.all([
    cache.ping(),
    convexReachable(),
    birdeyeReachable(),
    cache.getJson<{ lastScanAt: string }>('sentry:lastScan'),
  ]);

  const degraded = !(redisOk && convexOk && birdeyeOk);
  const status: HealthStatusResponse['status'] = degraded ? 'degraded' : 'ok';

  const body: HealthStatusResponse = {
    status,
    uptime: Math.floor((Date.now() - startedAtMs) / 1000),
    lastScanAt: lastScan.hit ? lastScan.value.lastScanAt : null,
    birdeye_reachable: birdeyeOk,
    redis_reachable: redisOk,
    convex_reachable: convexOk,
  };

  return NextResponse.json(body, { status: degraded ? 503 : 200 });
}

