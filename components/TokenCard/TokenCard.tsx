import type { TokenScanRecord } from '@/types';
import { GradeBadge } from '@/components/Gradebadge/GradeBadge';

export function TokenCard({ token }: { token: Pick<TokenScanRecord, 'address' | 'symbol' | 'grade' | 'score' | 'flags' | 'scannedAt'> & { id?: string } }) {
  const symbol = token.symbol ?? 'UNKNOWN';
  const avatar = symbol.slice(0, 2).toUpperCase();
  const scanned = new Date(token.scannedAt).toLocaleString();

  return (
    <div className="min-h-[120px] w-full rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-white/0 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-sky-500/30 via-emerald-500/20 to-white/5 text-xs font-semibold text-white/80">
            {avatar}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{symbol}</div>
            <div className="truncate text-xs text-white/60">{token.address}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <GradeBadge grade={token.grade} />
          <div className="text-xs font-semibold text-white/80">{token.score}/100</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-white/70">
        <div className="truncate">
          <span className="text-white/50">Flags</span>
          <div className="truncate text-white/80">{token.flags.length ? token.flags.length : 0}</div>
        </div>
        <div className="truncate">
          <span className="text-white/50">Scanned</span>
          <div className="truncate text-white/80">{scanned}</div>
        </div>
        <div className="truncate">
          <span className="text-white/50">Link</span>
          <a className="truncate text-sky-300 hover:text-sky-200" href={`https://solscan.io/token/${token.address}`} target="_blank" rel="noreferrer">
            Solscan
          </a>
        </div>
      </div>
    </div>
  );
}

