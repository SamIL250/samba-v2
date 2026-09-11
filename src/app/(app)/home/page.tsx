"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/api";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { daysTogether, formatRelative } from "@/lib/theme";
import { useMemo, useState } from "react";

export default function HomePage() {
  const data = useQuery(api.couples.myCouple);
  const regenerateInvite = useMutation(api.couples.regenerateInvite);
  const [inviteBusy, setInviteBusy] = useState(false);

  const dayCount = useMemo(() => {
    if (!data?.couple) return 1;
    const start = data.couple.anniversaryAt ?? data.couple.createdAt;
    return daysTogether(start);
  }, [data]);

  const justPaired = useMemo(() => {
    if (!data || data.couple.status !== "active") return false;
    const partner = data.members.find((m) => m.membership.role === "partner");
    if (!partner) return false;
    return Date.now() - partner.membership.joinedAt < 10 * 60_000;
  }, [data]);

  if (!data) {
    return <p className="animate-pulse text-sm opacity-60">Loading your nest…</p>;
  }

  const partnerPresence = data.presence.find(
    (p) => p.userId !== data.membership.userId,
  );

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
      <ConfettiBurst fire={justPaired} />

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
            <h1 className="mt-2 font-[family-name:var(--font-display)] font-bold tracking-tight text-4xl md:text-5xl">
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
            body: "Would You Rather — answer privately, reveal together.",
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
            <h2 className="font-[family-name:var(--font-display)] font-bold tracking-tight text-2xl group-hover:text-[color:var(--samba-accent)]">
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
