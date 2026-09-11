import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  moodValidator,
  softSignalKindValidator,
  themeValidator,
  todKindValidator,
  todRoundStatusValidator,
} from "./lib/validators";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_clerk", ["clerkId"]),

  couples: defineTable({
    name: v.string(),
    slug: v.string(),
    createdBy: v.id("users"),
    anniversaryAt: v.optional(v.number()),
    theme: themeValidator,
    status: v.union(v.literal("pending_partner"), v.literal("active")),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_createdBy", ["createdBy"]),

  memberships: defineTable({
    coupleId: v.id("couples"),
    userId: v.id("users"),
    role: v.union(v.literal("creator"), v.literal("partner")),
    partnerLabel: v.string(),
    color: v.string(),
    joinedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_couple", ["coupleId"])
    .index("by_couple_user", ["coupleId", "userId"]),

  inviteCodes: defineTable({
    coupleId: v.id("couples"),
    code: v.string(),
    createdBy: v.id("users"),
    expiresAt: v.number(),
    usedBy: v.optional(v.id("users")),
    status: v.union(
      v.literal("open"),
      v.literal("used"),
      v.literal("revoked"),
    ),
    createdAt: v.number(),
  }).index("by_code", ["code"]).index("by_couple", ["coupleId"]),

  conversations: defineTable({
    coupleId: v.id("couples"),
    type: v.literal("couple_dm"),
    createdAt: v.number(),
  }).index("by_couple", ["coupleId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    coupleId: v.id("couples"),
    senderId: v.optional(v.id("users")),
    type: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("audio"),
      v.literal("file"),
      v.literal("system"),
      v.literal("game_share"),
    ),
    body: v.optional(v.string()),
    mediaId: v.optional(v.id("mediaAssets")),
    gameRoundId: v.optional(v.id("gameRounds")),
    /** @deprecated legacy Truth-or-Dare share ref */
    todRoundId: v.optional(v.string()),
    todPlayId: v.optional(v.id("todPlays")),
    createdAt: v.number(),
  }).index("by_conversation_createdAt", ["conversationId", "createdAt"]),

  mediaAssets: defineTable({
    coupleId: v.id("couples"),
    uploaderId: v.id("users"),
    cloudinaryPublicId: v.string(),
    resourceType: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    format: v.optional(v.string()),
    secureUrl: v.string(),
    createdAt: v.number(),
    deleted: v.optional(v.boolean()),
  })
    .index("by_couple", ["coupleId"])
    .index("by_publicId", ["cloudinaryPublicId"]),

  moments: defineTable({
    coupleId: v.id("couples"),
    authorId: v.id("users"),
    caption: v.string(),
    mood: v.optional(moodValidator),
    mediaIds: v.array(v.id("mediaAssets")),
    visibility: v.union(v.literal("private"), v.literal("public")),
    createdAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index("by_couple_createdAt", ["coupleId", "createdAt"])
    .index("by_visibility_publishedAt", ["visibility", "publishedAt"]),

  wyrPrompts: defineTable({
    optionA: v.string(),
    optionB: v.string(),
    category: v.string(),
    active: v.boolean(),
  }).index("by_active", ["active"]),

  gameRounds: defineTable({
    coupleId: v.id("couples"),
    promptId: v.id("wyrPrompts"),
    status: v.union(v.literal("awaiting_answers"), v.literal("revealed")),
    answers: v.array(
      v.object({
        userId: v.id("users"),
        choice: v.union(v.literal("A"), v.literal("B")),
      }),
    ),
    createdBy: v.id("users"),
    createdAt: v.number(),
    revealedAt: v.optional(v.number()),
  }).index("by_couple_createdAt", ["coupleId", "createdAt"]),

  todPlays: defineTable({
    coupleId: v.id("couples"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    kind: v.optional(todKindValidator),
    promptText: v.optional(v.string()),
    answerText: v.optional(v.string()),
    status: todRoundStatusValidator,
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_couple_createdAt", ["coupleId", "createdAt"])
    .index("by_to_user_createdAt", ["toUserId", "createdAt"])
    .index("by_from_user_createdAt", ["fromUserId", "createdAt"]),

  presence: defineTable({
    coupleId: v.id("couples"),
    userId: v.id("users"),
    lastSeenAt: v.number(),
    typingInConversationId: v.optional(v.id("conversations")),
  })
    .index("by_couple", ["coupleId"])
    .index("by_couple_user", ["coupleId", "userId"]),

  /** Soft taps one partner sends the other — hugs, miss-yous, etc. */
  softSignals: defineTable({
    coupleId: v.id("couples"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    kind: softSignalKindValidator,
    createdAt: v.number(),
    seenAt: v.optional(v.number()),
    /** Set when the live overlay animation has been shown to the recipient */
    presentedAt: v.optional(v.number()),
  })
    .index("by_to_user_createdAt", ["toUserId", "createdAt"])
    .index("by_couple_createdAt", ["coupleId", "createdAt"])
    .index("by_from_kind_createdAt", ["fromUserId", "kind", "createdAt"]),
});
