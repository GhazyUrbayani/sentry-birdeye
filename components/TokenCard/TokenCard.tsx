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

  return (
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
      {(token.flags?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {token.flags.map((flag) => (
            <span key={flag} className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-medium text-rose-300">
              {flag.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

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
          className="flex-1 rounded-lg bg-white/10 py-1.5 text-center text-xs font-medium text-white hover:bg-white/20 transition-colors"
        >
          Trade
        </a>
        <a 
          href={`https://birdeye.so/token/${token.address}?chain=solana`} 
          target="_blank" 
          rel="noreferrer"
          className="flex-1 rounded-lg bg-white/5 py-1.5 text-center text-xs font-medium text-white hover:bg-white/10 transition-colors"
        >
          Chart
        </a>
        <a 
          href={`https://solscan.io/token/${token.address}`} 
          target="_blank" 
          rel="noreferrer"
          className="flex-1 rounded-lg bg-white/5 py-1.5 text-center text-xs font-medium text-white/70 hover:bg-white/10 transition-colors"
        >
          Scan
        </a>
      </div>
    </div>
  );
}
