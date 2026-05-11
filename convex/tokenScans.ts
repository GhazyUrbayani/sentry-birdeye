import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

const scanRecord = {
  id: v.string(),
  address: v.string(),
  symbol: v.union(v.string(), v.null()),
  score: v.number(),
  grade: v.string(),
  flags: v.array(v.string()),
  aiBrief: v.union(v.string(), v.null()),
  liquidity: v.union(v.number(), v.null()),
  volume24h: v.union(v.number(), v.null()),
  priceChange24h: v.union(v.number(), v.null()),
  top10HolderPct: v.union(v.number(), v.null()),
  mintAuthDisabled: v.union(v.boolean(), v.null()),
  freezeAuthDisabled: v.union(v.boolean(), v.null()),
  scannedAt: v.string(),
};

export const listLatest = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit, 1), 50);
    const rows = await ctx.db
      .query('tokenScans')
      .withIndex('byScannedAt', (q) => q)
      .order('desc')
      .take(limit);

    return rows.map(({ _id, _creationTime, ...rest }) => rest);
  },
});

export const insert = mutation({
  args: { record: v.object(scanRecord) },
  handler: async (ctx, args) => {
    await ctx.db.insert('tokenScans', args.record);
    return { id: args.record.id };
  },
});
