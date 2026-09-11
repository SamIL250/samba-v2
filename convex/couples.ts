import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  getMembershipForUser,
  requireMyCouple,
  requireUser,
} from "./lib/auth";
import { generateInviteCode, PARTNER_COLORS, slugify } from "./lib/codes";
import { chatBackgroundValidator, themeValidator } from "./lib/validators";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const create = mutation({
  args: {
    name: v.string(),
    partnerLabel: v.string(),
    theme: themeValidator,
    anniversaryAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await getMembershipForUser(ctx, user._id);
    if (existing) {
      throw new Error("You already belong to a couple");
    }

    const name = args.name.trim();
    if (name.length < 2) throw new Error("Couple name is too short");

    const now = Date.now();
    const coupleId = await ctx.db.insert("couples", {
      name,
      slug: slugify(name),
      createdBy: user._id,
      anniversaryAt: args.anniversaryAt,
      theme: args.theme,
      status: "pending_partner",
      createdAt: now,
    });

    await ctx.db.insert("memberships", {
      coupleId,
      userId: user._id,
      role: "creator",
      partnerLabel: args.partnerLabel.trim() || user.displayName,
      color: PARTNER_COLORS[0],
      joinedAt: now,
    });

    const conversationId = await ctx.db.insert("conversations", {
      coupleId,
      type: "couple_dm",
      createdAt: now,
    });

    await ctx.db.insert("messages", {
      conversationId,
      coupleId,
      type: "system",
      body: `${args.partnerLabel.trim() || user.displayName} started your couple space. Invite your person!`,
      createdAt: now,
    });

    const code = generateInviteCode(8);
    await ctx.db.insert("inviteCodes", {
      coupleId,
      code,
      createdBy: user._id,
      expiresAt: now + INVITE_TTL_MS,
      status: "open",
      createdAt: now,
    });

    return { coupleId, inviteCode: code };
  },
});

export const regenerateInvite = mutation({
  args: {},
  handler: async (ctx) => {
    const { user, membership, couple } = await requireMyCouple(ctx);
    if (couple.status === "active") {
      throw new Error("Your couple is already complete");
    }
    if (membership.role !== "creator") {
      throw new Error("Only the creator can regenerate invites");
    }

    const openInvites = await ctx.db
      .query("inviteCodes")
      .withIndex("by_couple", (q) => q.eq("coupleId", couple._id))
      .collect();
    for (const invite of openInvites) {
      if (invite.status === "open") {
        await ctx.db.patch(invite._id, { status: "revoked" });
      }
    }

    const now = Date.now();
    const code = generateInviteCode(8);
    await ctx.db.insert("inviteCodes", {
      coupleId: couple._id,
      code,
      createdBy: user._id,
      expiresAt: now + INVITE_TTL_MS,
      status: "open",
      createdAt: now,
    });
    return { inviteCode: code };
  },
});

export const joinWithCode = mutation({
  args: {
    code: v.string(),
    partnerLabel: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await getMembershipForUser(ctx, user._id);
    if (existing) {
      throw new Error("You already belong to a couple");
    }

    const normalized = args.code.trim().toUpperCase();
    const invite = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q) => q.eq("code", normalized))
      .unique();

    if (!invite || invite.status !== "open") {
      throw new Error("Invite code is invalid or already used");
    }
    if (invite.expiresAt < Date.now()) {
      await ctx.db.patch(invite._id, { status: "revoked" });
      throw new Error("Invite code has expired");
    }
    if (invite.createdBy === user._id) {
      throw new Error("You cannot join your own invite");
    }

    const couple = await ctx.db.get(invite.coupleId);
    if (!couple) throw new Error("Couple not found");

    const members = await ctx.db
      .query("memberships")
      .withIndex("by_couple", (q) => q.eq("coupleId", couple._id))
      .collect();
    if (members.length !== 1) {
      throw new Error("This couple is already full");
    }

    const now = Date.now();
    const label = args.partnerLabel.trim() || user.displayName;

    await ctx.db.insert("memberships", {
      coupleId: couple._id,
      userId: user._id,
      role: "partner",
      partnerLabel: label,
      color: PARTNER_COLORS[1],
      joinedAt: now,
    });

    await ctx.db.patch(invite._id, {
      status: "used",
      usedBy: user._id,
    });
    await ctx.db.patch(couple._id, { status: "active" });

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_couple", (q) => q.eq("coupleId", couple._id))
      .unique();

    if (conversation) {
      await ctx.db.insert("messages", {
        conversationId: conversation._id,
        coupleId: couple._id,
        type: "system",
        body: `${label} joined the couple. You're both here now.`,
        createdAt: now,
      });
    }

    return { coupleId: couple._id };
  },
});

