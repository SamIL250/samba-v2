"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/api";
import { GameModalShell } from "@/components/GameModalShell";

export function WyrOverlay() {
  const todPending = useQuery(api.tod.livePending);
  const pending = useQuery(api.wyr.livePending);
  const answer = useMutation(api.wyr.answer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (todPending || !pending) return null;

  async function onPick(choice: "A" | "B") {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      await answer({ roundId: pending.roundId, choice });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t answer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <GameModalShell label="Would You Rather">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--samba-accent)]">
        Would you rather · {pending.category}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight sm:text-2xl">
        Pick one — your person is waiting.
      </p>

      <div className="mt-5 grid gap-2">
        {(["A", "B"] as const).map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={busy}
            onClick={() => void onPick(choice)}
            className="rounded-2xl border border-[color:var(--samba-border)] bg-[color:var(--samba-surface)] px-4 py-4 text-left transition hover:border-[color:var(--samba-accent)] disabled:opacity-55"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--samba-accent)]">
              {choice}
            </span>
            <p className="mt-1 text-base font-semibold leading-snug">
              {choice === "A" ? pending.optionA : pending.optionB}
            </p>
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-[#B45309]" role="alert">
          {error}
        </p>
      ) : null}
    </GameModalShell>
  );
}
