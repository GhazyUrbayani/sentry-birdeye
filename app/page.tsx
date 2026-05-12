import { RadarFeed } from '@/components/RadarFeed/RadarFeed';
import { TokenCard } from '@/components/TokenCard/TokenCard';
import { convexQuery } from '@/lib/convex/client';
import type { TokenScanRecord } from '@/types';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawQuery = resolvedSearchParams?.q;
  const queryRaw =
    typeof rawQuery === 'string'
      ? rawQuery.trim()
      : Array.isArray(rawQuery)
        ? rawQuery[0]?.trim() ?? ''
        : '';
  const query = queryRaw.toLowerCase();

  let tokens: TokenScanRecord[] = [];
  let tokensError: string | null = null;

  try {
    tokens = await convexQuery<TokenScanRecord[]>('tokenScans:listLatest', { limit: 12 });
  } catch (error) {
    tokensError = errorMessage(error);
  }

  const filteredTokens = query
    ? tokens.filter((token) => {
        const symbol = token.symbol?.toLowerCase() ?? '';
        return symbol.includes(query) || token.address.toLowerCase().includes(query);
      })
    : tokens;

  const showLatest = tokens.length > 0 || Boolean(tokensError);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">SENTRY - PreTrade Intelligence</h1>
        <p className="max-w-2xl text-sm text-white/70">
          Latest scans stream in real time. Grades are computed via strategy-based scoring with circuit-breaker protected Birdeye calls.
        </p>
        <form method="get" className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex w-full max-w-md items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
            <span className="text-xs text-white/50">Search</span>
            <input
              name="q"
              defaultValue={queryRaw}
              placeholder="Symbol or address"
              aria-label="Search tokens"
              className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
          </div>
          {queryRaw ? (
            <a className="text-xs text-sky-300 hover:text-sky-200" href="/">
              Clear
            </a>
          ) : null}
        </form>
      </header>

      <div className={showLatest ? 'grid gap-10 lg:grid-cols-2' : 'grid gap-10'}>
        {showLatest ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Latest Scans</h2>
              <span className="text-xs text-white/50">{tokens.length}</span>
            </div>
            {tokensError ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                Failed to load tokens. ({tokensError})
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                No matches for "{queryRaw}".
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredTokens.map((t) => (
                  <TokenCard key={t.id} token={t} />
                ))}
              </div>
            )}
          </section>
        ) : null}

        <RadarFeed query={queryRaw} />
      </div>
    </main>
  );
}

