"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft } from "@untitledui/icons";
import { api, type Id } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { TruthOrDareSkeleton } from "@/components/skeletons";
import { formatRelative } from "@/lib/theme";

export default function TruthOrDarePage() {
  const couple = useQuery(api.couples.myCouple);
  const history = useQuery(api.tod.history, {});
  const nudge = useMutation(api.tod.nudge);
  const writePrompt = useMutation(api.tod.writePrompt);
  const shareToChat = useMutation(api.tod.shareToChat);

  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);

  const open = history?.find((r) => r.isOpen);

  async function onNudge() {
    setBusy(true);
    setError(null);
    try {
      await nudge({});
      setToast("Nudge sent — waiting for them to pick Truth or Dare.");
      window.setTimeout(() => setToast(null), 3200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t nudge");
    } finally {
      setBusy(false);
    }
  }

  async function onWrite(e: FormEvent) {
    e.preventDefault();
    if (!open || open.status !== "awaiting_prompt") return;
    setBusy(true);
    setError(null);
    try {
      await writePrompt({ playId: open._id, promptText: prompt });
      setPrompt("");
      setToast(
        open.kind === "dare"
          ? "Dare sent — it’ll pop up for them."
          : "Truth sent — it’ll pop up for them.",
      );
      window.setTimeout(() => setToast(null), 3200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t send");
    } finally {
      setBusy(false);
    }
  }

  async function onShare(playId: Id<"todPlays">) {
    setSharing(playId);
    try {
      await shareToChat({ playId });
      setToast("Shared to chat");
      window.setTimeout(() => setToast(null), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t share");
    } finally {
      setSharing(null);
    }
  }

  if (couple === undefined || history === undefined) {
    return <TruthOrDareSkeleton />;
  }

  if (!couple || couple.couple.status !== "active") {
    return (
      <EmptyState
        title="Almost playtime"
        body="Invite your partner first — Truth or Dare needs both of you."
      />
    );
  }

  const saved = history.filter((r) => !r.isOpen);

  return (
    <div className="samba-fade-up mx-auto max-w-2xl space-y-6">
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
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">
          Truth or Dare
        </h1>
        <p className="mt-2 text-[color:var(--samba-ink)]/65">
          Nudge them to pick. See what they choose. Ask accordingly — plays are
          saved.
        </p>
      </header>

      {!open ? (
        <div className="samba-panel space-y-4 p-5 md:p-6">
          <p className="text-sm font-semibold text-[color:var(--samba-ink)]">
            Start a round
          </p>
          <p className="text-sm text-[color:var(--samba-muted)]">
            Send a nudge — they’ll pick Truth or Dare on their screen, then you
            ask.
          </p>
          <button
            type="button"
            className="samba-btn w-full sm:w-auto"
            disabled={busy}
            onClick={() => void onNudge()}
          >
            Nudge them to pick
          </button>
        </div>
      ) : open.status === "awaiting_pick" ? (
        <div className="samba-panel p-5 md:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
            Waiting
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
            {open.iAsked
              ? `Waiting for ${open.toName} to pick…`
              : "Your turn — pick Truth or Dare in the popup."}
          </p>
          <p className="mt-2 text-sm text-[color:var(--samba-muted)]">
            {open.iAsked
              ? "It’ll appear wherever they are in the app."
              : "Choose, then they’ll ask you."}
          </p>
        </div>
      ) : open.status === "awaiting_prompt" ? (
        <div className="samba-panel space-y-4 p-5 md:p-6">
          {open.iAsked ? (
            <form onSubmit={onWrite} className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
                They picked {open.kind}
              </p>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
                {open.toName} chose {open.kind}
              </p>
              <p className="text-sm text-[color:var(--samba-muted)]">
                {open.kind === "truth"
                  ? "Ask them anything honest."
                  : "Dare them to do something sweet."}
              </p>
              <textarea
                className="samba-input min-h-[6rem] resize-none"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  open.kind === "truth"
                    ? "Ask them anything honest…"
                    : "Dare them to do something sweet…"
                }
                aria-label={open.kind === "truth" ? "Truth question" : "Dare"}
                disabled={busy}
                autoFocus
              />
              <button
                type="submit"
                className="samba-btn w-full sm:w-auto"
                disabled={busy || prompt.trim().length < 3}
              >
                Send {open.kind}
              </button>
            </form>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
                You picked {open.kind}
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
                Waiting for {open.fromName} to ask…
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="samba-panel p-5 md:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
            Open · {open.kind}
          </p>
          {open.promptText ? (
            <p className="mt-2 font-semibold leading-snug">{open.promptText}</p>
          ) : null}
          <p className="mt-2 text-sm text-[color:var(--samba-muted)]">
            {open.iAsked
              ? `Waiting for ${open.toName} to answer…`
              : "This one’s for you — answer in the popup."}
          </p>
        </div>
      )}

      {toast ? (
        <p className="text-sm text-[color:var(--samba-ink)]/70">{toast}</p>
      ) : null}
      {error ? <p className="text-sm text-[#B45309]">{error}</p> : null}

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
          Saved plays
        </h2>
        {saved.length === 0 ? (
          <p className="rounded-[1.25rem] bg-white/70 px-4 py-5 text-center text-sm text-[color:var(--samba-muted)]">
            No plays yet — nudge them to start.
          </p>
        ) : (
          <ul className="space-y-2">
            {saved.map((play) => (
              <li
                key={play._id}
                className="rounded-[1.15rem] border border-[color:var(--samba-border)] bg-white px-4 py-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--samba-accent)]">
                    {play.kind ?? "round"}
                    {play.status === "skipped" ? " · passed" : ""}
                  </p>
                  <time className="text-[11px] text-[color:var(--samba-muted)]">
                    {formatRelative(play.completedAt ?? play.createdAt)}
                  </time>
                </div>
                {play.promptText ? (
                  <p className="mt-1 text-sm font-semibold leading-snug">
                    {play.promptText}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-[color:var(--samba-muted)]">
                  {play.fromName} → {play.toName}
                </p>
                {play.answerText ? (
                  <p className="mt-2 rounded-xl bg-[color:var(--samba-surface)] px-3 py-2 text-sm leading-snug">
                    {play.answerText}
                  </p>
                ) : null}
                {(play.status === "done" || play.status === "skipped") && (
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-[color:var(--samba-muted)] underline-offset-2 hover:underline"
                    disabled={sharing === play._id}
                    onClick={() => void onShare(play._id)}
                  >
                    {sharing === play._id ? "Sharing…" : "Share to chat"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
