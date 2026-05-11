import { describe, expect, it } from 'vitest';
import { InMemorySlidingWindowLogLimiter, SlidingWindowLogLimiter } from './limiters';

describe('sliding window log limiter', () => {
  it('rejects request #11 in 60s window', async () => {
    const limiter: SlidingWindowLogLimiter = new InMemorySlidingWindowLogLimiter({
      limit: 10,
      windowMs: 60_000,
    });

    const key = 'apiKey:abc';
    for (let i = 0; i < 10; i += 1) {
      const d = await limiter.limit({ key, nowMs: 1000 + i * 1000 });
      expect(d.allowed).toBe(true);
    }

    const eleventh = await limiter.limit({ key, nowMs: 20_000 });
    expect(eleventh.allowed).toBe(false);
    expect(eleventh.remaining).toBe(0);
  });
});

