"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { MessageChatCircle } from "@untitledui/icons";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/theme";
import { SOFT_SIGNALS, signalMeta, type SoftSignalKind } from "@/lib/signals";

export default function MessagesHubPage() {
  const inbox = useQuery(api.signals.inbox);
  const sendSignal = useMutation(api.signals.send);
  const markSeen = useMutation(api.signals.markSeen);
  const [sending, setSending] = useState<SoftSignalKind | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inbox?.unreadCount) return;
    const id = window.setTimeout(() => {
      void markSeen({});
    }, 1800);
    return () => window.clearTimeout(id);
  }, [inbox?.unreadCount, markSeen]);

  async function onSend(kind: SoftSignalKind) {
    setSending(kind);
    setError(null);
    try {
      await sendSignal({ kind });
      const label = signalMeta(kind).label;
      setToast(`Sent ${label.toLowerCase()} — they’ll feel it.`);
      window.setTimeout(() => setToast(null), 2800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t send that");
    } finally {
      setSending(null);
    }
  }

  if (inbox === undefined) {
    return (
      <p className="animate-pulse text-sm opacity-60">Opening messages…</p>
    );
  }

  if (!inbox) {
    return (
      <p className="text-sm opacity-60">
        Pair up first — messages live in your couple space.
      </p>
    );
  }

  const partnerName =
    inbox.partner?.partnerLabel ?? inbox.partner?.displayName ?? "Your person";
  const firstName = partnerName.split(" ")[0] ?? partnerName;

  return (
    <div className="samba-fade-up mx-auto max-w-lg space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--samba-accent)]">
          Between you two
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
          Messages
        </h1>
        <p className="mt-1.5 text-sm text-[color:var(--samba-muted)]">
          Your private thread — and little signals that land on their side.
        </p>
      </header>

      {inbox.conversationId && inbox.partner ? (
        <Link
          href="/chat/thread"
          className="flex items-center gap-3 rounded-[1.35rem] border border-[color:var(--samba-border)] bg-white px-4 py-3.5 transition hover:border-[color:var(--samba-accent)]"
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold"
            style={{ background: inbox.partner.color }}
          >
            {inbox.partner.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={inbox.partner.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              partnerName[0]?.toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate font-semibold">{partnerName}</p>
              {inbox.lastMessage ? (
                <time className="shrink-0 text-[11px] text-[color:var(--samba-muted)]">
                  {formatRelative(inbox.lastMessage.createdAt)}
                </time>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-sm text-[color:var(--samba-muted)]">
              {inbox.lastMessage
                ? `${inbox.lastMessage.mine ? "You: " : ""}${inbox.lastMessage.body}`
                : "Say something soft…"}
            </p>
          </div>
          <MessageChatCircle
            className="size-5 shrink-0 text-[color:var(--samba-muted)]"
            strokeWidth={1.75}
          />
        </Link>
      ) : (
        <div className="rounded-[1.35rem] border border-dashed border-[color:var(--samba-border)] bg-white/60 px-4 py-6 text-center text-sm text-[color:var(--samba-muted)]">
          Invite your person — then your private chat appears here.
        </div>
      )}

      <section className="rounded-[1.5rem] border border-[color:var(--samba-border)] bg-white px-4 py-5">
        <div className="mb-4">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
            Soft signals
          </h2>
          <p className="mt-1 text-sm text-[color:var(--samba-muted)]">
            Tap one and it arrives on {firstName}’s screen — wherever they are.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {SOFT_SIGNALS.map(({ kind, label, blurb, illustration }) => (
            <button
              key={kind}
              type="button"
              disabled={sending !== null || !inbox.partner}
              onClick={() => void onSend(kind)}
              className="group flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2 transition enabled:hover:bg-[color:var(--samba-accent)]/15 disabled:opacity-50"
              title={blurb}
            >
              <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[color:var(--samba-surface)] transition group-hover:bg-[color:var(--samba-accent)]/25">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={illustration}
                  alt=""
                  className={`h-10 w-10 object-contain ${sending === kind ? "animate-pulse" : ""}`}
                />
              </span>
              <span className="text-[10px] font-semibold leading-tight tracking-tight">
                {label}
              </span>
            </button>
          ))}
        </div>

        {toast ? (
          <p className="mt-3 text-center text-sm text-[color:var(--samba-ink)]/70">
            {toast}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 text-center text-sm text-[#B45309]" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
          From {firstName}
        </h2>
        {inbox.received.length === 0 ? (
          <p className="rounded-[1.25rem] bg-white/70 px-4 py-5 text-center text-sm text-[color:var(--samba-muted)]">
            Nothing yet — when {firstName} sends a soft signal, it lands here
            for you.
          </p>
        ) : (
          <ul className="space-y-2">
            {inbox.received.map((signal) => {
              const meta = signalMeta(signal.kind);
              const fresh = signal.seenAt === undefined;
              return (
                <li
                  key={signal._id}
                  className={`flex items-center gap-3 rounded-[1.15rem] border px-3.5 py-3 ${
                    fresh
                      ? "border-[color:var(--samba-accent)] bg-[color:var(--samba-accent)]/12"
                      : "border-[color:var(--samba-border)] bg-white"
                  }`}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color:var(--samba-surface)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={meta.illustration}
                      alt=""
                      className="h-10 w-10 object-contain"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {partnerName} sent {signal.label}
                    </p>
                    <p className="text-xs text-[color:var(--samba-muted)]">
                      {formatRelative(signal.createdAt)}
                      {fresh ? " · new" : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
