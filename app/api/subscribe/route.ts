import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

import { DefaultRateLimiterFactory } from '@/lib/ratelimit/limiters';
import type { SubscriberFilter } from '@/types';

export const runtime = 'edge';

const BodySchema = z.object({
  chat_id: z.number().int(),
  username: z.string().min(1).max(64).optional(),
  filter: z.enum(['ALL', 'SAFE', 'CAUTION']).default('SAFE'),
});

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function ipKey(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function POST(req: Request) {
  const limiterFactory = new DefaultRateLimiterFactory();
  const limiter = limiterFactory.create({ algorithm: 'fixed-window', limit: 5, windowMs: 60_000 });
  const decision = await limiter.limit({ key: `subscribe:${ipKey(req)}` });
  if (!decision.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

  const supabase = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from('subscribers').upsert({
    chat_id: parsed.data.chat_id,
    username: parsed.data.username ?? null,
    filter: parsed.data.filter,
    active: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

