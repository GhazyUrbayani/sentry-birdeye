'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const symbol = token.symbol ?? 'UNKNOWN';
  const avatar = symbol.slice(0, 2).toUpperCase();
  const scanned = new Date(token.scannedAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const visibleFlags = token.flags?.filter(f => f !== 'HOLDER_DATA_MISSING') ?? [];

  const cardBaseClasses = "flex w-full flex-col gap-3 rounded-xl border p-4 transition-all duration-500 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4";
  const safeGlowClasses = "border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:border-emerald-500/50";
  const defaultClasses = "border-white/10 bg-gradient-to-b from-white/5 to-white/0 hover:border-white/20";
  const cardClassName = `${cardBaseClasses} ${token.grade === 'SAFE' ? safeGlowClasses : defaultClasses}`;

  return (
    <>
      <div className={cardClassName}>
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

        {token.aiBrief && (
          <div className="relative overflow-hidden rounded-lg bg-sky-500/10 px-3 py-2 text-xs italic text-sky-200/90 border border-sky-500/20 shadow-inner group">
            <span className="flex gap-2">
              <span className="animate-pulse">✨</span> 
              <span className="tracking-wide">{token.aiBrief}</span>
            </span>
          </div>
        )}

        {/* Flags Details (Warning Badges) */}
        <div className="flex flex-wrap gap-1.5">
          {visibleFlags.map((flag) => (
            <span key={flag} className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-medium text-rose-300">
              {flag.replace(/_/g, ' ')}
            </span>
          ))}
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
            href={`https://jup.ag/swap?sell=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&buy=${token.address}`} 
            target="_blank" 
            rel="noreferrer"
            className="flex-1 rounded-lg bg-emerald-500/10 py-1.5 text-center text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            Buy Token
          </a>
          <a 
            href={`https://birdeye.so/token/${token.address}?chain=solana`}
            target="_blank" 
            rel="noreferrer"
            className="flex-1 rounded-lg bg-sky-500/10 py-1.5 text-center text-xs font-medium text-sky-400 hover:bg-sky-500/20 transition-colors"
          >
            View Chart
          </a>
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
    </>
  );
}
