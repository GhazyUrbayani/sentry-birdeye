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
  overview: 60,
} as const;

function key(kind: keyof typeof TTL, parts: string[]): string {
  return ['birdeye', kind, ...parts].join(':');
}

type NewListingResponse = {
  items?: Array<{
    address: SolanaAddress;
    symbol?: string | null;
    name?: string | null;
    logoURI?: string | null;
    liquidityAddedAt?: string | null;
    listedAt?: string | null;
  }>;
};

type TrendingResponse = {
  tokens?: Array<{
    address: SolanaAddress;
    symbol?: string | null;
    name?: string | null;
    logoURI?: string | null;
    liquidity?: number | null;
    volume24hUSD?: number | null;
    price24hChangePercent?: number | null;
  }>;
};

type OverviewResponse = {
  liquidity?: number | null;
  volume24hUSD?: number | null;
  price24hChangePercent?: number | null;
};

type HolderResponse = {
  items?: Array<{
    ui_amount?: number | null;
    amount?: number | string | null;
    decimals?: number | null;
  }>;
  total?: number | string | null;
  total_supply?: number | string | null;
  totalSupply?: number | string | null;
  totalUiAmount?: number | string | null;
};

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 0) return false;
  if (value === 1) return true;
  return null;
}

function disabledFromAuthority(value: unknown): boolean | null {
  if (value === null) return true;
  if (typeof value === 'string') return value.length === 0 ? true : false;
  return null;
}

function pickAuthorityDisabled(
  data: Record<string, unknown>,
  disabledKeys: string[],
  authorityKeys: string[],
): boolean | null {
  for (const keyName of disabledKeys) {
    const val = asBoolean(data[keyName]);
    if (val !== null) return val;
  }
  for (const keyName of authorityKeys) {
    const val = disabledFromAuthority(data[keyName]);
    if (val !== null) return val;
  }
  return null;
}

function holderUiAmount(item: { ui_amount?: number | null; amount?: number | string | null; decimals?: number | null }): number | null {
  const ui = asNumber(item.ui_amount);
  if (ui !== null) return ui;
  const amount = asNumber(item.amount);
  const decimals = asNumber(item.decimals);
  if (amount === null || decimals === null) return null;
  return amount / Math.pow(10, decimals);
}

function top10HolderPct(data: HolderResponse): number | null {
  const total =
    asNumber(data.total) ??
    asNumber(data.total_supply) ??
    asNumber(data.totalSupply) ??
    asNumber(data.totalUiAmount);
  if (!total || total <= 0) return null;

  const items = Array.isArray(data.items) ? data.items : [];
  const top10 = items.slice(0, 10).reduce((sum, item) => sum + (holderUiAmount(item) ?? 0), 0);
  if (top10 <= 0) return null;
  return (top10 / total) * 100;
}

