"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/api";
import { GameModalShell } from "@/components/GameModalShell";

export function TruthOrDareOverlay() {
  const pending = useQuery(api.tod.livePending);
  const pick = useMutation(api.tod.pick);
  const writePrompt = useMutation(api.tod.writePrompt);
  const answer = useMutation(api.tod.answer);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!pending) return null;

  async function onPick(kind: "truth" | "dare") {
    if (!pending || pending.role !== "pick") return;
    setBusy(true);
    setError(null);
    try {
      await pick({ playId: pending._id, kind });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t pick");
    } finally {
      setBusy(false);
    }
  }

  async function onWrite(e: FormEvent) {
    e.preventDefault();
    if (!pending || pending.role !== "write_prompt") return;
    setBusy(true);
    setError(null);
    try {
      await writePrompt({ playId: pending._id, promptText: text });
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t send");
    } finally {
      setBusy(false);
    }
  }

  async function onAnswer(outcome: "done" | "skipped") {
    if (!pending || pending.role !== "answer") return;
    setBusy(true);
    setError(null);
    try {
      await answer({
        playId: pending._id,
        outcome,
        answerText: text.trim() || undefined,
      });
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <GameModalShell label="Truth or Dare">
      {pending.role === "pick" ? (
        <>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--samba-accent)]">
            Nudge
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight sm:text-2xl">
            {pending.fromName} wants Truth or Dare
          </p>
          <p className="mt-2 text-sm text-[color:var(--samba-muted)]">
            Pick one — they’ll ask you next.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onPick("truth")}
              className="rounded-2xl border border-[color:var(--samba-border)] bg-[color:var(--samba-surface)] px-4 py-5 text-left transition hover:border-[color:var(--samba-accent)]"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--samba-accent)]">
                Truth
              </span>
              <p className="mt-1 font-semibold">I’ll answer honestly</p>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onPick("dare")}
              className="rounded-2xl border border-[color:var(--samba-border)] bg-[color:var(--samba-surface)] px-4 py-5 text-left transition hover:border-[color:var(--samba-accent)]"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--samba-accent)]">
                Dare
              </span>
              <p className="mt-1 font-semibold">I’ll do something</p>
            </button>
          </div>
        </>
      ) : null}

      {pending.role === "write_prompt" ? (
        <>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--samba-accent)]">
            They picked {pending.kind}
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight sm:text-2xl">
            {pending.toName} chose {pending.kind}
          </p>
          <p className="mt-2 text-sm text-[color:var(--samba-muted)]">
            {pending.kind === "truth"
              ? "Ask them anything honest."
              : "Dare them to do something sweet."}
          </p>
          <form onSubmit={onWrite} className="mt-5 space-y-3">
            <textarea
              className="samba-input min-h-[4.5rem] resize-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                pending.kind === "truth"
                  ? "Your truth question…"
                  : "Your dare…"
              }
              aria-label={pending.kind === "truth" ? "Truth" : "Dare"}
              disabled={busy}
              autoFocus
            />
            <button
              type="submit"
              className="samba-btn w-full"
              disabled={busy || text.trim().length < 3}
            >
              Send {pending.kind}
            </button>
          </form>
        </>
      ) : null}

      {pending.role === "answer" ? (
        <>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--samba-accent)]">
            {pending.kind === "truth" ? "Truth" : "Dare"}
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[color:var(--samba-ink)] sm:text-2xl">
            {pending.promptText}
          </p>
          <p className="mt-2 text-sm text-[color:var(--samba-muted)]">
            From {pending.fromName}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onAnswer("done");
            }}
            className="mt-5 space-y-3"
          >
            <textarea
              className="samba-input min-h-[4.5rem] resize-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                pending.kind === "truth"
                  ? "Your honest answer…"
                  : "Optional note (or just mark done)"
              }
              aria-label="Your answer"
              disabled={busy}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="samba-btn flex-1"
                disabled={busy || (pending.kind === "truth" && !text.trim())}
              >
                {pending.kind === "truth" ? "Send answer" : "I did it"}
              </button>
              <button
                type="button"
                className="samba-btn-ghost"
                disabled={busy}
                onClick={() => void onAnswer("skipped")}
              >
                Pass
              </button>
            </div>
          </form>
        </>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-[#B45309]" role="alert">
          {error}
        </p>
      ) : null}
    </GameModalShell>
  );
}
