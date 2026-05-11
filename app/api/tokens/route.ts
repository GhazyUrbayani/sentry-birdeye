import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

import type { TokenScansRow, TokenScanRecord } from '@/types';
import { DefaultRateLimiterFactory } from '@/lib/ratelimit/limiters';

export const runtime = 'edge';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  stream: z.coerce.number().int().optional(),
});

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

function ipKey(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function GET(req: Request) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_query', issues: parsed.error.issues }, { status: 400 });

  const limiterFactory = new DefaultRateLimiterFactory();
  const limiter = limiterFactory.create({
    algorithm: 'token-bucket',
    tokensPerInterval: 100,
    intervalMs: 60_000,
    burst: 20,
  });

  const decision = await limiter.limit({ key: `tokens:${ipKey(req)}` });
  if (!decision.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((decision.retryAfterMs ?? 0) / 1000)) } });
  }

  const supabase = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    auth: { persistSession: false },
  });

  const limit = parsed.data.limit;

  // SSE mode (RadarFeed)
  if (parsed.data.stream === 1) {
    const encoder = new TextEncoder();
    let closed = false;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

        send({ type: 'heartbeat' });

        // Poll every 5s for newest token scans; keep only latest seen.
        let lastSeen = '';
        while (!closed) {
          const { data, error } = await supabase
            .from('token_scans')
            .select('*')
            .order('scanned_at', { ascending: false })
            .limit(10);

          if (error) {
            send({ type: 'error', message: error.message });
          } else {
            const rows = (data ?? []) as unknown as TokenScansRow[];
            for (const row of rows) {
              if (row.id === lastSeen) break;
              send({ type: 'token', record: mapRow(row) });
            }
            lastSeen = rows[0]?.id ?? lastSeen;
          }

          await new Promise<void>((r) => setTimeout(r, 5000));
          send({ type: 'heartbeat' });
        }

        controller.close();
      },
      cancel() {
        closed = true;
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  }

  const { data, error } = await supabase
    .from('token_scans')
    .select('*')
    .order('scanned_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as TokenScansRow[];
  return NextResponse.json({ tokens: rows.map(mapRow) });
}

