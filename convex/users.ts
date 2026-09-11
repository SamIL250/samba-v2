import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireIdentity, requireUser, getMembershipForUser } from "./lib/auth";

export const ensure = mutation({
  args: {
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    const displayName =
      args.displayName?.trim() ||
      identity.name ||
      identity.nickname ||
      identity.email?.split("@")[0] ||
      "Partner";

    const avatarUrl = args.avatarUrl ?? identity.pictureUrl ?? undefined;

    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName,
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      displayName,
      avatarUrl,
      createdAt: Date.now(),
    });
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;
    const membership = await getMembershipForUser(ctx, user._id);
    let couple = null;
    if (membership) {
      couple = await ctx.db.get(membership.coupleId);
    }
    return { user, membership, couple };
  },
});

export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db.get(args.userId);
  },
});
