import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { requireCoupleMember, requireMyCouple } from "./lib/auth";
import {
  displayLabelFor,
  partnerUserId,
  schedulePush,
} from "./lib/notify";

type Ctx = QueryCtx | MutationCtx;

function previewSnippet(message: Doc<"messages">): string {
  if (message.deletedForEveryoneAt) return "Deleted message";
  if (message.type === "image") return "Photo";
  if (message.type === "audio") return "Voice note";
  if (message.type === "file") return "File";
  if (message.type === "game_share") return message.body ?? "Game share";
  return (message.body ?? "Message").slice(0, 120);
}

async function enrichSender(
  ctx: Ctx,
  message: Doc<"messages">,
) {
  if (!message.senderId) return null;
  const user = await ctx.db.get(message.senderId);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_couple_user", (q) =>
      q.eq("coupleId", message.coupleId).eq("userId", message.senderId!),
    )
    .unique();
  if (!user) return null;
  return {
    _id: user._id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    partnerLabel: membership?.partnerLabel,
    color: membership?.color,
  };
}

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
    const { user } = await requireCoupleMember(ctx, conversation.coupleId);

    const limit = Math.min(args.limit ?? 100, 200);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_createdAt", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .take(limit);

    const visible = messages
      .reverse()
      .filter(
        (message) =>
          !(message.deletedForUserIds ?? []).includes(user._id),
      );

    const enriched = await Promise.all(
      visible.map(async (message) => {
        const deletedForEveryone = Boolean(message.deletedForEveryoneAt);
        let media = null;
        if (!deletedForEveryone && message.mediaId) {
          media = await ctx.db.get(message.mediaId);
        }
        const sender = await enrichSender(ctx, message);

        let replyTo: {
          _id: Id<"messages">;
          preview: string;
          senderName: string;
          deleted: boolean;
        } | null = null;

        if (message.replyToId) {
          const parent = await ctx.db.get(message.replyToId);
          if (parent) {
            const parentHidden = (parent.deletedForUserIds ?? []).includes(
              user._id,
            );
            const parentSender = parent.senderId
              ? await ctx.db.get(parent.senderId)
              : null;
            const parentMembership = parent.senderId
              ? await ctx.db
                  .query("memberships")
                  .withIndex("by_couple_user", (q) =>
                    q
                      .eq("coupleId", parent.coupleId)
                      .eq("userId", parent.senderId!),
                  )
                  .unique()
              : null;
            replyTo = {
              _id: parent._id,
              preview: parentHidden
                ? "Message unavailable"
                : previewSnippet(parent),
              senderName:
                parentMembership?.partnerLabel ??
                parentSender?.displayName ??
                "Partner",
              deleted: Boolean(parent.deletedForEveryoneAt) || parentHidden,
            };
          }
        }

        return {
          ...message,
          body: deletedForEveryone ? undefined : message.body,
          mediaId: deletedForEveryone ? undefined : message.mediaId,
          media,
          sender,
          replyTo,
          deletedForEveryone,
          canDeleteForEveryone:
            !deletedForEveryone &&
            message.senderId === user._id &&
            message.type !== "system",
        };
      }),
    );

    return enriched;
  },
});

export const sendText = mutation({
  args: {
    conversationId: v.id("conversations"),
    body: v.string(),
    replyToId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const body = args.body.trim();
    if (!body) throw new Error("Message cannot be empty");
    if (body.length > 4000) throw new Error("Message is too long");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    const { user } = await requireCoupleMember(ctx, conversation.coupleId);

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
      type: "text",
      body,
      replyToId: args.replyToId,
      createdAt: Date.now(),
    });

    const partnerId = await partnerUserId(ctx, conversation.coupleId, user._id);
    if (partnerId) {
      const fromName = await displayLabelFor(ctx, conversation.coupleId, user._id);
      const preview = body.length > 80 ? `${body.slice(0, 80)}…` : body;
      await schedulePush(ctx, partnerId, {
        title: fromName,
        body: preview,
        url: "/chat/thread",
        tag: `chat-${conversation._id}`,
      });
    }

    return messageId;
  },
});

