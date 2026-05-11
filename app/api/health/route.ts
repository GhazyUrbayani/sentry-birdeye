import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import type { HealthStatusResponse } from '@/types';
import { BirdeyeClient } from '@/lib/birdeye/client';
import { cache } from '@/lib/cache/redis';

export const runtime = 'edge';

const startedAtMs = Date.now();

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function supabaseReachable(): Promise<boolean> {
  try {
    const supabase = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
      auth: { persistSession: false },
    });
    const { error } = await supabase.from('token_scans').select('id').limit(1);
    return !error;
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
  const res = await client.getJson<unknown>('/defi/v2/trending?limit=1');
  return res.ok;
}

export async function GET() {
  const [redisOk, supabaseOk, birdeyeOk, lastScan] = await Promise.all([
    cache.ping(),
    supabaseReachable(),
    birdeyeReachable(),
    cache.getJson<{ lastScanAt: string }>('sentry:lastScan'),
  ]);

  const degraded = !(redisOk && supabaseOk && birdeyeOk);
  const status: HealthStatusResponse['status'] = degraded ? 'degraded' : 'ok';

  const body: HealthStatusResponse = {
    status,
    uptime: Math.floor((Date.now() - startedAtMs) / 1000),
    lastScanAt: lastScan.hit ? lastScan.value.lastScanAt : null,
    birdeye_reachable: birdeyeOk,
    redis_reachable: redisOk,
    supabase_reachable: supabaseOk,
  };

  return NextResponse.json(body, { status: degraded ? 503 : 200 });
}

