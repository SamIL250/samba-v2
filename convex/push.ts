import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";
import { schedulePush } from "./lib/notify";

export const status = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { subscribed: false, count: 0 };
    try {
      const user = await requireUser(ctx);
      const subs = await ctx.db
        .query("pushSubscriptions")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      return { subscribed: subs.length > 0, count: subs.length };
    } catch {
      return { subscribed: false, count: 0 };
    }
  },
});

/** Public VAPID key for browser subscribe — safe to expose. */
export const publicKey = query({
  args: {},
  handler: async () => {
    return process.env.VAPID_PUBLIC_KEY ?? null;
  },
});

export const saveSubscription = mutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: user._id,
        p256dh: args.p256dh,
        auth: args.auth,
        userAgent: args.userAgent,
        updatedAt: now,
      });
      return { ok: true as const, id: existing._id };
    }

    const id = await ctx.db.insert("pushSubscriptions", {
      userId: user._id,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      userAgent: args.userAgent,
      updatedAt: now,
    });
    return { ok: true as const, id };
  },
});

export const removeSubscription = mutation({
  args: {
    endpoint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.endpoint) {
      const existing = await ctx.db
        .query("pushSubscriptions")
        .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint!))
        .unique();
      if (existing && existing.userId === user._id) {
        await ctx.db.delete(existing._id);
      }
      return { ok: true as const };
    }

    const all = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    await Promise.all(all.map((s) => ctx.db.delete(s._id)));
    return { ok: true as const };
  },
});

export const listForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const deleteByEndpoint = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return { ok: true as const };
  },
});

/** Sends a system notification to the current user's devices (for debugging background push). */
export const sendTest = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    if (subs.length === 0) {
      throw new Error(
        "No push subscription on this account yet. Tap Turn on / Refresh first.",
      );
    }
    await schedulePush(ctx, user._id, {
      title: "SAMBA",
      body: "Test ping — leave the app, then check your notification shade.",
      url: "/couple",
      tag: `samba-test-${Date.now()}`,
    });
    return { ok: true as const, devices: subs.length };
  },
});