export const getInvitePreview = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.code.trim().toUpperCase();
    const invite = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q) => q.eq("code", normalized))
      .unique();
    if (!invite || invite.status !== "open" || invite.expiresAt < Date.now()) {
      return null;
    }
    const couple = await ctx.db.get(invite.coupleId);
    if (!couple) return null;
    const creator = await ctx.db.get(couple.createdBy);
    return {
      coupleName: couple.name,
      theme: couple.theme,
      creatorName: creator?.displayName ?? "Your person",
      expiresAt: invite.expiresAt,
    };
  },
});

export const myCouple = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const membership = await getMembershipForUser(ctx, user._id);
    if (!membership) return null;

    const couple = await ctx.db.get(membership.coupleId);
    if (!couple) return null;

    const members = await ctx.db
      .query("memberships")
      .withIndex("by_couple", (q) => q.eq("coupleId", couple._id))
      .collect();

    const memberUsers = await Promise.all(
      members.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return {
          membership: m,
          user: u
            ? {
                _id: u._id,
                displayName: u.displayName,
                avatarUrl: u.avatarUrl,
              }
            : null,
        };
      }),
    );

    let openInvite: string | null = null;
    if (couple.status === "pending_partner") {
      const invites = await ctx.db
        .query("inviteCodes")
        .withIndex("by_couple", (q) => q.eq("coupleId", couple._id))
        .collect();
      const open = invites.find(
        (i) => i.status === "open" && i.expiresAt > Date.now(),
      );
      openInvite = open?.code ?? null;
    }

    const presenceRows = await ctx.db
      .query("presence")
      .withIndex("by_couple", (q) => q.eq("coupleId", couple._id))
      .collect();

    return {
      couple,
      membership,
      members: memberUsers,
      openInvite,
      presence: presenceRows,
    };
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    anniversaryAt: v.optional(v.number()),
    theme: v.optional(themeValidator),
    chatBackground: v.optional(chatBackgroundValidator),
    partnerLabel: v.optional(v.string()),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, membership, couple } = await requireMyCouple(ctx);
    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (name.length < 2) throw new Error("Couple name is too short");
      patch.name = name;
    }
    if (args.anniversaryAt !== undefined) patch.anniversaryAt = args.anniversaryAt;
    if (args.theme !== undefined) patch.theme = args.theme;
    if (args.chatBackground !== undefined) {
      patch.chatBackground = args.chatBackground;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(couple._id, patch);
    }
    if (args.partnerLabel !== undefined) {
      const partnerLabel = args.partnerLabel.trim();
      if (!partnerLabel) throw new Error("Your label can’t be empty");
      await ctx.db.patch(membership._id, { partnerLabel });
    }
    if (args.displayName !== undefined) {
      const displayName = args.displayName.trim();
      if (!displayName) throw new Error("Display name can’t be empty");
      await ctx.db.patch(user._id, { displayName });
    }
  },
});

export const getPublicCoupleCard = query({
  args: { coupleId: v.id("couples") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const couple = await ctx.db.get(args.coupleId);
    if (!couple) return null;
    return {
      _id: couple._id,
      name: couple.name,
      theme: couple.theme,
    };
  },
});
