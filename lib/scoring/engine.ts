import type { ScoreEngine, ScoringStrategy, TokenFlag, TokenScoreResult, TokenSnapshot } from '@/types';

function clampScore(n: number): number {
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

function gradeFromScore(score: number): 'SAFE' | 'CAUTION' | 'DEGEN' | 'RUG' {
  if (score >= 80) return 'SAFE';
  if (score >= 55) return 'CAUTION';
  if (score >= 25) return 'DEGEN';
  return 'RUG';
}

function baseSignals(snapshot: TokenSnapshot): { score: number; flags: TokenFlag[] } {
  const flags: TokenFlag[] = [];

  const mintDisabled = snapshot.security.mintAuthorityDisabled ?? null;
  const freezeDisabled = snapshot.security.freezeAuthorityDisabled ?? null;
  const top10 = snapshot.holders.top10HolderPct ?? null;
  const liquidity = snapshot.market.liquidity ?? null;

  // Critical rug heuristic from spec test:
  if (mintDisabled === false && freezeDisabled === false && typeof top10 === 'number' && top10 > 80) {
    flags.push('MINT_AUTH_ENABLED', 'FREEZE_AUTH_ENABLED', 'TOP10_HOLDERS_CONCENTRATED');
    return { score: 0, flags };
  }

  // Start from a neutral baseline.
  let score = 50;

  // Authority signals
  if (mintDisabled === true) score += 15;
  else if (mintDisabled === false) {
    score -= 20;
    flags.push('MINT_AUTH_ENABLED');
  }

  if (freezeDisabled === true) score += 15;
  else if (freezeDisabled === false) {
    score -= 15;
    flags.push('FREEZE_AUTH_ENABLED');
  }

  // Holder concentration
  if (typeof top10 === 'number') {
    if (top10 > 80) {
      score -= 35;
      flags.push('TOP10_HOLDERS_CONCENTRATED');
    } else if (top10 > 60) {
      score -= 15;
      flags.push('TOP10_HOLDERS_CONCENTRATED');
    } else if (top10 < 15) {
      score += 10;
    }
  } else {
    flags.push('HOLDER_DATA_MISSING');
    score -= 5;
  }

  // Liquidity heuristic
  if (typeof liquidity === 'number') {
    if (liquidity < 25_000) {
      score -= 15;
      flags.push('LOW_LIQUIDITY');
    } else if (liquidity > 500_000) {
      score += 10;
    }
  }

  return { score, flags };
}

export class ConservativeScorer implements ScoringStrategy {
  readonly name = 'conservative' as const;

  score(input: { snapshot: TokenSnapshot; now: Date }): TokenScoreResult {
    const { snapshot } = input;
    const base = baseSignals(snapshot);

    // Conservative penalizes volatility more.
    const vol = snapshot.market.volume24h ?? null;
    const change = snapshot.market.priceChange24h ?? null;

    let score = base.score;
    const flags = [...base.flags];

    if (typeof change === 'number' && Math.abs(change) > 80) {
      score -= 20;
      flags.push('HIGH_VOLATILITY');
    }

    if (typeof vol === 'number' && vol > 10_000_000) {
      score += 5;
    }

    const finalScore = clampScore(score);
    return { score: finalScore, grade: gradeFromScore(finalScore), flags };
  }
}

export class AggressiveScorer implements ScoringStrategy {
  readonly name = 'aggressive' as const;

  score(input: { snapshot: TokenSnapshot; now: Date }): TokenScoreResult {
    const { snapshot } = input;
    const base = baseSignals(snapshot);
    let score = base.score;
    const flags = [...base.flags];

    // Aggressive gives more credit for high volume/liquidity.
    const vol = snapshot.market.volume24h ?? null;
    const liq = snapshot.market.liquidity ?? null;

    if (typeof vol === 'number' && vol > 5_000_000) score += 10;
    if (typeof liq === 'number' && liq > 250_000) score += 10;

    const finalScore = clampScore(score);
    return { score: finalScore, grade: gradeFromScore(finalScore), flags };
  }
}

export class ScoreEngineImpl implements ScoreEngine {
  private readonly conservative: ScoringStrategy;
  private readonly aggressive: ScoringStrategy;
  private readonly aggressiveAgeSecondsThreshold: number;

  constructor(input: {
    conservative: ScoringStrategy;
    aggressive: ScoringStrategy;
    aggressiveAgeSecondsThreshold: number;
  }) {
    this.conservative = input.conservative;
    this.aggressive = input.aggressive;
    this.aggressiveAgeSecondsThreshold = input.aggressiveAgeSecondsThreshold;
  }

  evaluate(input: { snapshot: TokenSnapshot; now: Date }): TokenScoreResult & { strategy: ScoringStrategy['name'] } {
    const age = input.snapshot.ageSeconds ?? null;
    const useAggressive = typeof age === 'number' && age >= this.aggressiveAgeSecondsThreshold;
    const strategy = useAggressive ? this.aggressive : this.conservative;
    const res = strategy.score(input);
    return { ...res, strategy: strategy.name };
  }
}

