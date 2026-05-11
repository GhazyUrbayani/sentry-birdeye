import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  tokenScans: defineTable({
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
  })
    .index('byScannedAt', ['scannedAt'])
    .index('byId', ['id']),
  subscribers: defineTable({
    chatId: v.number(),
    username: v.union(v.string(), v.null()),
    filter: v.string(),
    active: v.boolean(),
    joinedAt: v.string(),
  }).index('byChatId', ['chatId']),
});
