import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type {
  FixedWindowConfig,
  LeakyBucketConfig,
  RateLimitAlgorithm,
  RateLimitDecision,
  RateLimiter,
  RateLimiterConfig,
  RateLimiterFactory,
  SlidingWindowLogConfig,
  TokenBucketConfig,
} from '@/types';

function decisionFromUpstash(res: {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}): RateLimitDecision {
  const now = Date.now();
  const resetMs = typeof res.reset === 'number' ? res.reset : now;
  const retryAfterMs = res.success ? undefined : Math.max(0, resetMs - now);
  return {
    allowed: res.success,
    limit: res.limit,
    remaining: res.remaining,
    resetMs,
    retryAfterMs,
  };
}

export class UpstashTokenBucketLimiter implements RateLimiter {
  readonly algorithm: RateLimitAlgorithm = 'token-bucket';
  private readonly limiter: Ratelimit;

  constructor(input: { redis: Redis; config: TokenBucketConfig }) {
    const intervalSeconds = Math.max(1, Math.floor(input.config.intervalMs / 1000));
    this.limiter = new Ratelimit({
      redis: input.redis,
      limiter: Ratelimit.tokenBucket(input.config.tokensPerInterval, `${intervalSeconds} s`, input.config.burst),
    });
  }

  async limit(input: { key: string }): Promise<RateLimitDecision> {
    const res = await this.limiter.limit(input.key);
    return decisionFromUpstash(res);
  }
}

export class UpstashFixedWindowLimiter implements RateLimiter {
  readonly algorithm: RateLimitAlgorithm = 'fixed-window';
  private readonly limiter: Ratelimit;

  constructor(input: { redis: Redis; config: FixedWindowConfig }) {
    this.limiter = new Ratelimit({
      redis: input.redis,
      limiter: Ratelimit.fixedWindow(input.config.limit, `${Math.floor(input.config.windowMs / 1000)} s`),
    });
  }

  async limit(input: { key: string }): Promise<RateLimitDecision> {
    const res = await this.limiter.limit(input.key);
    return decisionFromUpstash(res);
  }
}

export class UpstashSlidingWindowLogLimiter implements RateLimiter {
  readonly algorithm: RateLimitAlgorithm = 'sliding-window-log';
  private readonly limiter: Ratelimit;

  constructor(input: { redis: Redis; config: SlidingWindowLogConfig }) {
    this.limiter = new Ratelimit({
      redis: input.redis,
      limiter: Ratelimit.slidingWindow(input.config.limit, `${Math.floor(input.config.windowMs / 1000)} s`),
    });
  }

  async limit(input: { key: string }): Promise<RateLimitDecision> {
    const res = await this.limiter.limit(input.key);
    return decisionFromUpstash(res);
  }
}

/**
 * Leaky bucket is enforced by the dispatch queue (constant drain rate).
 * This limiter exists for consistency and for components that want a `RateLimiter` handle.
 */
export class LeakyBucketLimiter implements RateLimiter {
  readonly algorithm: RateLimitAlgorithm = 'leaky-bucket';
  private readonly drainPerSecond: number;
  constructor(config: LeakyBucketConfig) {
    this.drainPerSecond = config.drainPerSecond;
  }

  async limit(): Promise<RateLimitDecision> {
    return {
      allowed: true,
      limit: this.drainPerSecond,
      remaining: this.drainPerSecond,
      resetMs: Date.now(),
    };
  }
}

// -----------------------------
// Test-friendly in-memory limiter
// -----------------------------

export interface SlidingWindowLogLimiter {
  limit(input: { key: string; nowMs?: number }): Promise<RateLimitDecision>;
}

export class InMemorySlidingWindowLogLimiter implements SlidingWindowLogLimiter {
  private readonly limitCount: number;
  private readonly windowMs: number;
  private readonly logs = new Map<string, number[]>();

  constructor(config: { limit: number; windowMs: number }) {
    this.limitCount = config.limit;
    this.windowMs = config.windowMs;
  }

  async limit(input: { key: string; nowMs?: number }): Promise<RateLimitDecision> {
    const now = input.nowMs ?? Date.now();
    const start = now - this.windowMs;
    const arr = this.logs.get(input.key) ?? [];
    const kept = arr.filter((ts) => ts > start);
    const allowed = kept.length < this.limitCount;
    if (allowed) kept.push(now);
    this.logs.set(input.key, kept);

    const oldest = kept.length ? (kept[0] ?? now) : now;
    const resetMs = oldest + this.windowMs;
    return {
      allowed,
      limit: this.limitCount,
      remaining: allowed ? this.limitCount - kept.length : 0,
      resetMs,
      retryAfterMs: allowed ? undefined : Math.max(0, resetMs - now),
    };
  }
}

export class DefaultRateLimiterFactory implements RateLimiterFactory {
  private readonly redis: Redis | null;

  constructor(redis?: Redis | null) {
    this.redis = redis ?? (process.env['UPSTASH_REDIS_REST_URL'] ? Redis.fromEnv() : null);
  }

  create(config: RateLimiterConfig): RateLimiter {
    if (config.algorithm === 'leaky-bucket') return new LeakyBucketLimiter(config);

    if (!this.redis) {
      // No Redis configured; degrade to a permissive limiter (enforced elsewhere).
      return new LeakyBucketLimiter({ algorithm: 'leaky-bucket', drainPerSecond: Number.POSITIVE_INFINITY });
    }

    switch (config.algorithm) {
      case 'token-bucket':
        return new UpstashTokenBucketLimiter({ redis: this.redis, config });
      case 'fixed-window':
        return new UpstashFixedWindowLimiter({ redis: this.redis, config });
      case 'sliding-window-log':
        return new UpstashSlidingWindowLogLimiter({ redis: this.redis, config });
      default: {
        const _exhaustive: never = config;
        throw new Error(`Unsupported algorithm: ${(config as { algorithm: string }).algorithm}`);
      }
    }
  }
}

