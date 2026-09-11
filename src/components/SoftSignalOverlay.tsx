"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api, type Id } from "@/lib/api";
import { signalMeta, type SoftSignalKind } from "@/lib/signals";

type Phase = "enter" | "hold" | "exit" | "idle";

export function SoftSignalOverlay() {
  const gamePending = useQuery(api.tod.livePending);
  const wyrPending = useQuery(api.wyr.livePending);
  const pending = useQuery(api.signals.livePending);
  const markPresented = useMutation(api.signals.markPresented);
  const [active, setActive] = useState<{
    id: Id<"softSignals">;
    kind: SoftSignalKind;
  } | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const handlingRef = useRef<string | null>(null);

  useEffect(() => {
    if (gamePending || wyrPending) return;
    if (!pending) return;
    if (handlingRef.current === pending._id) return;
    if (active) return;

    handlingRef.current = pending._id;
    setActive({
      id: pending._id,
      kind: pending.kind,
    });
    setPhase("enter");
  }, [pending, active, gamePending, wyrPending]);

  useEffect(() => {
    if (!active || phase === "idle") return;

    if (phase === "enter") {
      const id = window.setTimeout(() => setPhase("hold"), 520);
      return () => window.clearTimeout(id);
    }

    if (phase === "hold") {
      const id = window.setTimeout(() => setPhase("exit"), 2600);
      return () => window.clearTimeout(id);
    }

    if (phase === "exit") {
      const id = window.setTimeout(() => {
        void markPresented({ signalId: active.id });
        setActive(null);
        setPhase("idle");
        handlingRef.current = null;
      }, 420);
      return () => window.clearTimeout(id);
    }
  }, [active, phase, markPresented]);

  if (gamePending || wyrPending) return null;
  if (!active || phase === "idle") return null;

  const meta = signalMeta(active.kind);
  const visible = phase === "enter" || phase === "hold";

  return (
    <div
      className={`samba-signal-overlay fixed inset-0 z-[80] flex items-center justify-center px-6 ${
        visible ? "samba-signal-overlay-in" : "samba-signal-overlay-out"
      }`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`samba-signal-card flex max-w-sm flex-col items-center rounded-[2rem] border border-[color:var(--samba-border)] bg-white/95 px-8 py-9 text-center backdrop-blur-md ${
          visible ? "samba-signal-card-in" : "samba-signal-card-out"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={meta.illustration}
          alt=""
          className="samba-signal-art h-36 w-36 object-contain"
        />
        <p className="mt-5 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[color:var(--samba-ink)]">
          {meta.message}
        </p>
        <p className="mt-2 text-sm text-[color:var(--samba-muted)]">
          A little note just for you.
        </p>
      </div>
    </div>
  );
}
