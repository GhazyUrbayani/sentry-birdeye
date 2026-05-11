import { describe, expect, it, vi } from 'vitest';
import { createBirdeyeEndpoints } from './endpoints';
import type { CacheClient } from '@/lib/cache/redis';
import type { CacheGetResult, CacheSetResult } from '@/lib/cache/redis';

describe('Birdeye endpoints caching', () => {
  it('caches /token_security for 300s and reuses cache on second call', async () => {
    const clientCalls: string[] = [];
    const client = {
      getJson: async <T,>() => {
        clientCalls.push('getJson');
        return { ok: true as const, value: { mintAuthorityDisabled: true } as unknown as T };
      },
    };

    let cacheGets = 0;
    let cacheSets = 0;
    let nextGet: CacheGetResult<unknown> = { hit: false, source: 'memory' };

    const getJson = async <T,>(_key: string): Promise<CacheGetResult<T>> => {
      cacheGets += 1;
      return nextGet as unknown as CacheGetResult<T>;
    };

    const setJson = async <T,>(_key: string, _value: T, _ttlSeconds: number): Promise<CacheSetResult> => {
      cacheSets += 1;
      return { ok: true, source: 'memory' };
    };

    const cache: CacheClient = {
      getJson,
      setJson,
      del: vi.fn(async () => {}),
      ping: vi.fn(async () => true),
    };

    const api = createBirdeyeEndpoints({
      client,
      cache,
    });

    const first = await api.tokenSecurity({ address: 'So11111111111111111111111111111111111111112' });
    expect(first.ok).toBe(true);
    expect(cacheSets).toBe(1);

    nextGet = { hit: true, value: { mintAuthorityDisabled: true }, source: 'memory' };
    const second = await api.tokenSecurity({ address: 'So11111111111111111111111111111111111111112' });
    expect(second.ok).toBe(true);
    expect(clientCalls).toEqual(['getJson']);
    expect(cacheGets).toBe(2);
  });
});

