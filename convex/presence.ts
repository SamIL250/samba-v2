import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCoupleMember, requireMyCouple } from "./lib/auth";

export const heartbeat = mutation({
  args: {
    /** When set, marks you as typing in that conversation. Omit to only refresh online. */
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
      const patch: {
        lastSeenAt: number;
        typingInConversationId?: typeof args.typingInConversationId;
        typingUpdatedAt?: number;
      } = { lastSeenAt: now };
      // Only touch typing when explicitly typing — CoupleGate online pings
      // must not wipe an in-progress typing state.
      if (args.typingInConversationId) {
        patch.typingInConversationId = args.typingInConversationId;
        patch.typingUpdatedAt = now;
      }
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("presence", {
      coupleId: couple._id,
      userId: user._id,
      lastSeenAt: now,
      typingInConversationId: args.typingInConversationId,
      typingUpdatedAt: args.typingInConversationId ? now : undefined,
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
        typingUpdatedAt: undefined,
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
