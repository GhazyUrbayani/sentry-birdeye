import { NextResponse } from 'next/server';
import { z } from 'zod';

import { convexQuery } from '@/lib/convex/client';
import type { TokenScanRecord } from '@/types';
import { DefaultRateLimiterFactory } from '@/lib/ratelimit/limiters';

export const runtime = 'edge';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  stream: z.coerce.number().int().optional(),
});

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
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
          try {
            const rows = await convexQuery<TokenScanRecord[]>('tokenScans:listLatest', { limit: 10 });
            for (const row of rows) {
              if (row.id === lastSeen) break;
              send({ type: 'token', record: row });
            }
            lastSeen = rows[0]?.id ?? lastSeen;
          } catch (error) {
            send({ type: 'error', message: errorMessage(error) });
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

  try {
    const rows = await convexQuery<TokenScanRecord[]>('tokenScans:listLatest', { limit });
    return NextResponse.json({ tokens: rows });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

