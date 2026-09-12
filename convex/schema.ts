import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  chatBackgroundValidator,
  colorModeValidator,
  moodGenderValidator,
  moodValidator,
  partnerMoodValidator,
  softSignalKindValidator,
  themeValidator,
  todKindValidator,
  todRoundStatusValidator,
  wallCheerKindValidator,
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
    /** @deprecated prefer datingStartedAt — kept for older couples */
    anniversaryAt: v.optional(v.number()),
    /** When the couple started dating — drives Day N + annual anniversary */
    datingStartedAt: v.optional(v.number()),
    theme: themeValidator,
    /** Light / dark shell — optional for older couples (defaults to light). */
    colorMode: v.optional(colorModeValidator),
    chatBackground: v.optional(chatBackgroundValidator),
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
    birthDateAt: v.optional(v.number()),
    currentMood: v.optional(partnerMoodValidator),
    moodGender: v.optional(moodGenderValidator),
    moodUpdatedAt: v.optional(v.number()),
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
    /** Per-user last-read cursor (userId string → timestamp). */
    lastReadAtByUser: v.optional(v.record(v.string(), v.number())),
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
    replyToId: v.optional(v.id("messages")),
    /** Soft-delete for everyone (usually by the sender) */
    deletedForEveryoneAt: v.optional(v.number()),
    /** Per-user hide — “delete for me” */
    deletedForUserIds: v.optional(v.array(v.id("users"))),
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
    /** Freshness for typing indicator (independent of online heartbeat). */
    typingUpdatedAt: v.optional(v.number()),
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

  wallLikes: defineTable({
    momentId: v.id("moments"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_moment", ["momentId"])
    .index("by_moment_user", ["momentId", "userId"])
    .index("by_user", ["userId"]),

  wallComments: defineTable({
    momentId: v.id("moments"),
    userId: v.id("users"),
    body: v.string(),
    createdAt: v.number(),
  })
    .index("by_moment_createdAt", ["momentId", "createdAt"])
    .index("by_user", ["userId"]),

  wallBookmarks: defineTable({
    momentId: v.id("moments"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_moment", ["momentId"])
    .index("by_moment_user", ["momentId", "userId"])
    .index("by_user_createdAt", ["userId", "createdAt"]),

  wallCheers: defineTable({
    momentId: v.id("moments"),
    userId: v.id("users"),
    kind: wallCheerKindValidator,
    createdAt: v.number(),
  })
    .index("by_moment_kind", ["momentId", "kind"])
    .index("by_moment_user_kind", ["momentId", "userId", "kind"]),

  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),
});
