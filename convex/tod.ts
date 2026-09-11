import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireMyCouple } from "./lib/auth";
import { todKindValidator } from "./lib/validators";
import { schedulePush } from "./lib/notify";

const OPEN_STATUSES = new Set([
  "awaiting_pick",
  "awaiting_prompt",
  "awaiting_answer",
]);

async function partnerOf(
  ctx: QueryCtx | MutationCtx,
  coupleId: Id<"couples">,
  userId: Id<"users">,
) {
  const members = await ctx.db
    .query("memberships")
    .withIndex("by_couple", (q) => q.eq("coupleId", coupleId))
    .collect();
  return members.find((m) => m.userId !== userId) ?? null;
}

async function nameFor(
  ctx: QueryCtx | MutationCtx,
  coupleId: Id<"couples">,
  userId: Id<"users">,
) {
  const user = await ctx.db.get(userId);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_couple_user", (q) =>
      q.eq("coupleId", coupleId).eq("userId", userId),
    )
    .unique();
  return membership?.partnerLabel ?? user?.displayName ?? "Your person";
}

function hasOpen(plays: { status: string }[]) {
  return plays.some((r) => OPEN_STATUSES.has(r.status));
}

/** Nudge partner to pick Truth or Dare */
export const nudge = mutation({
  args: {},
  handler: async (ctx) => {
    const { user, couple } = await requireMyCouple(ctx);
    if (couple.status !== "active") {
      throw new Error("Wait for your partner to join before playing");
    }

    const recent = await ctx.db
      .query("todPlays")
      .withIndex("by_couple_createdAt", (q) => q.eq("coupleId", couple._id))
      .order("desc")
      .take(5);
    if (hasOpen(recent)) {
      throw new Error("Finish the open Truth or Dare first");
    }

    const partner = await partnerOf(ctx, couple._id, user._id);
    if (!partner) throw new Error("Your person isn't here yet");

    const playId = await ctx.db.insert("todPlays", {
      coupleId: couple._id,
      fromUserId: user._id,
      toUserId: partner.userId,
      status: "awaiting_pick",
      createdAt: Date.now(),
    });

    const fromName = await nameFor(ctx, couple._id, user._id);
    await schedulePush(ctx, partner.userId, {
      title: "Truth or Dare",
      body: `${fromName} nudged you — pick Truth or Dare`,
      url: "/play/truth-or-dare",
      tag: `tod-${playId}`,
    });

    return playId;
  },
});

/** Partner picks Truth or Dare after a nudge */
export const pick = mutation({
  args: {
    playId: v.id("todPlays"),
    kind: todKindValidator,
  },
  handler: async (ctx, args) => {
    const { user, couple } = await requireMyCouple(ctx);
    const play = await ctx.db.get(args.playId);
    if (!play || play.coupleId !== couple._id) {
      throw new Error("Play not found");
    }
    if (play.toUserId !== user._id) {
      throw new Error("This nudge isn’t for you");
    }
    if (play.status !== "awaiting_pick") {
      throw new Error("Already picked");
    }

    await ctx.db.patch(play._id, {
      kind: args.kind,
      status: "awaiting_prompt",
    });

    const pickerName = await nameFor(ctx, couple._id, user._id);
    await schedulePush(ctx, play.fromUserId, {
      title: "Truth or Dare",
      body: `${pickerName} picked ${args.kind === "dare" ? "Dare" : "Truth"} — your turn to ask`,
      url: "/play/truth-or-dare",
      tag: `tod-${play._id}`,
    });

    return { ok: true };
  },
});

/** After they pick, you write the truth/dare */
export const writePrompt = mutation({
  args: {
    playId: v.id("todPlays"),
    promptText: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, couple } = await requireMyCouple(ctx);
    const play = await ctx.db.get(args.playId);
    if (!play || play.coupleId !== couple._id) {
      throw new Error("Play not found");
    }
    if (play.fromUserId !== user._id) {
      throw new Error("Only the person who nudged can ask");
    }
    if (play.status !== "awaiting_prompt" || !play.kind) {
      throw new Error("Wait for them to pick Truth or Dare first");
    }

    const text = args.promptText.trim();
    if (text.length < 3) throw new Error("Write a little more for them");
    if (text.length > 500) throw new Error("Keep it under 500 characters");

    await ctx.db.patch(play._id, {
      promptText: text,
      status: "awaiting_answer",
    });

    const askerName = await nameFor(ctx, couple._id, user._id);
    const kindLabel = play.kind === "dare" ? "Dare" : "Truth";
    await schedulePush(ctx, play.toUserId, {
      title: `${kindLabel} from ${askerName}`,
      body: text.length > 100 ? `${text.slice(0, 100)}…` : text,
      url: "/home",
      tag: `tod-${play._id}`,
    });

    return { ok: true };
  },
});

