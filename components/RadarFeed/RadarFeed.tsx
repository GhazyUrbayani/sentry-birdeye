'use client';

import { useEffect, useMemo, useState } from 'react';
import type { TokenScanRecord } from '@/types';
import { TokenCard } from '@/components/TokenCard/TokenCard';
import { TokenCardSkeleton } from '@/components/TokenCard/TokenCardSkeleton';

type StreamEvent =
  | { type: 'token'; record: TokenScanRecord }
  | { type: 'heartbeat' }
  | { type: 'error'; message: string };

function parseEvent(data: string): StreamEvent | null {
  try {
    const json = JSON.parse(data) as unknown;
    if (!json || typeof json !== 'object') return null;
    return json as StreamEvent;
  } catch {
    return null;
  }
}

export function RadarFeed() {
  const [items, setItems] = useState<TokenScanRecord[]>([]);
  const [connected, setConnected] = useState(false);

  const streamUrl = useMemo(() => '/api/tokens?stream=1', []);

  useEffect(() => {
    const es = new EventSource(streamUrl);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (evt) => {
      const ev = parseEvent(evt.data);
      if (!ev) return;
      if (ev.type === 'token') {
        setItems((prev) => [ev.record, ...prev].slice(0, 30));
      }
    };
    return () => es.close();
  }, [streamUrl]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Live Radar</h2>
        <span className={['text-xs', connected ? 'text-emerald-300' : 'text-white/50'].join(' ')}>
          {connected ? 'connected' : 'disconnected'}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="grid gap-3">
          <TokenCardSkeleton />
          <TokenCardSkeleton />
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((t) => (
            <TokenCard key={t.id} token={t} />
          ))}
        </div>
      )}
    </section>
  );
}

