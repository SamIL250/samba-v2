import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCoupleMember, requireUser } from "./lib/auth";

export const canUpload = query({
  args: { coupleId: v.id("couples") },
  handler: async (ctx, args) => {
    try {
      await requireCoupleMember(ctx, args.coupleId);
      return true;
    } catch {
      return false;
    }
  },
});

export const confirm = mutation({
  args: {
    coupleId: v.id("couples"),
    cloudinaryPublicId: v.string(),
    resourceType: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    format: v.optional(v.string()),
    secureUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCoupleMember(ctx, args.coupleId);

    if (!args.cloudinaryPublicId.startsWith(`samba/couples/${args.coupleId}`)) {
      throw new Error("Invalid upload folder");
    }

    const existing = await ctx.db
      .query("mediaAssets")
      .withIndex("by_publicId", (q) =>
        q.eq("cloudinaryPublicId", args.cloudinaryPublicId),
      )
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("mediaAssets", {
      coupleId: args.coupleId,
      uploaderId: user._id,
      cloudinaryPublicId: args.cloudinaryPublicId,
      resourceType: args.resourceType,
      width: args.width,
      height: args.height,
      format: args.format,
      secureUrl: args.secureUrl,
      createdAt: Date.now(),
    });
  },
});

export const get = query({
  args: { mediaId: v.id("mediaAssets") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const media = await ctx.db.get(args.mediaId);
    if (!media || media.deleted) return null;
    try {
      await requireCoupleMember(ctx, media.coupleId);
      return media;
    } catch {
      // Public moments may reference media — allow if any public moment uses it
      const moments = await ctx.db
        .query("moments")
        .withIndex("by_couple_createdAt", (q) => q.eq("coupleId", media.coupleId))
        .take(50);
      const isPublic = moments.some(
        (m) =>
          m.visibility === "public" && m.mediaIds.includes(args.mediaId),
      );
      return isPublic ? media : null;
    }
  },
});
