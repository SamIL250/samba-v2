import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }
  return identity;
}

export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) {
    throw new Error("User not found. Call users.ensure first.");
  }
  return user;
}

export async function getMembershipForUser(
  ctx: Ctx,
  userId: Id<"users">,
): Promise<Doc<"memberships"> | null> {
  return await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
}

export async function requireCoupleMember(
  ctx: Ctx,
  coupleId: Id<"couples">,
): Promise<{
  user: Doc<"users">;
  membership: Doc<"memberships">;
  couple: Doc<"couples">;
}> {
  const user = await requireUser(ctx);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_couple_user", (q) =>
      q.eq("coupleId", coupleId).eq("userId", user._id),
    )
    .unique();
  if (!membership) {
    throw new Error("Not a member of this couple");
  }
  const couple = await ctx.db.get(coupleId);
  if (!couple) {
    throw new Error("Couple not found");
  }
  return { user, membership, couple };
}

export async function requireMyCouple(ctx: Ctx): Promise<{
  user: Doc<"users">;
  membership: Doc<"memberships">;
  couple: Doc<"couples">;
}> {
  const user = await requireUser(ctx);
  const membership = await getMembershipForUser(ctx, user._id);
  if (!membership) {
    throw new Error("No couple yet");
  }
  const couple = await ctx.db.get(membership.coupleId);
  if (!couple) {
    throw new Error("Couple not found");
  }
  return { user, membership, couple };
}
