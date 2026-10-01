import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireMyCouple } from "./lib/auth";
import { displayLabelFor, partnerUserId, schedulePush } from "./lib/notify";

/** Cap so one couple can't balloon their pack (and the chat) forever. */
const MAX_STICKERS_PER_COUPLE = 200;

export const list = query({
  args: {},
  handler: async (ctx) => {
    try {
      const { couple } = await requireMyCouple(ctx);
      const stickers = await ctx.db
        .query("stickers")
        .withIndex("by_couple_createdAt", (q) =>
          q.eq("coupleId", couple._id),
        )
        .order("desc")
        .take(200);

      const hydrated = await Promise.all(
        stickers.map(async (sticker) => {
          const media = await ctx.db.get(sticker.mediaId);
          if (!media || media.deleted) return null;
          return {
            _id: sticker._id,
            createdAt: sticker.createdAt,
            url: media.secureUrl,
            width: media.width,
            height: media.height,
          };
        }),
      );

      return hydrated.filter((s) => s !== null);
    } catch {
      return [];
    }
  },
});

/**
 * Save an already-uploaded, already-resized image into the couple's pack.
 * The client uploads to Cloudinary (signed) and confirms the media first.
 */
export const importSticker = mutation({
  args: {
    mediaId: v.id("mediaAssets"),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, couple } = await requireMyCouple(ctx);

    const media = await ctx.db.get(args.mediaId);
    if (!media || media.deleted) {
      throw new Error("Upload not found");
    }
    if (media.coupleId !== couple._id) {
      throw new Error("That upload doesn’t belong to your couple");
    }

    const existing = await ctx.db
      .query("stickers")
      .withIndex("by_couple_media", (q) =>
        q.eq("coupleId", couple._id).eq("mediaId", args.mediaId),
      )
      .unique();
    if (existing) return { stickerId: existing._id };

    const count = await ctx.db
      .query("stickers")
      .withIndex("by_couple_createdAt", (q) =>
        q.eq("coupleId", couple._id),
      )
      .collect();
    if (count.length >= MAX_STICKERS_PER_COUPLE) {
      throw new Error(
        `Your sticker pack is full (${MAX_STICKERS_PER_COUPLE}). Remove one first.`,
      );
    }

    const stickerId = await ctx.db.insert("stickers", {
      coupleId: couple._id,
      createdBy: user._id,
      mediaId: args.mediaId,
      label: args.label?.trim() || undefined,
      createdAt: Date.now(),
    });
    return { stickerId };
  },
});

export const remove = mutation({
  args: { stickerId: v.id("stickers") },
  handler: async (ctx, args) => {
    const { user, couple } = await requireMyCouple(ctx);
    const sticker = await ctx.db.get(args.stickerId);
    if (!sticker || sticker.coupleId !== couple._id) {
      throw new Error("Sticker not found");
    }
    if (sticker.createdBy !== user._id) {
      throw new Error("Only the person who added it can remove it");
    }
    await ctx.db.delete(sticker._id);
    return { ok: true as const };
  },
});

/** Send an existing pack sticker into the couple conversation. */
export const sendSticker = mutation({
  args: {
    conversationId: v.id("conversations"),
    stickerId: v.id("stickers"),
    replyToId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const { user, couple } = await requireMyCouple(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.coupleId !== couple._id) {
      throw new Error("Conversation not found");
    }

    const sticker = await ctx.db.get(args.stickerId);
    if (!sticker || sticker.coupleId !== couple._id) {
      throw new Error("Sticker not found");
    }

    if (args.replyToId) {
      const parent = await ctx.db.get(args.replyToId);
      if (!parent || parent.conversationId !== conversation._id) {
        throw new Error("Reply target not found");
      }
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: conversation._id,
      coupleId: conversation.coupleId,
      senderId: user._id,
      type: "sticker",
      mediaId: sticker.mediaId,
      replyToId: args.replyToId,
      createdAt: Date.now(),
    });

    const partnerId = await partnerUserId(ctx, conversation.coupleId, user._id);
    if (partnerId) {
      const fromName = await displayLabelFor(
        ctx,
        conversation.coupleId,
        user._id,
      );
      await schedulePush(ctx, partnerId, {
        title: fromName,
        body: "Sent a sticker",
        url: "/chat/thread",
        tag: `chat-${conversation._id}`,
      });
    }

    return messageId;
  },
});
