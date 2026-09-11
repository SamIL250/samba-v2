"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { formatRelative } from "@/lib/theme";

export default function ChatPage() {
  const conversation = useQuery(api.chat.getConversation);
  const me = useQuery(api.users.me);
  const couple = useQuery(api.couples.myCouple);
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
    return <p className="animate-pulse text-sm opacity-60">Opening chat…</p>;
  }

  if (!conversation) {
    return (
      <EmptyState
        title="No chat yet"
        body="Finish pairing with your person first — your private thread appears when the couple space exists."
      />
    );
  }

  return (
    <div className="samba-panel flex h-[calc(100vh-7.5rem)] flex-col">
      <div className="border-b border-[color:var(--samba-border)] px-5 py-4">
        <h1 className="font-[family-name:var(--font-display)] font-bold tracking-tight text-2xl">Chat</h1>
        <p className="text-sm text-[color:var(--samba-ink)]/55">
          Just the two of you
          {partnerTyping ? " · typing…" : ""}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
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
                  className="mx-auto max-w-md text-center text-xs text-[color:var(--samba-ink)]/50"
                >
                  {message.body}
                </p>
              );
            }

            if (message.type === "game_share") {
              return (
                <div
                  key={message._id}
                  className="mx-auto max-w-md rounded-2xl bg-[color:var(--samba-accent)]/10 px-4 py-3 text-center text-sm"
                >
                  {message.body}
                </div>
              );
            }

            return (
              <div
                key={message._id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    mine
                      ? "rounded-br-md text-[color:var(--samba-ink)]"
                      : "rounded-bl-md bg-white"
                  }`}
                  style={
                    mine
                      ? { background: message.sender?.color ?? "var(--samba-accent)" }
                      : { borderLeft: `3px solid ${message.sender?.color ?? "#ccc"}` }
                  }
                >
                  {!mine && message.sender ? (
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide opacity-70">
                      {message.sender.partnerLabel ?? message.sender.displayName}
                    </p>
                  ) : null}
                  {message.type === "image" && message.media ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={message.media.secureUrl}
                      alt=""
                      className="mb-1 max-h-64 rounded-xl object-cover"
                    />
                  ) : null}
                  {message.body ? <p className="whitespace-pre-wrap text-sm">{message.body}</p> : null}
                  <p
                    className={`mt-1 text-[10px] ${mine ? "text-[color:var(--samba-ink)]/55" : "text-[color:var(--samba-ink)]/40"}`}
                  >
                    {formatRelative(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSend}
        className="flex items-end gap-2 border-t border-[color:var(--samba-border)] p-3"
      >
        <label className="samba-btn-ghost cursor-pointer px-3 py-3 text-sm">
          {uploading ? "…" : "Photo"}
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
        />
        <button className="samba-btn shrink-0" type="submit" disabled={!text.trim()}>
          Send
        </button>
      </form>
      {error ? <p className="px-4 pb-3 text-sm text-[#B45309]">{error}</p> : null}
    </div>
  );
}