export const sendImage = mutation({
  args: {
    conversationId: v.id("conversations"),
    mediaId: v.id("mediaAssets"),
    caption: v.optional(v.string()),
    replyToId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    const { user } = await requireCoupleMember(ctx, conversation.coupleId);

    const media = await ctx.db.get(args.mediaId);
    if (!media || media.coupleId !== conversation.coupleId) {
      throw new Error("Invalid media");
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: conversation._id,
      coupleId: conversation.coupleId,
      senderId: user._id,
      type: "image",
      body: args.caption?.trim() || undefined,
      mediaId: media._id,
      replyToId: args.replyToId,
      createdAt: Date.now(),
    });

    const partnerId = await partnerUserId(ctx, conversation.coupleId, user._id);
    if (partnerId) {
      const fromName = await displayLabelFor(ctx, conversation.coupleId, user._id);
      await schedulePush(ctx, partnerId, {
        title: fromName,
        body: args.caption?.trim() || "Sent a photo",
        url: "/chat/thread",
        tag: `chat-${conversation._id}`,
      });
    }

    return messageId;
  },
});

export const sendMedia = mutation({
  args: {
    conversationId: v.id("conversations"),
    mediaId: v.id("mediaAssets"),
    kind: v.union(v.literal("image"), v.literal("audio"), v.literal("file")),
    caption: v.optional(v.string()),
    replyToId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    const { user } = await requireCoupleMember(ctx, conversation.coupleId);

    const media = await ctx.db.get(args.mediaId);
    if (!media || media.coupleId !== conversation.coupleId) {
      throw new Error("Invalid media");
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
      type: args.kind,
      body: args.caption?.trim() || undefined,
      mediaId: media._id,
      replyToId: args.replyToId,
      createdAt: Date.now(),
    });

    const partnerId = await partnerUserId(ctx, conversation.coupleId, user._id);
    if (partnerId) {
      const fromName = await displayLabelFor(ctx, conversation.coupleId, user._id);
      const kindLabel =
        args.kind === "image"
          ? "Sent a photo"
          : args.kind === "audio"
            ? "Sent a voice note"
            : "Sent a file";
      await schedulePush(ctx, partnerId, {
        title: fromName,
        body: args.caption?.trim() || kindLabel,
        url: "/chat/thread",
        tag: `chat-${conversation._id}`,
      });
    }

    return messageId;
  },
});

export const deleteForMe = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    const { user } = await requireCoupleMember(ctx, message.coupleId);

    if (message.type === "system") {
      throw new Error("System messages can’t be deleted");
    }

    const existing = message.deletedForUserIds ?? [];
    if (existing.includes(user._id)) return { ok: true };

    await ctx.db.patch(message._id, {
      deletedForUserIds: [...existing, user._id],
    });
    return { ok: true };
  },
});

export const deleteForEveryone = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    const { user } = await requireCoupleMember(ctx, message.coupleId);

    if (message.type === "system") {
      throw new Error("System messages can’t be deleted");
    }
    if (message.senderId !== user._id) {
      throw new Error("Only the sender can delete for everyone");
    }
    if (message.deletedForEveryoneAt) return { ok: true };

    await ctx.db.patch(message._id, {
      deletedForEveryoneAt: Date.now(),
      body: undefined,
      mediaId: undefined,
    });
    return { ok: true };
  },
});

/** Mark the couple DM as read up to now (clears unread badge). */
export const markRead = mutation({
  args: {
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const { user, couple } = await requireMyCouple(ctx);
    const conversation = args.conversationId
      ? await ctx.db.get(args.conversationId)
      : await ctx.db
          .query("conversations")
          .withIndex("by_couple", (q) => q.eq("coupleId", couple._id))
          .unique();
    if (!conversation || conversation.coupleId !== couple._id) {
      return { ok: false as const };
    }
    const prev = conversation.lastReadAtByUser ?? {};
    await ctx.db.patch(conversation._id, {
      lastReadAtByUser: {
        ...prev,
        [user._id]: Date.now(),
      },
    });
    return { ok: true as const };
  },
});

/** Unread partner messages in the couple DM (0 when caught up). */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { unread: 0 };

    try {
      const { user, couple } = await requireMyCouple(ctx);
      const conversation = await ctx.db
        .query("conversations")
        .withIndex("by_couple", (q) => q.eq("coupleId", couple._id))
        .unique();
      if (!conversation) return { unread: 0 };

      const lastRead =
        conversation.lastReadAtByUser?.[user._id] ?? conversation.createdAt;

      const recent = await ctx.db
        .query("messages")
        .withIndex("by_conversation_createdAt", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .order("desc")
        .take(80);

      let unread = 0;
      for (const message of recent) {
        if (message.createdAt <= lastRead) break;
        if (!message.senderId || message.senderId === user._id) continue;
        if (message.type === "system") continue;
        if (message.deletedForEveryoneAt) continue;
        if ((message.deletedForUserIds ?? []).includes(user._id)) continue;
        unread += 1;
      }
      return { unread };
    } catch {
      return { unread: 0 };
    }
  },
});
