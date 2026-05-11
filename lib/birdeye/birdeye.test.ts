import { describe, expect, it, vi } from 'vitest';
import { BirdeyeClient } from './client';

function okJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function errJson(message: string, status = 500): Response {
  return new Response(JSON.stringify({ success: false, data: null, message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('BirdeyeClient circuit breaker', () => {
  it('transitions CLOSED -> OPEN after 3 consecutive failures', async () => {
    const fetchMock = vi.fn(async () => errJson('boom', 503));

    const client = new BirdeyeClient({
      apiKey: 'x',
      baseUrl: 'https://public-api.birdeye.so',
      timeoutMs: 1_000,
      retry: { maxRetries: 0, baseDelayMs: 1_000, maxDelayMs: 4_000 },
      circuitBreaker: { failureThreshold: 3, failureWindowMs: 10_000, openStateDurationMs: 30_000 },
      fetch: fetchMock,
      nowMs: () => 1000,
      sleepMs: async () => {},
    });

    await client.getJson<{ a: number }>('/x');
    await client.getJson<{ a: number }>('/x');
    const third = await client.getJson<{ a: number }>('/x');

    expect(third.ok).toBe(false);
    expect(client.status().state).toBe('OPEN');

    const fourth = await client.getJson<{ a: number }>('/x');
    expect(fourth.ok).toBe(false);
    expect(fourth.ok ? null : fourth.error.kind).toBe('circuit_open');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('transitions OPEN -> HALF_OPEN after 30s, then CLOSED on success', async () => {
    let t = 1000;
    const nowMs = () => t;

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => errJson('boom', 503))
      .mockImplementationOnce(async () => errJson('boom', 503))
      .mockImplementationOnce(async () => errJson('boom', 503))
      .mockImplementationOnce(async () => okJson({ ok: true }, 200));

    const client = new BirdeyeClient({
      apiKey: 'x',
      baseUrl: 'https://public-api.birdeye.so',
      timeoutMs: 1_000,
      retry: { maxRetries: 0, baseDelayMs: 1_000, maxDelayMs: 4_000 },
      circuitBreaker: { failureThreshold: 3, failureWindowMs: 10_000, openStateDurationMs: 30_000 },
      fetch: fetchMock,
      nowMs,
      sleepMs: async () => {},
    });

    await client.getJson('/x');
    await client.getJson('/x');
    await client.getJson('/x');
    expect(client.status().state).toBe('OPEN');

    // Before open window elapses: should short-circuit
    t = 30_999;
    const shorted = await client.getJson('/x');
    expect(shorted.ok).toBe(false);
    expect(shorted.ok ? null : shorted.error.kind).toBe('circuit_open');

    // After 30s in OPEN: allow one probe
    t = 31_000;
    const probe = await client.getJson<{ ok: boolean }>('/x');
    expect(probe.ok).toBe(true);
    expect(client.status().state).toBe('CLOSED');
  });
});

describe('BirdeyeClient retry', () => {
  it('retries with exponential backoff 1s,2s,4s (max 3 retries)', async () => {
    const sleeps: number[] = [];
    const sleepMs = async (ms: number) => {
      sleeps.push(ms);
    };

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => errJson('boom', 503))
      .mockImplementationOnce(async () => errJson('boom', 503))
      .mockImplementationOnce(async () => errJson('boom', 503))
      .mockImplementationOnce(async () => okJson({ ok: true }, 200));

    const client = new BirdeyeClient({
      apiKey: 'x',
      baseUrl: 'https://public-api.birdeye.so',
      timeoutMs: 1_000,
      retry: { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 4000 },
      circuitBreaker: { failureThreshold: 99, failureWindowMs: 10_000, openStateDurationMs: 30_000 },
      fetch: fetchMock,
      nowMs: () => 1000,
      sleepMs,
    });

    const res = await client.getJson<{ ok: boolean }>('/x');
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(sleeps).toEqual([1000, 2000, 4000]);
  });
});

