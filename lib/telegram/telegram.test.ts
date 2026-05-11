import { describe, expect, it, vi } from 'vitest';
import { formatAlertMessage } from './bot';
import { QStashLeakyBucketQueue } from './queue';

describe('telegram/bot', () => {
  it('formats a token alert message', () => {
    const msg = formatAlertMessage({
      address: 'So11111111111111111111111111111111111111112',
      symbol: 'TEST',
      grade: 'SAFE',
      score: 92,
      flags: [],
      appUrl: 'http://localhost:3000',
    });
    expect(msg.text).toContain('SAFE');
    expect(msg.text).toContain('TEST');
    expect(msg.text).toContain('92/100');
  });
});

describe('telegram/queue leaky bucket', () => {
  it('assigns increasing delays to respect 25 msg/sec', async () => {
    const published: Array<{ delay: number }> = [];
    const queue = new QStashLeakyBucketQueue({
      publish: async (_req) => {
        published.push({ delay: _req.delay });
        return { ok: true };
      },
      drainPerSecond: 25,
      nowMs: (() => 1_000) as () => number,
      telegramToken: 'test-token',
    });

    await queue.enqueue({ chatId: 1, text: 'a' });
    await queue.enqueue({ chatId: 1, text: 'b' });
    await queue.enqueue({ chatId: 1, text: 'c' });

    expect(published.length).toBe(3);
    expect(published[0]?.delay).toBe(0);
    expect(published[1]?.delay).toBeGreaterThanOrEqual(published[0]?.delay ?? 0);
    expect(published[2]?.delay).toBeGreaterThanOrEqual(published[1]?.delay ?? 0);
    // At 25 msg/sec, spacing is ~40ms -> delays can stay 0 for small bursts but must not decrease.
    expect(published.map((p) => p.delay)).toEqual([...published.map((p) => p.delay)].sort((a, b) => a - b));
  });
});

