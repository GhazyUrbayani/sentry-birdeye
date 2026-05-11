import { Redis } from '@upstash/redis';

type Millis = number;

export type CacheGetResult<T> =
  | { hit: true; value: T; source: 'redis' | 'memory' }
  | { hit: false; source: 'redis' | 'memory' };

export type CacheSetResult = { ok: true; source: 'redis' | 'memory' } | { ok: false; source: 'redis' | 'memory' };

export interface CacheClient {
  getJson<T>(key: string): Promise<CacheGetResult<T>>;
  setJson<T>(key: string, value: T, ttlSeconds: number): Promise<CacheSetResult>;
  del(key: string): Promise<void>;
  ping(): Promise<boolean>;
}

const isRedisConfigured = (): boolean =>
  Boolean(process.env['UPSTASH_REDIS_REST_URL'] && process.env['UPSTASH_REDIS_REST_TOKEN']);

let redisSingleton: Redis | null = null;

function getRedis(): Redis | null {
  if (!isRedisConfigured()) return null;
  if (redisSingleton) return redisSingleton;
  redisSingleton = Redis.fromEnv();
  return redisSingleton;
}

type MemoryEntry = { expiresAtMs: Millis; json: unknown };
const memory = new Map<string, MemoryEntry>();

function nowMs(): Millis {
  return Date.now();
}

function sweepMemory(now: Millis): void {
  // Best-effort sweep; bounded by current map size.
  for (const [k, v] of memory) {
    if (v.expiresAtMs <= now) memory.delete(k);
  }
}

export const cache: CacheClient = {
  async getJson<T>(key: string): Promise<CacheGetResult<T>> {
    const redis = getRedis();
    if (redis) {
      try {
        const value = await redis.get<T>(key);
        if (value === null) return { hit: false, source: 'redis' };
        return { hit: true, value, source: 'redis' };
      } catch {
        // Fall through to in-memory cache if Redis is down/unreachable.
      }
    }

    const now = nowMs();
    sweepMemory(now);
    const entry = memory.get(key);
    if (!entry) return { hit: false, source: 'memory' };
    if (entry.expiresAtMs <= now) {
      memory.delete(key);
      return { hit: false, source: 'memory' };
    }
    return { hit: true, value: entry.json as T, source: 'memory' };
  },

  async setJson<T>(key: string, value: T, ttlSeconds: number): Promise<CacheSetResult> {
    const redis = getRedis();
    if (redis) {
      try {
        // Upstash accepts { ex: seconds } for TTL.
        await redis.set(key, value, { ex: ttlSeconds });
        return { ok: true, source: 'redis' };
      } catch {
        // Fall back to memory.
      }
    }

    const now = nowMs();
    memory.set(key, { expiresAtMs: now + ttlSeconds * 1000, json: value });
    return { ok: true, source: 'memory' };
  },

  async del(key: string): Promise<void> {
    const redis = getRedis();
    if (redis) {
      try {
        await redis.del(key);
      } catch {
        // ignore
      }
    }
    memory.delete(key);
  },

  async ping(): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;
    try {
      const res = await redis.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  },
};

