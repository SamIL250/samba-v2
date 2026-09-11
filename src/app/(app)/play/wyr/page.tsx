"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/api";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { EmptyState } from "@/components/EmptyState";
import Link from "next/link";
import { ArrowLeft } from "@untitledui/icons";
import { useState } from "react";
import { formatRelative } from "@/lib/theme";

export default function WouldYouRatherPage() {
  const active = useQuery(api.wyr.getActiveRound);
  const couple = useQuery(api.couples.myCouple);
  const past = useQuery(api.wyr.history, {});
  const startRound = useMutation(api.wyr.startRound);
  const answer = useMutation(api.wyr.answer);
  const shareToChat = useMutation(api.wyr.shareToChat);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  async function onStart() {
    setBusy(true);
    setError(null);
    setShared(false);
    try {
      await startRound({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start");
    } finally {
      setBusy(false);
    }
  }

  async function onAnswer(choice: "A" | "B") {
    if (!active?.round) return;
    setBusy(true);
    setError(null);
    try {
      await answer({ roundId: active.round._id, choice });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not answer");
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    if (!active?.round) return;
    setBusy(true);
    try {
      await shareToChat({ roundId: active.round._id });
      setShared(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not share");
    } finally {
      setBusy(false);
    }
  }

  if (active === undefined || couple === undefined) {
    return <p className="animate-pulse text-sm opacity-60">Loading game…</p>;
  }

  if (!couple || couple.couple.status !== "active") {
    return (
      <EmptyState
        title="Almost playtime"
        body="Invite your partner first. Would You Rather is better with two heartbeats."
      />
    );
  }

  const myUserId = couple.membership.userId;
  const revealed = active?.round.status === "revealed";

  return (
    <div className="samba-fade-up mx-auto max-w-2xl space-y-6">
      <ConfettiBurst fire={Boolean(revealed && active?.isMatch)} />

      <header>
        <Link
          href="/play"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-[color:var(--samba-muted)] transition hover:text-[color:var(--samba-ink)]"
        >
          <ArrowLeft className="size-4" strokeWidth={2} />
          Games
        </Link>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
          Play
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] font-bold tracking-tight text-4xl">
          Would You Rather
        </h1>
        <p className="mt-2 text-[color:var(--samba-ink)]/65">
          Answer in secret. When you both choose, the reveal lands together —
          and if they’re elsewhere in the app, the prompt pops up for them.
        </p>
      </header>

      {!active ? (
        <div className="samba-panel p-8 text-center">
          <EmptyState
            title="No round yet"
            body="Start a spark and wait for your person — or answer when they deal."
            action={
              <button className="samba-btn" disabled={busy} onClick={() => void onStart()}>
                Deal a prompt
              </button>
            }
          />
        </div>
      ) : (
        <div className="samba-panel p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--samba-accent)]">
            {active.prompt?.category ?? "spark"}
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] font-bold tracking-tight text-2xl md:text-3xl">
            Would you rather…
          </h2>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {(["A", "B"] as const).map((choice) => {
              const label =
                choice === "A" ? active.prompt?.optionA : active.prompt?.optionB;
              const selected = active.myAnswer === choice;
              const showPartner =
                revealed &&
                active.round.answers.some(
                  (a) => a.userId !== myUserId && a.choice === choice,
                );
              return (
                <button
                  key={choice}
                  type="button"
                  disabled={busy || Boolean(active.myAnswer) || revealed}
                  onClick={() => void onAnswer(choice)}
                  className={`rounded-2xl border px-5 py-6 text-left transition ${
                    selected
                      ? "border-[color:var(--samba-accent)] bg-[color:var(--samba-accent)]/10"
                      : "border-[color:var(--samba-border)] bg-white hover:border-[color:var(--samba-accent)]/40"
                  } ${revealed && active.isMatch && selected ? "samba-spark" : ""}`}
                >
                  <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--samba-accent)]">
                    {choice}
                  </span>
                  <p className="mt-2 text-lg font-semibold leading-snug">{label}</p>
                  {selected ? (
                    <p className="mt-3 text-xs text-[color:var(--samba-ink)]/55">Your pick</p>
                  ) : null}
                  {showPartner ? (
                    <p className="mt-1 text-xs font-semibold text-[color:var(--samba-accent)]">
                      Partner picked this too
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!revealed && active.myAnswer ? (
              <p className="text-sm text-[color:var(--samba-ink)]/60">
                {active.partnerAnswered
                  ? "Revealing…"
                  : "Locked in. Waiting for your person…"}
              </p>
            ) : null}
            {revealed ? (
              <>
                <p className="text-sm font-semibold text-[color:var(--samba-accent)]">
                  {active.isMatch ? "Match spark — same heart!" : "Different picks, same us."}
                </p>
                <button
                  className="samba-btn-ghost text-sm"
                  disabled={busy || shared}
                  onClick={() => void onShare()}
                >
                  {shared ? "Shared to chat" : "Send to chat"}
                </button>
                <button className="samba-btn text-sm" disabled={busy} onClick={() => void onStart()}>
                  Next round
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {error ? <p className="text-sm text-[#B45309]">{error}</p> : null}

      {past && past.length > 0 ? (
        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
            Saved plays
          </h2>
          <ul className="space-y-2">
            {past.map((play) => (
              <li
                key={play._id}
                className="rounded-[1.15rem] border border-[color:var(--samba-border)] bg-white px-4 py-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--samba-accent)]">
                    {play.category}
                    {play.matched ? " · match" : ""}
                  </p>
                  <time className="text-[11px] text-[color:var(--samba-muted)]">
                    {formatRelative(play.revealedAt ?? play.createdAt)}
                  </time>
                </div>
                <p className="mt-1 text-sm leading-snug text-[color:var(--samba-ink)]/80">
                  {play.optionA}{" "}
                  <span className="text-[color:var(--samba-muted)]">or</span>{" "}
                  {play.optionB}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
