import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCoupleMember, requireMyCouple } from "./lib/auth";

export const heartbeat = mutation({
  args: {
    typingInConversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const { user, couple } = await requireMyCouple(ctx);
    if (args.typingInConversationId) {
      const conversation = await ctx.db.get(args.typingInConversationId);
      if (!conversation || conversation.coupleId !== couple._id) {
        throw new Error("Invalid conversation");
      }
    }

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_couple_user", (q) =>
        q.eq("coupleId", couple._id).eq("userId", user._id),
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeenAt: now,
        typingInConversationId: args.typingInConversationId,
      });
      return existing._id;
    }

    return await ctx.db.insert("presence", {
      coupleId: couple._id,
      userId: user._id,
      lastSeenAt: now,
      typingInConversationId: args.typingInConversationId,
    });
  },
});

export const clearTyping = mutation({
  args: {},
  handler: async (ctx) => {
    const { user, couple } = await requireMyCouple(ctx);
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_couple_user", (q) =>
        q.eq("coupleId", couple._id).eq("userId", user._id),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        typingInConversationId: undefined,
        lastSeenAt: Date.now(),
      });
    }
  },
});

export const forCouple = query({
  args: { coupleId: v.id("couples") },
  handler: async (ctx, args) => {
    await requireCoupleMember(ctx, args.coupleId);
    return await ctx.db
      .query("presence")
      .withIndex("by_couple", (q) => q.eq("coupleId", args.coupleId))
      .collect();
  },
});
