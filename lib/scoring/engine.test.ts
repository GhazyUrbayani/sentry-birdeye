import { describe, expect, it } from 'vitest';
import { ConservativeScorer, ScoreEngineImpl } from './engine';

describe('scoring/engine critical edge cases', () => {
  it('score=0 when mint+freeze active AND top10>80%', () => {
    const engine = new ScoreEngineImpl({
      conservative: new ConservativeScorer(),
      aggressive: new ConservativeScorer(),
      aggressiveAgeSecondsThreshold: 3600,
    });

    const res = engine.evaluate({
      now: new Date('2026-01-01T00:00:00Z'),
      snapshot: {
        identity: { address: 'So11111111111111111111111111111111111111112', symbol: 'TEST' },
        market: { liquidity: 1000, volume24h: 5000, priceChange24h: 10 },
        security: { mintAuthorityDisabled: false, freezeAuthorityDisabled: false },
        holders: { top10HolderPct: 81 },
        ageSeconds: 10,
      },
    });

    expect(res.score).toBe(0);
    expect(res.grade).toBe('RUG');
  });

  it('score is capped at 100 even with all bonuses', () => {
    const engine = new ScoreEngineImpl({
      conservative: new ConservativeScorer(),
      aggressive: new ConservativeScorer(),
      aggressiveAgeSecondsThreshold: 3600,
    });

    const res = engine.evaluate({
      now: new Date('2026-01-01T00:00:00Z'),
      snapshot: {
        identity: { address: 'So11111111111111111111111111111111111111112', symbol: 'TEST' },
        market: { liquidity: 10_000_000, volume24h: 50_000_000, priceChange24h: 1 },
        security: { mintAuthorityDisabled: true, freezeAuthorityDisabled: true },
        holders: { top10HolderPct: 5 },
        ageSeconds: 100_000,
      },
    });

    expect(res.score).toBe(100);
    expect(res.grade).toBe('SAFE');
  });
});

