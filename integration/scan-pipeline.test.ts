import { describe, expect, it, vi } from 'vitest';
import { BirdeyeClient } from '@/lib/birdeye/client';
import { createBirdeyeEndpoints } from '@/lib/birdeye/endpoints';

describe('integration: scan pipeline pieces', () => {
  it('Birdeye endpoints + client cooperate (smoke)', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ success: true, data: [{ address: 'So11111111111111111111111111111111111111112' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const client = new BirdeyeClient({
      apiKey: 'x',
      baseUrl: 'https://public-api.birdeye.so',
      timeoutMs: 1000,
      retry: { maxRetries: 0, baseDelayMs: 1000, maxDelayMs: 4000 },
      circuitBreaker: { failureThreshold: 3, failureWindowMs: 10_000, openStateDurationMs: 30_000 },
      fetch: fetchMock,
      nowMs: () => 1000,
      sleepMs: async () => {},
    });

    const cache = {
      getJson: async <T,>() => ({ hit: false as const, source: 'memory' as const }),
      setJson: async <T,>() => ({ ok: true as const, source: 'memory' as const }),
      del: async () => {},
      ping: async () => true,
    };

    const api = createBirdeyeEndpoints({ client, cache });
    const res = await api.newListing({ limit: 1 });
    expect(res.ok).toBe(true);
  });
});

