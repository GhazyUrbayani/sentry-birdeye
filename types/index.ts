/* eslint-disable @typescript-eslint/consistent-type-definitions */

/**
 * SENTRY — shared TypeScript types (NO runtime logic).
 *
 * Quality gate:
 * - No `any` (use `unknown` + guards in implementation)
 * - Prefer narrow unions for domain states (grade, circuit breaker state, etc.)
 */

// -----------------------------
// Shared primitives / utilities
// -----------------------------

export type ISODateTimeString = string;

/** Solana pubkey (base58). Validated at runtime elsewhere. */
export type SolanaAddress = string;

export type UUID = string;

export type Grade = 'SAFE' | 'CAUTION' | 'DEGEN' | 'RUG';
export type SubscriberFilter = 'ALL' | 'SAFE' | 'CAUTION';

export type AlertStatus = 'sent' | 'failed' | 'retrying';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/** Minimal JSON value for typed caches / logs. */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | { [k: string]: JsonValue } | JsonValue[];

// -----------------------------
// Domain model: token intelligence
// -----------------------------

export type TokenFlag =
  | 'MINT_AUTH_ENABLED'
  | 'FREEZE_AUTH_ENABLED'
  | 'TOP10_HOLDERS_CONCENTRATED'
  | 'LOW_LIQUIDITY'
  | 'HIGH_VOLATILITY'
  | 'NEW_LISTING'
  | 'UNVERIFIED_SYMBOL'
  | 'SECURITY_DATA_MISSING'
  | 'HOLDER_DATA_MISSING'
  | 'BIRDEYE_DEGRADED'
  | 'AI_BRIEF_SKIPPED';

export interface TokenIdentity {
  address: SolanaAddress;
  symbol?: string | null;
  name?: string | null;
  logoURI?: string | null;
}

export interface TokenMarketMetrics {
  liquidity?: number | null;
  volume24h?: number | null;
  priceChange24h?: number | null;
}

export interface TokenSecuritySignals {
  mintAuthorityDisabled?: boolean | null;
  freezeAuthorityDisabled?: boolean | null;
}

export interface TokenHolderSignals {
  top10HolderPct?: number | null;
}

export interface TokenSnapshot {
  identity: TokenIdentity;
  market: TokenMarketMetrics;
  security: TokenSecuritySignals;
  holders: TokenHolderSignals;
  /** seconds since the token was first seen/listed by our system */
  ageSeconds?: number | null;
}

export interface TokenScoreResult {
  score: number; // 0..100
  grade: Grade;
  flags: TokenFlag[];
}

export interface TokenScanRecord {
  id: UUID;
  address: SolanaAddress;
  symbol?: string | null;
  score: number;
  grade: Grade;
  flags: TokenFlag[];
  aiBrief?: string | null;
  liquidity?: number | null;
  volume24h?: number | null;
  priceChange24h?: number | null;
  top10HolderPct?: number | null;
  mintAuthDisabled?: boolean | null;
  freezeAuthDisabled?: boolean | null;
  scannedAt: ISODateTimeString;
}

// -----------------------------
// Supabase schema row types
// -----------------------------

export interface TokenScansRow {
  id: UUID;
  address: string;
  symbol: string | null;
  score: number;
  grade: Grade;
  flags: string[] | null;
  ai_brief: string | null;
  liquidity: number | null;
  volume_24h: number | null;
  price_change_24h: number | null;
  top10_holder_pct: number | null;
  mint_auth_disabled: boolean | null;
  freeze_auth_disabled: boolean | null;
  scanned_at: string;
}

export interface SubscribersRow {
  id: UUID;
  chat_id: number; // BIGINT -> number in JS; careful with precision at runtime if extremely large.
  username: string | null;
  filter: SubscriberFilter;
  active: boolean;
  joined_at: string;
}

export interface AlertLogRow {
  id: UUID;
  scan_id: UUID | null;
  chat_id: number;
  status: AlertStatus | null;
  attempts: number | null;
  created_at: string;
}

