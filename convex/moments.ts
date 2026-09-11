import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCoupleMember, requireMyCouple, requireUser } from "./lib/auth";
import { moodValidator } from "./lib/validators";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    try {
      const { couple } = await requireMyCouple(ctx);
      const moments = await ctx.db
        .query("moments")
        .withIndex("by_couple_createdAt", (q) => q.eq("coupleId", couple._id))
        .order("desc")
        .take(50);

      return await Promise.all(
        moments.map(async (moment) => {
          const media = (
            await Promise.all(moment.mediaIds.map((id) => ctx.db.get(id)))
          ).filter(Boolean);
          const author = await ctx.db.get(moment.authorId);
          return {
            ...moment,
            media,
            authorName: author?.displayName ?? "Partner",
            coupleName: couple.name,
          };
        }),
      );
    } catch {
      return [];
    }
  },
});

export const listPublic = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const limit = Math.min(args.limit ?? 30, 50);
    const moments = await ctx.db
      .query("moments")
      .withIndex("by_visibility_publishedAt", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(limit);

    return await Promise.all(
      moments.map(async (moment) => {
        const couple = await ctx.db.get(moment.coupleId);
        const media = (
          await Promise.all(moment.mediaIds.map((id) => ctx.db.get(id)))
        ).filter(Boolean);
        return {
          _id: moment._id,
          caption: moment.caption,
          mood: moment.mood,
          publishedAt: moment.publishedAt,
          createdAt: moment.createdAt,
          coupleName: couple?.name ?? "A couple",
          coupleTheme: couple?.theme ?? "ocean",
          media: media.map((m) =>
            m
              ? {
                  _id: m._id,
                  secureUrl: m.secureUrl,
                  width: m.width,
                  height: m.height,
                }
              : null,
          ),
        };
      }),
    );
  },
});

export const create = mutation({
  args: {
    caption: v.optional(v.string()),
    mood: v.optional(moodValidator),
    mediaIds: v.array(v.id("mediaAssets")),
    visibility: v.union(v.literal("private"), v.literal("public")),
  },
  handler: async (ctx, args) => {
    const { user, couple } = await requireMyCouple(ctx);
    const caption = (args.caption ?? "").trim();
    if (!caption && args.mediaIds.length === 0) {
      throw new Error("Add a photo, video, or caption");
    }
    if (args.mediaIds.length > 6) {
      throw new Error("Too many media items");
    }

    for (const mediaId of args.mediaIds) {
      const media = await ctx.db.get(mediaId);
      if (!media || media.coupleId !== couple._id) {
        throw new Error("Invalid media");
      }
    }

    const now = Date.now();
    return await ctx.db.insert("moments", {
      coupleId: couple._id,
      authorId: user._id,
      caption,
      mood: args.mood,
      mediaIds: args.mediaIds,
      visibility: args.visibility,
      createdAt: now,
      publishedAt: args.visibility === "public" ? now : undefined,
    });
  },
});
export const setVisibility = mutation({
  args: {
    momentId: v.id("moments"),
    visibility: v.union(v.literal("private"), v.literal("public")),
  },
  handler: async (ctx, args) => {
    const moment = await ctx.db.get(args.momentId);
    if (!moment) throw new Error("Moment not found");
    await requireCoupleMember(ctx, moment.coupleId);

    await ctx.db.patch(moment._id, {
      visibility: args.visibility,
      publishedAt:
        args.visibility === "public"
          ? (moment.publishedAt ?? Date.now())
          : undefined,
    });
  },
});

export const remove = mutation({
  args: { momentId: v.id("moments") },
  handler: async (ctx, args) => {
    const moment = await ctx.db.get(args.momentId);
    if (!moment) throw new Error("Moment not found");
    const { user } = await requireCoupleMember(ctx, moment.coupleId);
    if (moment.authorId !== user._id) {
      throw new Error("Only the author can delete this moment");
    }
    await ctx.db.delete(moment._id);
  },
});
