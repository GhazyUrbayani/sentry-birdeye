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

export function RadarFeed({ query = '' }: { query?: string }) {
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

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedQuery) return items;
    return items.filter((item) => {
      const symbol = item.symbol?.toLowerCase() ?? '';
      const address = item.address.toLowerCase();
      return symbol.includes(normalizedQuery) || address.includes(normalizedQuery);
    });
  }, [items, normalizedQuery]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Live Radar</h2>
        <span className={['text-xs flex items-center gap-1.5', connected ? 'text-emerald-300' : 'text-white/50'].join(' ')}>
          {connected && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>}
          {connected ? 'connected' : 'disconnected'}
        </span>
      </div>

      <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-2">
        {items.length === 0 ? (
          <div className="grid gap-3">
            <TokenCardSkeleton />
            <TokenCardSkeleton />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            No radar matches.
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((t) => (
              <TokenCard key={t.id} token={t} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

