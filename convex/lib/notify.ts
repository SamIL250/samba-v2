import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

const MOOD_LABELS: Record<string, string> = {
  happy: "Happy",
  chilling: "Chilling",
  sad: "Sad",
  sleeping: "Sleeping",
  working: "Working",
  sports: "Sports",
  intimate: "Intimate",
  missing: "Missing you",
  cooking: "Cooking",
  cleaning: "Cleaning",
  studying: "Studying",
  sick: "Sick",
};

export function moodLabel(mood: string): string {
  return MOOD_LABELS[mood] ?? mood;
}

export async function partnerUserId(
  ctx: MutationCtx,
  coupleId: Id<"couples">,
  me: Id<"users">,
): Promise<Id<"users"> | null> {
  const members = await ctx.db
    .query("memberships")
    .withIndex("by_couple", (q) => q.eq("coupleId", coupleId))
    .collect();
  const partner = members.find((m) => m.userId !== me);
  return partner?.userId ?? null;
}

export async function displayLabelFor(
  ctx: MutationCtx,
  coupleId: Id<"couples">,
  userId: Id<"users">,
): Promise<string> {
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_couple_user", (q) =>
      q.eq("coupleId", coupleId).eq("userId", userId),
    )
    .unique();
  if (membership?.partnerLabel) return membership.partnerLabel;
  const user = await ctx.db.get(userId);
  return user?.displayName ?? "Your person";
}

/** Fire-and-forget Web Push to a user (no-op if they have no subscriptions). */
export async function schedulePush(
  ctx: MutationCtx,
  userId: Id<"users">,
  payload: PushPayload,
) {
  await ctx.scheduler.runAfter(0, internal.pushActions.sendToUser, {
    userId,
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
    tag: payload.tag,
  });
}
