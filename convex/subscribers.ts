import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const upsert = mutation({
  args: {
    chatId: v.number(),
    username: v.union(v.string(), v.null()),
    filter: v.string(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('subscribers')
      .withIndex('byChatId', (q) => q.eq('chatId', args.chatId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        username: args.username,
        filter: args.filter,
        active: args.active,
      });
      return { id: existing._id };
    }

    const id = await ctx.db.insert('subscribers', {
      chatId: args.chatId,
      username: args.username,
      filter: args.filter,
      active: args.active,
      joinedAt: new Date().toISOString(),
    });

    return { id };
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('subscribers')
      .filter((q) => q.eq(q.field('active'), true))
      .collect();
  },
});