// -----------------------------
// Repository pattern: persistence
// -----------------------------

export interface TokenRepository {
  findByGrade(input: { grade: Grade; limit: number }): Promise<TokenScanRecord[]>;
  findRecent(input: { limit: number; grades?: Grade[] }): Promise<TokenScanRecord[]>;
  upsert(input: { record: TokenScanRecord }): Promise<{ id: UUID }>;
}

// -----------------------------
// Strategy pattern: scoring engine
// -----------------------------

export interface ScoringStrategy {
  readonly name: 'conservative' | 'aggressive';
  score(input: { snapshot: TokenSnapshot; now: Date }): TokenScoreResult;
}

export interface ScoreEngine {
  /**
   * Selects an appropriate strategy based on snapshot age.
   * Implementations must remain deterministic for the same inputs.
   */
  evaluate(input: { snapshot: TokenSnapshot; now: Date }): TokenScoreResult & { strategy: ScoringStrategy['name'] };
}

// -----------------------------
// Circuit breaker: Birdeye HTTP client
// -----------------------------

export interface CircuitBreakerConfig {
  /** consecutive failures required to open the breaker */
  failureThreshold: number; // e.g. 3
  /** time window for counting consecutive failures, in ms */
  failureWindowMs: number; // e.g. 10_000
  /** how long to keep OPEN before transitioning to HALF_OPEN */
  openStateDurationMs: number; // e.g. 30_000
}

export interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  consecutiveFailures: number;
  lastFailureAt?: number | null;
  openedAt?: number | null;
  nextRetryAt?: number | null;
}

export interface RetryConfig {
  maxRetries: number; // e.g. 3
  baseDelayMs: number; // e.g. 1000
  maxDelayMs: number; // e.g. 4000
}

export interface HttpRequestMeta {
  requestId: string;
  startedAtMs: number;
}

export interface BirdeyeClientConfig {
  apiKey: string;
  baseUrl: string; // https://public-api.birdeye.so
  timeoutMs: number;
  retry: RetryConfig;
  circuitBreaker: CircuitBreakerConfig;
}

export interface BirdeyeError {
  kind: 'network' | 'timeout' | 'http' | 'parse' | 'circuit_open';
  message: string;
  statusCode?: number;
  cause?: unknown;
}

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export interface BirdeyeResponseEnvelope<TData> {
  success: boolean;
  data: TData;
  message?: string;
}

// -----------------------------
// Birdeye endpoint response types (normalized)
// -----------------------------

export interface BirdeyeNewListingItem {
  address: SolanaAddress;
  symbol?: string | null;
  name?: string | null;
  logoURI?: string | null;
  listedAt?: ISODateTimeString | null;
}

export interface BirdeyeTokenSecurity {
  address: SolanaAddress;
  mintAuthorityDisabled?: boolean | null;
  freezeAuthorityDisabled?: boolean | null;
  raw?: JsonValue;
}

export interface BirdeyeTokenHolders {
  address: SolanaAddress;
  top10HolderPct?: number | null;
  raw?: JsonValue;
}

export interface BirdeyeTrendingToken {
  address: SolanaAddress;
  symbol?: string | null;
  name?: string | null;
  logoURI?: string | null;
  liquidity?: number | null;
  volume24h?: number | null;
  priceChange24h?: number | null;
  raw?: JsonValue;
}

export interface ListingQuery {
  limit: number;
}

export interface TrendingQuery {
  limit: number;
}

// -----------------------------
// Cache / TTL policy types
// -----------------------------

export type BirdeyeCacheKeyKind = 'new_listing' | 'token_security' | 'trending' | 'holder';

export interface CacheTtlPolicySeconds {
  new_listing: 30;
  token_security: 300;
  trending: 60;
  holder: 120;
}

export interface CacheRecord<T> {
  value: T;
  cachedAtMs: number;
  ttlSeconds: number;
}

