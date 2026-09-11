"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { ArrowLeft, ImagePlus, Send01 } from "@untitledui/icons";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { formatRelative } from "@/lib/theme";

export default function ChatThreadPage() {
  const conversation = useQuery(api.chat.getConversation);
  const me = useQuery(api.users.me);
  const couple = useQuery(api.couples.myCouple);
  const inbox = useQuery(api.signals.inbox);
  const messages = useQuery(
    api.chat.listMessages,
    conversation ? { conversationId: conversation._id } : "skip",
  );
  const sendText = useMutation(api.chat.sendText);
  const sendImage = useMutation(api.chat.sendImage);
  const confirmMedia = useMutation(api.media.confirm);
  const getSignature = useAction(api.mediaActions.createUploadSignature);
  const heartbeat = useMutation(api.presence.heartbeat);
  const clearTyping = useMutation(api.presence.clearTyping);

  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const partnerTyping = couple?.presence.find(
    (p) =>
      p.userId !== me?.user._id &&
      p.typingInConversationId &&
      conversation &&
      p.typingInConversationId === conversation._id &&
      Date.now() - p.lastSeenAt < 8_000,
  );

  const partnerName =
    inbox?.partner?.partnerLabel ??
    inbox?.partner?.displayName ??
    "Your person";

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!conversation || !text.trim()) return;
    const body = text;
    setText("");
    setError(null);
    try {
      await clearTyping({});
      await sendText({ conversationId: conversation._id, body });
    } catch (err) {
      setText(body);
      setError(err instanceof Error ? err.message : "Failed to send");
    }
  }

  function onTyping(value: string) {
    setText(value);
    if (!conversation) return;
    void heartbeat({ typingInConversationId: conversation._id });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      void clearTyping({});
    }, 2500);
  }

  async function onPickImage(file: File | null) {
    if (!file || !conversation || !couple) return;
    setUploading(true);
    setError(null);
    try {
      const signature = await getSignature({ coupleId: couple.couple._id });
      const uploaded = await uploadToCloudinary(file, signature);
      const mediaId = await confirmMedia({
        coupleId: couple.couple._id,
        cloudinaryPublicId: uploaded.public_id,
        resourceType: uploaded.resource_type,
        width: uploaded.width,
        height: uploaded.height,
        format: uploaded.format,
        secureUrl: uploaded.secure_url,
      });
      await sendImage({ conversationId: conversation._id, mediaId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (conversation === undefined || messages === undefined) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white">
        <p className="animate-pulse text-sm opacity-60">Opening chat…</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="bg-white px-4 py-8">
        <Link
          href="/chat"
          className="mb-6 inline-flex items-center gap-2 text-sm text-[color:var(--samba-muted)]"
        >
          <ArrowLeft className="size-4" strokeWidth={2} />
          Messages
        </Link>
        <EmptyState
          title="No chat yet"
          body="Finish pairing with your person first — your private thread appears when the couple space exists."
        />
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-[color:var(--samba-border)] px-3 py-2.5">
        <Link
          href="/chat"
          className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[color:var(--samba-surface)]"
          aria-label="Back to messages"
        >
          <ArrowLeft className="size-5" strokeWidth={2} />
        </Link>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold"
          style={{
            background: inbox?.partner?.color ?? "var(--samba-accent)",
          }}
        >
          {inbox?.partner?.avatarUrl ? (
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
          <p className="truncate font-semibold leading-tight">{partnerName}</p>
          <p className="text-[11px] text-[color:var(--samba-muted)]">
            {partnerTyping ? "Typing…" : "Private chat"}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3">
        {messages.length === 0 ? (
          <EmptyState
            title="Say something soft"
            body="First messages feel big. A hello, a photo, a silly thought — all welcome."
          />
        ) : (
          messages.map((message) => {
            const mine = message.senderId === me?.user._id;
            if (message.type === "system") {
              return (
                <p
                  key={message._id}
                  className="mx-auto max-w-xs px-4 py-1 text-center text-[11px] leading-relaxed text-[color:var(--samba-ink)]/45"
                >
                  {message.body}
                </p>
              );
            }

            if (message.type === "game_share") {
              return (
                <div
                  key={message._id}
                  className="mx-auto max-w-sm rounded-2xl bg-[color:var(--samba-accent)]/12 px-4 py-2.5 text-center text-sm"
                >
                  {message.body}
                </div>
              );
            }

            const accent = message.sender?.color ?? "var(--samba-accent)";
            const time = formatRelative(message.createdAt);

            return (
              <div
                key={message._id}
                className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
              >
                {!mine ? (
                  <span
                    aria-hidden
                    className="mb-1 h-7 w-1 shrink-0 rounded-full"
                    style={{ background: accent }}
                  />
                ) : null}

                <div
                  className={`relative max-w-[78%] ${
                    message.type === "image" && !message.body
                      ? "overflow-hidden p-1"
                      : "px-3 py-2"
                  } ${
                    mine
                      ? "rounded-[1.15rem] rounded-br-md text-[color:var(--samba-ink)]"
                      : "rounded-[1.15rem] rounded-bl-md bg-[#F3F1EC] text-[color:var(--samba-ink)]"
                  }`}
                  style={mine ? { background: accent } : undefined}
                >
                  {message.type === "image" && message.media ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={message.media.secureUrl}
                        alt=""
                        className={`max-h-64 w-full object-cover ${
                          message.body ? "mb-1.5 rounded-xl" : "rounded-[0.95rem]"
                        }`}
                      />
                      {!message.body ? (
                        <time
                          dateTime={new Date(message.createdAt).toISOString()}
                          className="absolute bottom-1.5 right-2 rounded-md bg-black/35 px-1.5 py-0.5 text-[10px] leading-none tabular-nums text-white/95"
                        >
                          {time}
                        </time>
                      ) : null}
                    </div>
                  ) : null}

                  {message.body ? (
                    <>
                      <p className="whitespace-pre-wrap pr-11 text-[15px] leading-snug">
                        {message.body}
                      </p>
                      <time
                        dateTime={new Date(message.createdAt).toISOString()}
                        className={`absolute bottom-1.5 right-2.5 text-[10px] leading-none tabular-nums ${
                          mine
                            ? "text-[color:var(--samba-ink)]/50"
                            : "text-[color:var(--samba-ink)]/40"
                        }`}
                      >
                        {time}
                      </time>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div
        className="shrink-0 border-t border-[color:var(--samba-border)] bg-white px-2.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <form onSubmit={onSend} className="flex items-center gap-2">
          <label className="samba-btn-ghost cursor-pointer px-3 py-3">
            <span className="sr-only">{uploading ? "Uploading" : "Add photo"}</span>
            <ImagePlus className="size-5" strokeWidth={1.75} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
            />
          </label>
          <input
            className="samba-input"
            value={text}
            onChange={(e) => onTyping(e.target.value)}
            placeholder="Write to your person…"
            aria-label="Message"
          />
          <button
            className="samba-btn shrink-0 px-3.5 py-3"
            type="submit"
            disabled={!text.trim() || uploading}
            aria-label="Send"
          >
            <Send01 className="size-5" strokeWidth={2} />
          </button>
        </form>
        {error ? (
          <p className="px-1 pt-2 text-sm text-[#B45309]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
