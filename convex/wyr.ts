import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireMyCouple } from "./lib/auth";

const SEED_PROMPTS = [
  {
    optionA: "Sunrise hike together",
    optionB: "Midnight picnic on the floor",
    category: "adventure",
  },
  {
    optionA: "Cook a feast at home",
    optionB: "Dress up for a fancy night out",
    category: "date",
  },
  {
    optionA: "Road trip with no plan",
    optionB: "Cozy weekend never leaving bed",
    category: "weekend",
  },
  {
    optionA: "Write love notes for a week",
    optionB: "Surprise each other with gifts",
    category: "romance",
  },
  {
    optionA: "Dance in the kitchen",
    optionB: "Sing badly in the car",
    category: "silly",
  },
  {
    optionA: "Beach day, salty hair",
    optionB: "Mountain air and quiet views",
    category: "nature",
  },
  {
    optionA: "Always be the big spoon",
    optionB: "Always steal the blankets",
    category: "cozy",
  },
  {
    optionA: "Movie marathon with snacks",
    optionB: "Board games until midnight",
    category: "home",
  },
  {
    optionA: "Learn a new skill together",
    optionB: "Relive an old memory together",
    category: "growth",
  },
  {
    optionA: "Spontaneous yes to anything today",
    optionB: "A carefully planned perfect date",
    category: "style",
  },
  {
    optionA: "Share one secret wish",
    optionB: "Share one silly fear",
    category: "depth",
  },
  {
    optionA: "Breakfast in bed",
    optionB: "Dessert before dinner",
    category: "treats",
  },
];

export const seedPrompts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("wyrPrompts").take(1);
    if (existing.length > 0) return { seeded: false };
    for (const prompt of SEED_PROMPTS) {
      await ctx.db.insert("wyrPrompts", { ...prompt, active: true });
    }
    return { seeded: true, count: SEED_PROMPTS.length };
  },
});

export const seedPromptsPublic = mutation({
  args: {},
  handler: async (ctx) => {
    await requireMyCouple(ctx);
    const existing = await ctx.db.query("wyrPrompts").take(1);
    if (existing.length > 0) return { seeded: false, count: 0 };
    for (const prompt of SEED_PROMPTS) {
      await ctx.db.insert("wyrPrompts", { ...prompt, active: true });
    }
    return { seeded: true, count: SEED_PROMPTS.length };
  },
});

export const getActiveRound = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    try {
      const { user, couple } = await requireMyCouple(ctx);
      const rounds = await ctx.db
        .query("gameRounds")
        .withIndex("by_couple_createdAt", (q) => q.eq("coupleId", couple._id))
        .order("desc")
        .take(1);
      const round = rounds[0];
      if (!round) return null;

      const prompt = await ctx.db.get(round.promptId);
      const myAnswer = round.answers.find((a) => a.userId === user._id);
      const partnerAnswered = round.answers.some((a) => a.userId !== user._id);

      const safeAnswers =
        round.status === "revealed"
          ? round.answers
          : round.answers.filter((a) => a.userId === user._id);

      return {
        round: {
          ...round,
          answers: safeAnswers,
        },
        prompt,
        myAnswer: myAnswer?.choice ?? null,
        partnerAnswered,
        isMatch:
          round.status === "revealed" &&
          round.answers.length === 2 &&
          round.answers[0]!.choice === round.answers[1]!.choice,
      };
    } catch {
      return null;
    }
  },
});

export const startRound = mutation({
  args: {},
  handler: async (ctx) => {
    const { user, couple } = await requireMyCouple(ctx);
    if (couple.status !== "active") {
      throw new Error("Wait for your partner to join before playing");
    }

    const active = await ctx.db
      .query("gameRounds")
      .withIndex("by_couple_createdAt", (q) => q.eq("coupleId", couple._id))
      .order("desc")
      .take(1);
    if (active[0]?.status === "awaiting_answers") {
      throw new Error("Finish the current round first");
    }

    let prompts = await ctx.db
      .query("wyrPrompts")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    if (prompts.length === 0) {
      for (const prompt of SEED_PROMPTS) {
        await ctx.db.insert("wyrPrompts", { ...prompt, active: true });
      }
      prompts = await ctx.db
        .query("wyrPrompts")
        .withIndex("by_active", (q) => q.eq("active", true))
        .collect();
    }

    const prompt = prompts[Math.floor(Math.random() * prompts.length)]!;
    return await ctx.db.insert("gameRounds", {
      coupleId: couple._id,
      promptId: prompt._id,
      status: "awaiting_answers",
      answers: [],
      createdBy: user._id,
      createdAt: Date.now(),
    });
  },
});

export const answer = mutation({
  args: {
    roundId: v.id("gameRounds"),
    choice: v.union(v.literal("A"), v.literal("B")),
  },
  handler: async (ctx, args) => {
    const { user, couple } = await requireMyCouple(ctx);
    const round = await ctx.db.get(args.roundId);
    if (!round || round.coupleId !== couple._id) {
      throw new Error("Round not found");
    }
    if (round.status !== "awaiting_answers") {
      throw new Error("Round already revealed");
    }
    if (round.answers.some((a) => a.userId === user._id)) {
      throw new Error("You already answered");
    }

    const answers = [
      ...round.answers,
      { userId: user._id, choice: args.choice },
    ];
    const members = await ctx.db
      .query("memberships")
      .withIndex("by_couple", (q) => q.eq("coupleId", couple._id))
      .collect();

    const shouldReveal = answers.length >= Math.min(2, members.length);

    await ctx.db.patch(round._id, {
      answers,
      status: shouldReveal ? "revealed" : "awaiting_answers",
      revealedAt: shouldReveal ? Date.now() : undefined,
    });

    return { revealed: shouldReveal };
  },
});

export const shareToChat = mutation({
  args: { roundId: v.id("gameRounds") },
  handler: async (ctx, args) => {
    const { user, couple } = await requireMyCouple(ctx);
    const round = await ctx.db.get(args.roundId);
    if (!round || round.coupleId !== couple._id) {
      throw new Error("Round not found");
    }
    if (round.status !== "revealed") {
      throw new Error("Reveal answers before sharing");
    }

    const prompt = await ctx.db.get(round.promptId);
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_couple", (q) => q.eq("coupleId", couple._id))
      .unique();
    if (!conversation || !prompt) throw new Error("Missing conversation");

    const matched =
      round.answers.length === 2 &&
      round.answers[0]!.choice === round.answers[1]!.choice;

    const body = matched
      ? `Would You Rather match! We both picked ${
          round.answers[0]!.choice === "A" ? prompt.optionA : prompt.optionB
        }.`
      : `Would You Rather: one of us chose "${prompt.optionA}", the other "${prompt.optionB}". Different tastes, same us.`;

    return await ctx.db.insert("messages", {
      conversationId: conversation._id,
      coupleId: couple._id,
      senderId: user._id,
      type: "game_share",
      body,
      gameRoundId: round._id,
      createdAt: Date.now(),
    });
  },
});