// -----------------------------
// Rate limiting algorithms
// -----------------------------

export type RateLimitAlgorithm = 'token-bucket' | 'leaky-bucket' | 'fixed-window' | 'sliding-window-log';

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterMs?: number;
}

export interface TokenBucketConfig {
  algorithm: 'token-bucket';
  tokensPerInterval: number; // 100
  intervalMs: number; // 60_000
  burst: number; // 20
}

export interface FixedWindowConfig {
  algorithm: 'fixed-window';
  limit: number; // 5
  windowMs: number; // 60_000
}

export interface SlidingWindowLogConfig {
  algorithm: 'sliding-window-log';
  limit: number; // 10
  windowMs: number; // 60_000
}

/**
 * Leaky bucket is used for smoothing egress (Telegram dispatch).
 * This config describes the drain rate; the backing implementation is queue-based.
 */
export interface LeakyBucketConfig {
  algorithm: 'leaky-bucket';
  drainPerSecond: number; // 25
}

export type RateLimiterConfig =
  | TokenBucketConfig
  | FixedWindowConfig
  | SlidingWindowLogConfig
  | LeakyBucketConfig;

export interface RateLimiter {
  readonly algorithm: RateLimitAlgorithm;
  limit(input: { key: string; nowMs?: number }): Promise<RateLimitDecision>;
}

export interface RateLimiterFactory {
  create(config: RateLimiterConfig): RateLimiter;
}

// -----------------------------
// Observer pattern: scan pipeline
// -----------------------------

export type ScanTrigger = 'cron' | 'manual';

export interface ScanContext {
  trigger: ScanTrigger;
  startedAtMs: number;
  requestId: string;
}

export type ScanEvent =
  | { type: 'scan_started'; ctx: ScanContext }
  | { type: 'token_scanned'; ctx: ScanContext; record: TokenScanRecord }
  | { type: 'scan_failed'; ctx: ScanContext; error: { message: string; cause?: unknown } }
  | { type: 'scan_completed'; ctx: ScanContext; durationMs: number; scannedCount: number };

export interface ScanObserver {
  onEvent(event: ScanEvent): Promise<void>;
}

export interface ScanPipeline {
  attach(observer: ScanObserver): void;
  detach(observer: ScanObserver): void;
  run(input: { trigger: ScanTrigger; requestId: string }): Promise<{
    scannedCount: number;
    lastScanAt: ISODateTimeString;
    degraded: boolean;
  }>;
}

// -----------------------------
// Telegram: subscribers + alert dispatch
// -----------------------------

export interface TelegramSubscriber {
  chatId: number;
  username?: string | null;
  filter: SubscriberFilter;
  active: boolean;
}

export interface TelegramAlertMessage {
  chatId: number;
  text: string;
  parseMode?: 'HTML' | 'MarkdownV2';
  disableWebPagePreview?: boolean;
}

export interface TelegramDispatchResult {
  ok: boolean;
  messageId?: number;
  error?: { message: string; cause?: unknown };
}

export interface TelegramQueueJob {
  id: string;
  payload: TelegramAlertMessage;
  attemptsMade: number;
  maxAttempts: number;
  createdAtMs: number;
}

// -----------------------------
// AI narrator (Anthropic) — optional
// -----------------------------

export interface AiBriefInput {
  snapshot: TokenSnapshot;
  score: TokenScoreResult;
}

export interface AiBriefOutput {
  brief: string;
  model: string;
  createdAtMs: number;
}

export interface AiNarrator {
  createBrief(input: AiBriefInput): Promise<Result<AiBriefOutput, { message: string; cause?: unknown }>>;
}

// -----------------------------
// Health endpoint
// -----------------------------

export interface HealthStatusResponse {
  status: 'ok' | 'degraded' | 'down';
  uptime: number;
  lastScanAt: ISODateTimeString | null;
  birdeye_reachable: boolean;
  redis_reachable: boolean;
  supabase_reachable: boolean;
}

