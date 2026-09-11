"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { PlaySkeleton } from "@/components/skeletons";

const GAMES = [
  {
    href: "/play/truth-or-dare",
    title: "Truth or Dare",
    body: "Nudge them to pick Truth or Dare, then ask — pops up live.",
    tag: "Ask each other",
  },
] as const;

export default function PlayHubPage() {
  const couple = useQuery(api.couples.myCouple);

  if (couple === undefined) {
    return <PlaySkeleton />;
  }

  if (!couple || couple.couple.status !== "active") {
    return (
      <EmptyState
        title="Almost playtime"
        body="Invite your partner first. Games are better with two heartbeats."
      />
    );
  }

  return (
    <div className="samba-fade-up mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
          Play
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">
          Games
        </h1>
        <p className="mt-2 text-[color:var(--samba-ink)]/65">
          Little sparks built for two — pick a game and play.
        </p>
      </header>

      <div className="grid gap-4">
        {GAMES.map((game, i) => (
          <Link
            key={game.href}
            href={game.href}
            className="samba-fade-up group samba-panel block p-6 transition hover:border-[color:var(--samba-accent)]"
            style={{ animationDelay: `${0.06 * (i + 1)}s` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
                  {game.tag}
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight group-hover:text-[color:var(--samba-accent)]">
                  {game.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--samba-ink)]/65">
                  {game.body}
                </p>
              </div>
              <span
                aria-hidden
                className="mt-1 text-lg text-[color:var(--samba-muted)] transition group-hover:translate-x-0.5 group-hover:text-[color:var(--samba-accent)]"
              >
                →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
