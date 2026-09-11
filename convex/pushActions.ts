"use node";

import webpush from "web-push";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

function vapidConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

export const sendToUser = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    url: v.string(),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!vapidConfigured()) {
      console.warn(
        "Push skipped: set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT on Convex",
      );
      return { sent: 0, skipped: true as const };
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );

    const subscriptions = await ctx.runQuery(internal.push.listForUser, {
      userId: args.userId,
    });
    if (subscriptions.length === 0) {
      return { sent: 0, skipped: false as const };
    }

    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      url: args.url,
      tag: args.tag ?? "samba",
    });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload,
          { TTL: 60 * 60 * 12 },
        );
        sent += 1;
      } catch (err) {
        const status =
          err && typeof err === "object" && "statusCode" in err
            ? Number((err as { statusCode?: number }).statusCode)
            : 0;
        // Gone / expired subscription
        if (status === 404 || status === 410) {
          await ctx.runMutation(internal.push.deleteByEndpoint, {
            endpoint: sub.endpoint,
          });
        } else {
          console.error("Push failed", status || err);
        }
      }
    }

    return { sent, skipped: false as const };
  },
});
