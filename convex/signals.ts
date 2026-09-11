import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireMyCouple } from "./lib/auth";
import { softSignalKindValidator } from "./lib/validators";

/** Only surface live overlays for signals this fresh */
const LIVE_WINDOW_MS = 10 * 60_000;

const KIND_LABELS = {
  hug: "a hug",
  miss_you: "a miss-you",
  thinking: "a thinking-of-you",
  kiss: "a kiss",
  proud: "a proud-of-you",
} as const;

export const inbox = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    try {
      const { user, couple, membership } = await requireMyCouple(ctx);
      const members = await ctx.db
        .query("memberships")
        .withIndex("by_couple", (q) => q.eq("coupleId", couple._id))
        .collect();
      const partnerMembership = members.find((m) => m.userId !== user._id);
      const partnerUser = partnerMembership
        ? await ctx.db.get(partnerMembership.userId)
        : null;

      const received = await ctx.db
        .query("softSignals")
        .withIndex("by_to_user_createdAt", (q) => q.eq("toUserId", user._id))
        .order("desc")
        .take(20);

      const unreadCount = received.filter((s) => s.seenAt === undefined).length;

      const conversation = await ctx.db
        .query("conversations")
        .withIndex("by_couple", (q) => q.eq("coupleId", couple._id))
        .unique();

      let lastMessage: {
        body: string;
        createdAt: number;
        type: string;
        mine: boolean;
      } | null = null;

      if (conversation) {
        const latest = await ctx.db
          .query("messages")
          .withIndex("by_conversation_createdAt", (q) =>
            q.eq("conversationId", conversation._id),
          )
          .order("desc")
          .first();
        if (latest) {
          const previewBody =
            latest.type === "image"
              ? "Sent a photo"
              : latest.type === "audio"
                ? "Sent a voice note"
                : latest.type === "file"
                  ? "Sent a file"
                  : latest.type === "game_share"
                    ? "Shared a game"
                    : (latest.body ?? "New message");
          lastMessage = {
            body: previewBody,
            createdAt: latest.createdAt,
            type: latest.type,
            mine: latest.senderId === user._id,
          };
        }
      }

      return {
        couple,
        membership,
        partner: partnerUser
          ? {
              _id: partnerUser._id,
              displayName: partnerUser.displayName,
              avatarUrl: partnerUser.avatarUrl,
              partnerLabel:
                partnerMembership?.partnerLabel ?? partnerUser.displayName,
              color: partnerMembership?.color ?? "var(--samba-accent)",
            }
          : null,
        conversationId: conversation?._id ?? null,
        lastMessage,
        unreadCount,
        received: received.map((s) => ({
          ...s,
          label: KIND_LABELS[s.kind],
        })),
      };
    } catch {
      return null;
    }
  },
});

/** Newest unpresented signal for a live overlay on any app page */
export const livePending = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    try {
      const { user } = await requireMyCouple(ctx);
      const recent = await ctx.db
        .query("softSignals")
        .withIndex("by_to_user_createdAt", (q) => q.eq("toUserId", user._id))
        .order("desc")
        .take(8);

      const now = Date.now();
      const pending = recent.find(
        (s) =>
          s.presentedAt === undefined && now - s.createdAt < LIVE_WINDOW_MS,
      );
      if (!pending) return null;

      const fromUser = await ctx.db.get(pending.fromUserId);
      const membership = await ctx.db
        .query("memberships")
        .withIndex("by_couple_user", (q) =>
          q.eq("coupleId", pending.coupleId).eq("userId", pending.fromUserId),
        )
        .unique();

      return {
        ...pending,
        label: KIND_LABELS[pending.kind],
        fromName:
          membership?.partnerLabel ?? fromUser?.displayName ?? "Your person",
      };
    } catch {
      return null;
    }
  },
});

export const send = mutation({
  args: {
    kind: softSignalKindValidator,
  },
  handler: async (ctx, args) => {
    const { user, couple } = await requireMyCouple(ctx);
    if (couple.status !== "active") {
      throw new Error("Invite your person first — signals need both of you.");
    }

    const members = await ctx.db
      .query("memberships")
      .withIndex("by_couple", (q) => q.eq("coupleId", couple._id))
      .collect();
    const partner = members.find((m) => m.userId !== user._id);
    if (!partner) {
      throw new Error("Your person isn't here yet.");
    }

    return await ctx.db.insert("softSignals", {
      coupleId: couple._id,
      fromUserId: user._id,
      toUserId: partner.userId,
      kind: args.kind,
      createdAt: Date.now(),
    });
  },
});

export const markPresented = mutation({
  args: {
    signalId: v.id("softSignals"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMyCouple(ctx);
    const signal = await ctx.db.get(args.signalId);
    if (!signal || signal.toUserId !== user._id) {
      throw new Error("Signal not found");
    }
    if (signal.presentedAt !== undefined) return { ok: true };
    await ctx.db.patch(args.signalId, { presentedAt: Date.now() });
    return { ok: true };
  },
});

export const markSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireMyCouple(ctx);
    const unread = await ctx.db
      .query("softSignals")
      .withIndex("by_to_user_createdAt", (q) => q.eq("toUserId", user._id))
      .order("desc")
      .take(40);

    const now = Date.now();
    let marked = 0;
    for (const signal of unread) {
      if (signal.seenAt === undefined) {
        await ctx.db.patch(signal._id, { seenAt: now });
        marked += 1;
      }
    }
    return { marked };
  },
});

export const remove = mutation({
  args: {
    signalId: v.id("softSignals"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMyCouple(ctx);
    const signal = await ctx.db.get(args.signalId);
    if (!signal || signal.toUserId !== user._id) {
      throw new Error("Signal not found");
    }
    await ctx.db.delete(args.signalId);
    return { ok: true };
  },
});