export const answer = mutation({
  args: {
    playId: v.id("todPlays"),
    outcome: v.union(v.literal("done"), v.literal("skipped")),
    answerText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, couple } = await requireMyCouple(ctx);
    const play = await ctx.db.get(args.playId);
    if (!play || play.coupleId !== couple._id) {
      throw new Error("Play not found");
    }
    if (play.toUserId !== user._id) {
      throw new Error("This one is for your person");
    }
    if (play.status !== "awaiting_answer") {
      throw new Error("Already finished");
    }

    const answerText = args.answerText?.trim();
    if (args.outcome === "done" && play.kind === "truth") {
      if (!answerText) throw new Error("Write your truth");
    }
    if (answerText && answerText.length > 2000) {
      throw new Error("Answer is too long");
    }

    await ctx.db.patch(play._id, {
      status: args.outcome === "done" ? "done" : "skipped",
      answerText: answerText || undefined,
      completedAt: Date.now(),
    });

    const answererName = await nameFor(ctx, couple._id, user._id);
    await schedulePush(ctx, play.fromUserId, {
      title: "Truth or Dare",
      body:
        args.outcome === "done"
          ? `${answererName} answered your ${play.kind === "dare" ? "dare" : "truth"}`
          : `${answererName} skipped this round`,
      url: "/play/truth-or-dare",
      tag: `tod-${play._id}`,
    });

    return { ok: true };
  },
});

/**
 * Live action for whoever needs to do something next —
 * pick, write prompt, or answer — on any page.
 */
export const livePending = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    try {
      const { user } = await requireMyCouple(ctx);

      const asTarget = await ctx.db
        .query("todPlays")
        .withIndex("by_to_user_createdAt", (q) => q.eq("toUserId", user._id))
        .order("desc")
        .take(5);

      const pickPlay = asTarget.find((r) => r.status === "awaiting_pick");
      if (pickPlay) {
        return {
          role: "pick" as const,
          _id: pickPlay._id,
          fromName: await nameFor(ctx, pickPlay.coupleId, pickPlay.fromUserId),
        };
      }

      const answerPlay = asTarget.find((r) => r.status === "awaiting_answer");
      if (answerPlay && answerPlay.kind && answerPlay.promptText) {
        return {
          role: "answer" as const,
          _id: answerPlay._id,
          kind: answerPlay.kind,
          promptText: answerPlay.promptText,
          fromName: await nameFor(
            ctx,
            answerPlay.coupleId,
            answerPlay.fromUserId,
          ),
        };
      }

      const asAsker = await ctx.db
        .query("todPlays")
        .withIndex("by_from_user_createdAt", (q) =>
          q.eq("fromUserId", user._id),
        )
        .order("desc")
        .take(5);

      const promptPlay = asAsker.find((r) => r.status === "awaiting_prompt");
      if (promptPlay && promptPlay.kind) {
        return {
          role: "write_prompt" as const,
          _id: promptPlay._id,
          kind: promptPlay.kind,
          toName: await nameFor(ctx, promptPlay.coupleId, promptPlay.toUserId),
        };
      }

      return null;
    } catch {
      return null;
    }
  },
});

export const history = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    try {
      const { user, couple } = await requireMyCouple(ctx);
      const limit = Math.min(args.limit ?? 40, 80);
      const plays = await ctx.db
        .query("todPlays")
        .withIndex("by_couple_createdAt", (q) => q.eq("coupleId", couple._id))
        .order("desc")
        .take(limit);

      const members = await ctx.db
        .query("memberships")
        .withIndex("by_couple", (q) => q.eq("coupleId", couple._id))
        .collect();
      const users = await Promise.all(
        members.map(async (m) => {
          const u = await ctx.db.get(m.userId);
          return {
            userId: m.userId,
            name: m.partnerLabel || u?.displayName || "Partner",
          };
        }),
      );
      const nameOf = (id: Id<"users">) =>
        users.find((u) => u.userId === id)?.name ?? "Partner";

      return plays.map((r) => ({
        ...r,
        fromName: nameOf(r.fromUserId),
        toName: nameOf(r.toUserId),
        iAsked: r.fromUserId === user._id,
        iAnswer: r.toUserId === user._id,
        isOpen: OPEN_STATUSES.has(r.status),
      }));
    } catch {
      return [];
    }
  },
});

export const shareToChat = mutation({
  args: { playId: v.id("todPlays") },
  handler: async (ctx, args) => {
    const { user, couple } = await requireMyCouple(ctx);
    const play = await ctx.db.get(args.playId);
    if (!play || play.coupleId !== couple._id) {
      throw new Error("Play not found");
    }
    if (play.status !== "done" && play.status !== "skipped") {
      throw new Error("Finish the round before sharing");
    }

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_couple", (q) => q.eq("coupleId", couple._id))
      .unique();
    if (!conversation) throw new Error("Missing conversation");

    const kind = play.kind === "dare" ? "Dare" : "Truth";
    const prompt = play.promptText ?? "…";
    let body: string;
    if (play.status === "skipped") {
      body = `Truth or Dare — passed on a ${kind.toLowerCase()}: “${prompt}”`;
    } else if (play.kind === "truth" && play.answerText) {
      body = `Truth: “${prompt}” → “${play.answerText}”`;
    } else {
      body = `Dare ✓ “${prompt}”`;
    }

    return await ctx.db.insert("messages", {
      conversationId: conversation._id,
      coupleId: couple._id,
      senderId: user._id,
      type: "game_share",
      body,
      todPlayId: play._id,
      createdAt: Date.now(),
    });
  },
});
