'use client';

import { useState, useEffect } from 'react';
import type { TokenScanRecord } from '@/types';
import { GradeBadge } from '@/components/Gradebadge/GradeBadge';

function formatCurrency(val?: number | null) {
  if (val == null) return '-';
  if (val < 1) return `$${val.toFixed(2)}`;
  if (val < 1000) return `$${Math.round(val)}`;
  if (val < 1_000_000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${(val / 1_000_000).toFixed(1)}M`;
}

export function TokenCard({ token }: { token: TokenScanRecord & { id?: string } }) {
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isChartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isChartOpen]);

  const symbol = token.symbol ?? 'UNKNOWN';
  const avatar = symbol.slice(0, 2).toUpperCase();
  const scanned = new Date(token.scannedAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const isHolderMissing = token.flags?.includes('HOLDER_DATA_MISSING');
  const visibleFlags = token.flags?.filter(f => f !== 'HOLDER_DATA_MISSING') ?? [];

  return (
    <>
      <div className="flex w-full flex-col gap-3 rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-white/0 p-4 transition-colors hover:border-white/20">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-1 items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-sky-500/30 via-emerald-500/20 to-white/5 text-xs font-semibold text-white/80">
              {avatar}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{symbol}</div>
              <div className="truncate text-xs text-white/60">{token.address}</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <GradeBadge grade={token.grade} />
            <div className="text-xs font-semibold text-white/80">{token.score}/100</div>
          </div>
        </div>

        {/* AI Brief if available */}
        {token.aiBrief && (
          <div className="rounded-lg bg-sky-500/10 px-3 py-2 text-xs italic text-sky-200/80">
            ✨ {token.aiBrief}
          </div>
        )}

        {/* Flags Details (Warning Badges) */}
        <div className="flex flex-wrap gap-1.5">
          {visibleFlags.map((flag) => (
            <span key={flag} className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-medium text-rose-300">
              {flag.replace(/_/g, ' ')}
            </span>
          ))}
          {isHolderMissing && (
            <span className="flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
              <span className="animate-pulse">⏳</span> Analyzing Holders
            </span>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-black/20 p-2 text-xs text-white/70">
          <div className="min-w-0">
            <div className="text-white/40">Liq</div>
            <div className="truncate font-medium text-white/90">{formatCurrency(token.liquidity)}</div>
          </div>
          <div className="min-w-0">
            <div className="text-white/40">Vol 24h</div>
            <div className="truncate font-medium text-white/90">{formatCurrency(token.volume24h)}</div>
          </div>
          <div className="min-w-0 text-right">
            <div className="text-white/40">Time</div>
            <div className="truncate text-white/80">{scanned}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <a 
            href={`https://jup.ag/swap/SOL-${token.address}`} 
            target="_blank" 
            rel="noreferrer"
            className="flex-1 rounded-lg bg-emerald-500/10 py-1.5 text-center text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            Buy Token
          </a>
          <button 
            onClick={() => setIsChartOpen(true)}
            className="flex-1 rounded-lg bg-sky-500/10 py-1.5 text-center text-xs font-medium text-sky-400 hover:bg-sky-500/20 transition-colors cursor-pointer"
          >
            View Chart
          </button>
          <a 
            href={`https://solscan.io/token/${token.address}`} 
            target="_blank" 
            rel="noreferrer"
            className="flex-[0.5] rounded-lg bg-white/5 py-1.5 text-center text-xs font-medium text-white/70 hover:bg-white/10 transition-colors"
          >
            Scan
          </a>
        </div>
      </div>

      {/* Chart Modal (Inline Terminal Experience) */}
      {mounted && isChartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            onClick={() => setIsChartOpen(false)}
          />
          <div className="relative w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl border border-white/10 bg-[#0B0E14] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/30 to-emerald-500/20 border border-white/10 font-bold text-white/90">
                  {avatar}
                </div>
                <div>
                  <h3 className="font-semibold text-white/90 text-lg leading-tight flex items-center gap-2">
                    {symbol} 
                    <GradeBadge grade={token.grade} />
                  </h3>
                  <p className="text-xs text-white/50">{token.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a 
                  href={`https://jup.ag/swap/SOL-${token.address}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                >
                  Trade on Jupiter
                </a>
                <button 
                  onClick={() => setIsChartOpen(false)}
                  className="rounded-lg bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>
            
            {/* Modal Body: Chart Iframe */}
            <div className="flex-1 w-full bg-black/50">
              <iframe 
                src={`https://dexscreener.com/solana/${token.address}?embed=1&theme=dark`}
                className="w-full h-full border-none"
                allow="clipboard-write"
                title={`${symbol} Chart`}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
