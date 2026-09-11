import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";
import { wallCheerKindValidator } from "./lib/validators";

async function requirePublicMoment(
  ctx: QueryCtx | MutationCtx,
  momentId: Id<"moments">,
) {
  const moment = await ctx.db.get(momentId);
  if (!moment || moment.visibility !== "public") {
    throw new Error("Post not found");
  }
  return moment;
}

export const feed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const limit = Math.min(args.limit ?? 30, 50);
    const moments = await ctx.db
      .query("moments")
      .withIndex("by_visibility_publishedAt", (q) =>
        q.eq("visibility", "public"),
      )
      .order("desc")
      .take(limit);

    return await Promise.all(
      moments.map(async (moment) => {
        const couple = await ctx.db.get(moment.coupleId);
        const author = await ctx.db.get(moment.authorId);
        const media = (
          await Promise.all(moment.mediaIds.map((id) => ctx.db.get(id)))
        ).filter(Boolean);

        const likes = await ctx.db
          .query("wallLikes")
          .withIndex("by_moment", (q) => q.eq("momentId", moment._id))
          .collect();
        const comments = await ctx.db
          .query("wallComments")
          .withIndex("by_moment_createdAt", (q) =>
            q.eq("momentId", moment._id),
          )
          .order("asc")
          .take(40);
        const bookmark = await ctx.db
          .query("wallBookmarks")
          .withIndex("by_moment_user", (q) =>
            q.eq("momentId", moment._id).eq("userId", user._id),
          )
          .unique();
        const waves = await ctx.db
          .query("wallCheers")
          .withIndex("by_moment_kind", (q) =>
            q.eq("momentId", moment._id).eq("kind", "wave"),
          )
          .collect();
        const blooms = await ctx.db
          .query("wallCheers")
          .withIndex("by_moment_kind", (q) =>
            q.eq("momentId", moment._id).eq("kind", "bloom"),
          )
          .collect();

        const commentRows = await Promise.all(
          comments.map(async (c) => {
            const commenter = await ctx.db.get(c.userId);
            return {
              _id: c._id,
              body: c.body,
              createdAt: c.createdAt,
              authorName: commenter?.displayName ?? "Someone",
              mine: c.userId === user._id,
            };
          }),
        );

        return {
          _id: moment._id,
          caption: moment.caption,
          mood: moment.mood,
          publishedAt: moment.publishedAt,
          createdAt: moment.createdAt,
          coupleName: couple?.name ?? "A couple",
          coupleTheme: couple?.theme ?? "ocean",
          authorName: author?.displayName ?? "Partner",
          media: media.map((m) =>
            m
              ? {
                  _id: m._id,
                  secureUrl: m.secureUrl,
                  width: m.width,
                  height: m.height,
                  resourceType: m.resourceType,
                }
              : null,
          ),
          likeCount: likes.length,
          likedByMe: likes.some((l) => l.userId === user._id),
          bookmarkByMe: Boolean(bookmark),
          waveCount: waves.length,
          wavedByMe: waves.some((w) => w.userId === user._id),
          bloomCount: blooms.length,
          bloomedByMe: blooms.some((b) => b.userId === user._id),
          commentCount: commentRows.length,
          comments: commentRows,
        };
      }),
    );
  },
});

export const toggleLike = mutation({
  args: { momentId: v.id("moments") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requirePublicMoment(ctx, args.momentId);
    const existing = await ctx.db
      .query("wallLikes")
      .withIndex("by_moment_user", (q) =>
        q.eq("momentId", args.momentId).eq("userId", user._id),
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { liked: false };
    }
    await ctx.db.insert("wallLikes", {
      momentId: args.momentId,
      userId: user._id,
      createdAt: Date.now(),
    });
    return { liked: true };
  },
});

export const toggleBookmark = mutation({
  args: { momentId: v.id("moments") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requirePublicMoment(ctx, args.momentId);
    const existing = await ctx.db
      .query("wallBookmarks")
      .withIndex("by_moment_user", (q) =>
        q.eq("momentId", args.momentId).eq("userId", user._id),
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { bookmarked: false };
    }
    await ctx.db.insert("wallBookmarks", {
      momentId: args.momentId,
      userId: user._id,
      createdAt: Date.now(),
    });
    return { bookmarked: true };
  },
});

export const toggleCheer = mutation({
  args: {
    momentId: v.id("moments"),
    kind: wallCheerKindValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requirePublicMoment(ctx, args.momentId);
    const existing = await ctx.db
      .query("wallCheers")
      .withIndex("by_moment_user_kind", (q) =>
        q
          .eq("momentId", args.momentId)
          .eq("userId", user._id)
          .eq("kind", args.kind),
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { active: false };
    }
    await ctx.db.insert("wallCheers", {
      momentId: args.momentId,
      userId: user._id,
      kind: args.kind,
      createdAt: Date.now(),
    });
    return { active: true };
  },
});

export const addComment = mutation({
  args: {
    momentId: v.id("moments"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requirePublicMoment(ctx, args.momentId);
    const body = args.body.trim();
    if (!body) throw new Error("Write a little something first");
    if (body.length > 500) throw new Error("Comment is too long");
    return await ctx.db.insert("wallComments", {
      momentId: args.momentId,
      userId: user._id,
      body,
      createdAt: Date.now(),
    });
  },
});

export const removeComment = mutation({
  args: { commentId: v.id("wallComments") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.userId !== user._id) {
      throw new Error("Comment not found");
    }
    await ctx.db.delete(args.commentId);
    return { ok: true };
  },
});
