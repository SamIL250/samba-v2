import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCoupleMember, requireMyCouple } from "./lib/auth";

export const getConversation = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    try {
      const { couple } = await requireMyCouple(ctx);
      return await ctx.db
        .query("conversations")
        .withIndex("by_couple", (q) => q.eq("coupleId", couple._id))
        .unique();
    } catch {
      return null;
    }
  },
});

export const listMessages = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return [];
    await requireCoupleMember(ctx, conversation.coupleId);

    const limit = Math.min(args.limit ?? 100, 200);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_createdAt", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .take(limit);

    const enriched = await Promise.all(
      messages.reverse().map(async (message) => {
        let media = null;
        if (message.mediaId) {
          media = await ctx.db.get(message.mediaId);
        }
        let sender = null;
        if (message.senderId) {
          const user = await ctx.db.get(message.senderId);
          const membership = await ctx.db
            .query("memberships")
            .withIndex("by_couple_user", (q) =>
              q
                .eq("coupleId", message.coupleId)
                .eq("userId", message.senderId!),
            )
            .unique();
          sender = user
            ? {
                _id: user._id,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                partnerLabel: membership?.partnerLabel,
                color: membership?.color,
              }
            : null;
        }
        return { ...message, media, sender };
      }),
    );

    return enriched;
  },
});

export const sendText = mutation({
  args: {
    conversationId: v.id("conversations"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const body = args.body.trim();
    if (!body) throw new Error("Message cannot be empty");
    if (body.length > 4000) throw new Error("Message is too long");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    const { user } = await requireCoupleMember(ctx, conversation.coupleId);

    return await ctx.db.insert("messages", {
      conversationId: conversation._id,
      coupleId: conversation.coupleId,
      senderId: user._id,
      type: "text",
      body,
      createdAt: Date.now(),
    });
  },
});

export const sendImage = mutation({
  args: {
    conversationId: v.id("conversations"),
    mediaId: v.id("mediaAssets"),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    const { user } = await requireCoupleMember(ctx, conversation.coupleId);

    const media = await ctx.db.get(args.mediaId);
    if (!media || media.coupleId !== conversation.coupleId) {
      throw new Error("Invalid media");
    }

    return await ctx.db.insert("messages", {
      conversationId: conversation._id,
      coupleId: conversation.coupleId,
      senderId: user._id,
      type: "image",
      body: args.caption?.trim() || undefined,
      mediaId: media._id,
      createdAt: Date.now(),
    });
  },
});

export const sendMedia = mutation({
  args: {
    conversationId: v.id("conversations"),
    mediaId: v.id("mediaAssets"),
    kind: v.union(v.literal("image"), v.literal("audio"), v.literal("file")),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    const { user } = await requireCoupleMember(ctx, conversation.coupleId);

    const media = await ctx.db.get(args.mediaId);
    if (!media || media.coupleId !== conversation.coupleId) {
      throw new Error("Invalid media");
    }

    return await ctx.db.insert("messages", {
      conversationId: conversation._id,
      coupleId: conversation.coupleId,
      senderId: user._id,
      type: args.kind,
      body: args.caption?.trim() || undefined,
      mediaId: media._id,
      createdAt: Date.now(),
    });
  },
});
