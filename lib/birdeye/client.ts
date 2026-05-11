import type {
  BirdeyeClientConfig,
  BirdeyeError,
  BirdeyeResponseEnvelope,
  CircuitBreakerState,
  CircuitBreakerStatus,
  Result,
} from '@/types';

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type Deps = {
  fetch: FetchLike;
  nowMs: () => number;
  sleepMs: (ms: number) => Promise<void>;
};

type Config = BirdeyeClientConfig & Partial<Deps>;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function backoffMs(attempt: number, base: number, max: number): number {
  // attempt: 1..maxRetries (first retry is 1)
  const raw = base * Math.pow(2, attempt - 1);
  return clamp(raw, base, max);
}

export class BirdeyeClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly failureThreshold: number;
  private readonly failureWindowMs: number;
  private readonly openStateDurationMs: number;
  private readonly fetchImpl: FetchLike;
  private readonly nowMs: () => number;
  private readonly sleepMs: (ms: number) => Promise<void>;

  private state: CircuitBreakerState = 'CLOSED';
  private consecutiveFailures = 0;
  private lastFailureAt: number | null = null;
  private openedAt: number | null = null;

  constructor(config: Config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeoutMs = config.timeoutMs;
    this.maxRetries = config.retry.maxRetries;
    this.baseDelayMs = config.retry.baseDelayMs;
    this.maxDelayMs = config.retry.maxDelayMs;
    this.failureThreshold = config.circuitBreaker.failureThreshold;
    this.failureWindowMs = config.circuitBreaker.failureWindowMs;
    this.openStateDurationMs = config.circuitBreaker.openStateDurationMs;

    this.fetchImpl = config.fetch ?? fetch;
    this.nowMs = config.nowMs ?? (() => Date.now());
    this.sleepMs =
      config.sleepMs ??
      (async (ms: number) => {
        await new Promise<void>((r) => setTimeout(r, ms));
      });
  }

  status(): CircuitBreakerStatus {
    const nextRetryAt =
      this.state === 'OPEN' && this.openedAt !== null ? this.openedAt + this.openStateDurationMs : null;
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureAt: this.lastFailureAt,
      openedAt: this.openedAt,
      nextRetryAt,
    };
  }

  async getJson<T>(path: string, init?: Omit<RequestInit, 'method'>): Promise<Result<T, BirdeyeError>> {
    return await this.requestJson<T>(path, { ...init, method: 'GET' });
  }

  private shouldCountFailure(now: number): boolean {
    if (this.lastFailureAt === null) return true;
    return now - this.lastFailureAt <= this.failureWindowMs;
  }

  private recordFailure(now: number): void {
    if (!this.shouldCountFailure(now)) {
      this.consecutiveFailures = 0;
    }
    this.consecutiveFailures += 1;
    this.lastFailureAt = now;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = now;
    }
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.lastFailureAt = null;
    this.state = 'CLOSED';
    this.openedAt = null;
  }

  private allowRequest(now: number): boolean {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'HALF_OPEN') return true; // allow probe

    // OPEN: only allow after open duration to transition to HALF_OPEN
    if (this.openedAt === null) return false;
    const elapsed = now - this.openedAt;
    if (elapsed >= this.openStateDurationMs) {
      this.state = 'HALF_OPEN';
      return true;
    }
    return false;
  }

  private async requestJson<T>(path: string, init: RequestInit): Promise<Result<T, BirdeyeError>> {
    const now = this.nowMs();
    if (!this.allowRequest(now)) {
      return { ok: false, error: { kind: 'circuit_open', message: 'Birdeye circuit breaker is OPEN' } };
    }

    const url = path.startsWith('http') ? path : `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const headers = new Headers(init.headers);
    headers.set('X-API-KEY', this.apiKey);
    headers.set('accept', 'application/json');

    const timeoutMs = this.timeoutMs;

    let attempt = 0;
    const maxAttempts = 1 + this.maxRetries;

    while (attempt < maxAttempts) {
      attempt += 1;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await this.fetchImpl(url, { ...init, headers, signal: controller.signal });
        const text = await res.text();

        let json: unknown;
        try {
          json = text.length ? (JSON.parse(text) as unknown) : null;
        } catch (cause) {
          this.recordFailure(this.nowMs());
          return { ok: false, error: { kind: 'parse', message: 'Failed to parse Birdeye JSON', cause } };
        }

        if (!res.ok) {
          this.recordFailure(this.nowMs());
          const message =
            typeof json === 'object' && json !== null && 'message' in json && typeof (json as { message?: unknown }).message === 'string'
              ? (json as { message: string }).message
              : `Birdeye HTTP error: ${res.status}`;

          if (attempt < maxAttempts) {
            await this.sleepMs(backoffMs(attempt, this.baseDelayMs, this.maxDelayMs));
            continue;
          }

          return { ok: false, error: { kind: 'http', message, statusCode: res.status } };
        }

        const envelope = json as BirdeyeResponseEnvelope<T>;
        if (!envelope || envelope.success !== true) {
          this.recordFailure(this.nowMs());
          const message =
            envelope && typeof envelope.message === 'string' ? envelope.message : 'Birdeye returned success=false';
          return { ok: false, error: { kind: 'http', message, statusCode: res.status } };
        }

        this.recordSuccess();
        return { ok: true, value: envelope.data };
      } catch (cause) {
        const isAbort = cause instanceof DOMException && cause.name === 'AbortError';
        this.recordFailure(this.nowMs());

        if (attempt < maxAttempts) {
          await this.sleepMs(backoffMs(attempt, this.baseDelayMs, this.maxDelayMs));
          continue;
        }

        return {
          ok: false,
          error: { kind: isAbort ? 'timeout' : 'network', message: isAbort ? 'Birdeye request timed out' : 'Birdeye network error', cause },
        };
      } finally {
        clearTimeout(timeout);
      }
    }

    // unreachable
    return { ok: false, error: { kind: 'network', message: 'Birdeye request failed' } };
  }
}

