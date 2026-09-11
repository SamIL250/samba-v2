"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { createHash } from "crypto";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

export const createUploadSignature = action({
  args: {
    coupleId: v.id("couples"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const allowed = await ctx.runQuery(api.media.canUpload, {
      coupleId: args.coupleId,
    });
    if (!allowed) throw new Error("Not allowed to upload");

    const cloudName = requireEnv("CLOUDINARY_CLOUD_NAME");
    const apiKey = requireEnv("CLOUDINARY_API_KEY");
    const apiSecret = requireEnv("CLOUDINARY_API_SECRET");

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `samba/couples/${args.coupleId}`;
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash("sha1").update(paramsToSign).digest("hex");

    return {
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
    };
  },
});
