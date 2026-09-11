"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/api";
import { CelebrationCard } from "@/components/CelebrationCard";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import {
  daysTogether,
  formatRelative,
  isAnniversaryToday,
  yearsSince,
} from "@/lib/theme";
import { useMemo, useState } from "react";

export default function HomePage() {
  const data = useQuery(api.couples.myCouple);
  const regenerateInvite = useMutation(api.couples.regenerateInvite);
  const [inviteBusy, setInviteBusy] = useState(false);

  const datingStart = useMemo(() => {
    if (!data?.couple) return null;
    return (
      data.couple.datingStartedAt ??
      data.couple.anniversaryAt ??
      data.couple.createdAt
    );
  }, [data]);

  const dayCount = useMemo(() => {
    if (!datingStart) return 1;
    return daysTogether(datingStart);
  }, [datingStart]);

  const anniversaryToday = useMemo(() => {
    if (!datingStart) return false;
    // Don't treat couple-created-today as anniversary unless dating date is set
    if (!data?.couple.datingStartedAt && !data?.couple.anniversaryAt) {
      return false;
    }
    return isAnniversaryToday(datingStart);
  }, [data, datingStart]);

  const anniversaryYears = useMemo(() => {
    if (!datingStart || !anniversaryToday) return 0;
    return yearsSince(datingStart);
  }, [datingStart, anniversaryToday]);

  const birthdaysToday = useMemo(() => {
    if (!data) return [];
    return data.members
      .filter(
        (m) =>
          m.membership.birthDateAt &&
          isAnniversaryToday(m.membership.birthDateAt),
      )
      .map((m) => ({
        name:
          m.membership.partnerLabel ||
          m.user?.displayName ||
          "Your person",
        years: m.membership.birthDateAt
          ? yearsSince(m.membership.birthDateAt)
          : 0,
        mine: m.membership.userId === data.membership.userId,
      }));
  }, [data]);

  const justPaired = useMemo(() => {
    if (!data || data.couple.status !== "active") return false;
    const partner = data.members.find((m) => m.membership.role === "partner");
    if (!partner) return false;
    return Date.now() - partner.membership.joinedAt < 10 * 60_000;
  }, [data]);

  if (!data) {
    return (
      <p className="animate-pulse text-sm opacity-60">Loading your nest…</p>
    );
  }

  const partnerPresence = data.presence.find(
    (p) => p.userId !== data.membership.userId,
  );
  const needsDatingDate =
    !data.couple.datingStartedAt && !data.couple.anniversaryAt;

  async function onRegenerate() {
    setInviteBusy(true);
    try {
      await regenerateInvite({});
    } finally {
      setInviteBusy(false);
    }
  }

  return (
    <div className="samba-fade-up space-y-8">
      <ConfettiBurst
        fire={justPaired || anniversaryToday || birthdaysToday.length > 0}
      />

      {anniversaryToday ? (
        <CelebrationCard
          kind="anniversary"
          illustration="/brand/celebrate/anniversary.png"
          title={
            anniversaryYears <= 0
              ? "Happy anniversary"
              : `Happy ${anniversaryYears}-year anniversary`
          }
          body={`Today marks another year of ${data.couple.name}. You’re on day ${dayCount} — soft cheers from Samba.`}
        />
      ) : null}

      {birthdaysToday.map((b) => (
        <CelebrationCard
          key={b.name}
          kind="birthday"
          illustration="/brand/celebrate/birthday.png"
          title={b.mine ? "Happy birthday to you" : `Happy birthday, ${b.name}`}
          body={
            b.mine
              ? "Your person gets a reminder too — make today gentle and a little special."
              : `It’s ${b.name}’s day. Leave a note, send a soft signal, or plan something small.`
          }
        />
      ))}

      <section className="samba-panel relative overflow-hidden px-6 py-10">
        <div
          aria-hidden
          className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[color:var(--samba-glow)]/40 blur-2xl"
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
              Day {dayCount}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight md:text-5xl">
              {data.couple.name}
            </h1>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex -space-x-3">
                {data.members.map((m) => (
                  <div
                    key={m.membership._id}
                    className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[color:var(--samba-border)] text-sm font-bold text-[color:var(--samba-ink)]"
                    style={{ background: m.membership.color }}
                    title={m.membership.partnerLabel}
                  >
                    {m.user?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.user.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (m.membership.partnerLabel[0] ?? "?").toUpperCase()
                    )}
                  </div>
                ))}
              </div>
              <p className="text-sm text-[color:var(--samba-ink)]/65">
                {data.couple.status === "pending_partner"
                  ? "Waiting for your person…"
                  : partnerPresence
                    ? `Partner last seen ${formatRelative(partnerPresence.lastSeenAt)}`
                    : "Both of you belong here"}
              </p>
            </div>
            {needsDatingDate ? (
              <p className="mt-4 text-sm text-[color:var(--samba-muted)]">
                Day count starts from when you created this space.{" "}
                <Link
                  href="/couple"
                  className="font-semibold text-[color:var(--samba-accent)] underline"
                >
                  Add when you started dating
                </Link>{" "}
                for an accurate Day N and anniversary.
              </p>
            ) : null}
          </div>

          {data.couple.status === "pending_partner" && data.openInvite ? (
            <div className="rounded-2xl bg-[color:var(--samba-accent)]/10 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--samba-accent)]">
                Invite code
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-[0.2em]">
                {data.openInvite}
              </p>
              <p className="mt-2 max-w-xs text-sm text-[color:var(--samba-ink)]/65">
                Share{" "}
                <span className="font-semibold">/invite/{data.openInvite}</span>{" "}
                so they can join with their own login.
              </p>
              {data.membership.role === "creator" ? (
                <button
                  type="button"
                  className="mt-3 text-xs font-semibold text-[color:var(--samba-accent)] underline"
                  disabled={inviteBusy}
                  onClick={() => void onRegenerate()}
                >
                  {inviteBusy ? "Refreshing…" : "Regenerate code"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            href: "/chat",
            title: "Chat",
            body: "Whisper, send photos, leave little notes.",
          },
          {
            href: "/play",
            title: "Play",
            body: "Truth or Dare and more — play together.",
          },
          {
            href: "/moments",
            title: "Moments",
            body: "Keep them private, or publish to the Wall.",
          },
        ].map((card, i) => (
          <Link
            key={card.href}
            href={card.href}
            className="samba-fade-up group samba-panel rounded-[1.5rem] p-6 transition hover:border-[color:var(--samba-border-strong)]"
            style={{ animationDelay: `${0.08 * (i + 1)}s` }}
          >
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight group-hover:text-[color:var(--samba-accent)]">
              {card.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--samba-ink)]/65">
              {card.body}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
