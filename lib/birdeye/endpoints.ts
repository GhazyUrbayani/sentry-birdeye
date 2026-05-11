import type {
  BirdeyeError,
  BirdeyeNewListingItem,
  BirdeyeTokenHolders,
  BirdeyeTokenSecurity,
  BirdeyeTrendingToken,
  Result,
  SolanaAddress,
} from '@/types';
import type { CacheClient } from '@/lib/cache/redis';

type BirdeyeHttpClient = {
  getJson<T>(path: string, init?: Omit<RequestInit, 'method'>): Promise<Result<T, BirdeyeError>>;
};

const TTL = {
  new_listing: 30,
  token_security: 300,
  trending: 60,
  holder: 120,
} as const;

function key(kind: keyof typeof TTL, parts: string[]): string {
  return ['birdeye', kind, ...parts].join(':');
}

export function createBirdeyeEndpoints(input: { client: BirdeyeHttpClient; cache: CacheClient }) {
  const { client, cache } = input;

  return {
    async newListing(params: { limit: number }): Promise<Result<BirdeyeNewListingItem[], BirdeyeError>> {
      const cacheKey = key('new_listing', [String(params.limit)]);
      const hit = await cache.getJson<BirdeyeNewListingItem[]>(cacheKey);
      if (hit.hit) return { ok: true, value: hit.value };

      const res = await client.getJson<BirdeyeNewListingItem[]>(`/defi/v2/new_listing?limit=${params.limit}`);
      if (!res.ok) return res;
      await cache.setJson(cacheKey, res.value, TTL.new_listing);
      return res;
    },

    async trending(params: { limit: number }): Promise<Result<BirdeyeTrendingToken[], BirdeyeError>> {
      const cacheKey = key('trending', [String(params.limit)]);
      const hit = await cache.getJson<BirdeyeTrendingToken[]>(cacheKey);
      if (hit.hit) return { ok: true, value: hit.value };

      const res = await client.getJson<BirdeyeTrendingToken[]>(`/defi/v2/trending?limit=${params.limit}`);
      if (!res.ok) return res;
      await cache.setJson(cacheKey, res.value, TTL.trending);
      return res;
    },

    async tokenSecurity(params: { address: SolanaAddress }): Promise<Result<BirdeyeTokenSecurity, BirdeyeError>> {
      const cacheKey = key('token_security', [params.address]);
      const hit = await cache.getJson<BirdeyeTokenSecurity>(cacheKey);
      if (hit.hit) return { ok: true, value: hit.value };

      const res = await client.getJson<BirdeyeTokenSecurity>(`/defi/v3/token_security?address=${params.address}`);
      if (!res.ok) return res;
      await cache.setJson(cacheKey, res.value, TTL.token_security);
      return res;
    },

    async holders(params: { address: SolanaAddress }): Promise<Result<BirdeyeTokenHolders, BirdeyeError>> {
      const cacheKey = key('holder', [params.address]);
      const hit = await cache.getJson<BirdeyeTokenHolders>(cacheKey);
      if (hit.hit) return { ok: true, value: hit.value };

      const res = await client.getJson<BirdeyeTokenHolders>(`/defi/v3/token/holder?address=${params.address}`);
      if (!res.ok) return res;
      await cache.setJson(cacheKey, res.value, TTL.holder);
      return res;
    },
  } as const;
}