export function createBirdeyeEndpoints(input: { client: BirdeyeHttpClient; cache: CacheClient }) {
  const { client, cache } = input;

  return {
    async newListing(params: { limit: number }): Promise<Result<BirdeyeNewListingItem[], BirdeyeError>> {
      const cacheKey = key('new_listing', [String(params.limit)]);
      const hit = await cache.getJson<BirdeyeNewListingItem[]>(cacheKey);
      if (hit.hit) return { ok: true, value: hit.value };

      const res = await client.getJson<NewListingResponse>(
        `/defi/v2/tokens/new_listing?limit=${params.limit}&meme_platform_enabled=false`,
      );
      if (!res.ok) return res;
      const items = Array.isArray(res.value.items) ? res.value.items : [];
      const mapped = items.map((item) => ({
        address: item.address,
        symbol: item.symbol ?? null,
        name: item.name ?? null,
        logoURI: item.logoURI ?? null,
        listedAt: item.liquidityAddedAt ?? item.listedAt ?? null,
      }));
      await cache.setJson(cacheKey, mapped, TTL.new_listing);
      return { ok: true, value: mapped };
    },

    async trending(params: { limit: number }): Promise<Result<BirdeyeTrendingToken[], BirdeyeError>> {
      const cacheKey = key('trending', [String(params.limit)]);
      const hit = await cache.getJson<BirdeyeTrendingToken[]>(cacheKey);
      if (hit.hit) return { ok: true, value: hit.value };

      const res = await client.getJson<TrendingResponse>(
        `/defi/token_trending?sort_by=rank&interval=24h&sort_type=asc&offset=0&limit=${params.limit}&ui_amount_mode=scaled`,
      );
      if (!res.ok) return res;
      const tokens = Array.isArray(res.value.tokens) ? res.value.tokens : [];
      const mapped = tokens.map((token) => ({
        address: token.address,
        symbol: token.symbol ?? null,
        name: token.name ?? null,
        logoURI: token.logoURI ?? null,
        liquidity: token.liquidity ?? null,
        volume24h: token.volume24hUSD ?? null,
        priceChange24h: token.price24hChangePercent ?? null,
      }));
      await cache.setJson(cacheKey, mapped, TTL.trending);
      return { ok: true, value: mapped };
    },

    async tokenOverview(params: { address: SolanaAddress }): Promise<Result<{ liquidity: number | null, volume24h: number | null, priceChange24h: number | null }, BirdeyeError>> {
      const cacheKey = key('overview', [params.address]);
      const hit = await cache.getJson<{ liquidity: number | null, volume24h: number | null, priceChange24h: number | null }>(cacheKey);
      if (hit.hit) return { ok: true, value: hit.value };

      const res = await client.getJson<any>(`/defi/token_overview?address=${params.address}`);
      if (!res.ok) return res;
      
      const mapped = {
        liquidity: res.value?.liquidity ?? null,
        volume24h: res.value?.v24hUSD ?? res.value?.volume24hUSD ?? null,
        priceChange24h: res.value?.v24hChangePercent ?? res.value?.price24hChangePercent ?? null,
      };
      await cache.setJson(cacheKey, mapped, TTL.overview);
      return { ok: true, value: mapped };
    },

    async tokenSecurity(params: { address: SolanaAddress }): Promise<Result<BirdeyeTokenSecurity, BirdeyeError>> {
      const cacheKey = key('token_security', [params.address]);
      const hit = await cache.getJson<BirdeyeTokenSecurity>(cacheKey);
      if (hit.hit) return { ok: true, value: hit.value };

      const res = await client.getJson<Record<string, unknown>>(`/defi/token_security?address=${params.address}`);
      if (!res.ok) return res;
      const mintAuthorityDisabled = pickAuthorityDisabled(
        res.value ?? {},
        ['mintAuthorityDisabled', 'isMintAuthorityDisabled'],
        ['mintAuthority', 'mintAuthorityAddress'],
      );
      const freezeAuthorityDisabled = pickAuthorityDisabled(
        res.value ?? {},
        ['freezeAuthorityDisabled', 'isFreezeAuthorityDisabled'],
        ['freezeAuthority', 'freezeAuthorityAddress'],
      );
      const mapped: BirdeyeTokenSecurity = {
        address: params.address,
        mintAuthorityDisabled,
        freezeAuthorityDisabled,
      };
      await cache.setJson(cacheKey, mapped, TTL.token_security);
      return { ok: true, value: mapped };
    },

    async holders(params: { address: SolanaAddress }): Promise<Result<BirdeyeTokenHolders, BirdeyeError>> {
      const cacheKey = key('holder', [params.address]);
      const hit = await cache.getJson<BirdeyeTokenHolders>(cacheKey);
      if (hit.hit) return { ok: true, value: hit.value };

      const res = await client.getJson<HolderResponse>(
        `/defi/v3/token/holder?address=${params.address}&offset=0&limit=10&ui_amount_mode=scaled`,
      );
      if (!res.ok) return res;
      const pct = top10HolderPct(res.value ?? {});
      const mapped: BirdeyeTokenHolders = {
        address: params.address,
        top10HolderPct: pct,
      };
      await cache.setJson(cacheKey, mapped, TTL.holder);
      return { ok: true, value: mapped };
    },
  } as const;
}

