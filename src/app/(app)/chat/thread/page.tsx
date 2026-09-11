"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Camera01,
  CornerUpLeft,
  DotsHorizontal,
  File04,
  Image01,
  Microphone01,
  Plus,
  Send01,
  Trash01,
  XClose,
} from "@untitledui/icons";
import { api, type Id } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { formatRelative } from "@/lib/theme";

type MediaKind = "image" | "audio" | "file";

const COMPOSER_MAX_HEIGHT = 120;

type ReplyDraft = {
  id: Id<"messages">;
  preview: string;
  senderName: string;
};

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
  const sendMedia = useMutation(api.chat.sendMedia);
  const deleteForMe = useMutation(api.chat.deleteForMe);
  const deleteForEveryone = useMutation(api.chat.deleteForEveryone);
  const confirmMedia = useMutation(api.media.confirm);
  const getSignature = useAction(api.mediaActions.createUploadSignature);
  const heartbeat = useMutation(api.presence.heartbeat);
  const clearTyping = useMutation(api.presence.clearTyping);

  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyDraft | null>(null);
  const [menuId, setMenuId] = useState<Id<"messages"> | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY =
      el.scrollHeight > COMPOSER_MAX_HEIGHT ? "auto" : "hidden";
  }, [text]);

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    function onDocClick() {
      setMenuId(null);
    }
    if (!menuId) return;
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuId]);

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

  function draftPreview(
    message: NonNullable<typeof messages>[number],
  ): string {
    if (message.deletedForEveryone) return "Deleted message";
    if (message.type === "image") return "Photo";
    if (message.type === "audio") return "Voice note";
    if (message.type === "file") return "File";
    return (message.body ?? "Message").slice(0, 80);
  }

  function startReply(message: NonNullable<typeof messages>[number]) {
    setMenuId(null);
    setReplyTo({
      id: message._id,
      preview: draftPreview(message),
      senderName:
        message.senderId === me?.user._id
          ? "You"
          : (message.sender?.partnerLabel ??
            message.sender?.displayName ??
            "Partner"),
    });
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function onDeleteForMe(messageId: Id<"messages">) {
    setMenuId(null);
    try {
      await deleteForMe({ messageId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t delete");
    }
  }

  async function onDeleteForEveryone(messageId: Id<"messages">) {
    setMenuId(null);
    try {
      await deleteForEveryone({ messageId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t delete");
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!conversation || !text.trim()) return;
    const body = text;
    const replyToId = replyTo?.id;
    setText("");
    setReplyTo(null);
    setError(null);
    try {
      await clearTyping({});
      await sendText({
        conversationId: conversation._id,
        body,
        replyToId,
      });
    } catch (err) {
      setText(body);
      if (replyToId) {
        /* keep reply cleared; user can re-pick */
      }
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

  function onComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    if (!text.trim() || uploading) return;
    const form = e.currentTarget.form;
    if (form) form.requestSubmit();
  }

  async function uploadAndSend(file: File, kind: MediaKind) {
    if (!conversation || !couple) return;
    setUploading(true);
    setAttachOpen(false);
    setError(null);
    const replyToId = replyTo?.id;
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
      await sendMedia({
        conversationId: conversation._id,
        mediaId,
        kind,
        replyToId,
      });
      setReplyTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onFileInput(
    e: ChangeEvent<HTMLInputElement>,
    kind: MediaKind,
  ) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (file) void uploadAndSend(file, kind);
  }

  async function startRecording() {
    if (uploading || recording) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        if (blob.size < 500) {
          setError("Voice note was too short");
          return;
        }
        const ext = mime.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `voice-${Date.now()}.${ext}`, {
          type: mime,
        });
        void uploadAndSend(file, "audio");
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSecs((s) => s + 1);
      }, 1000);
    } catch {
      setError("Microphone permission is needed for voice notes");
    }
  }

  function stopRecording(cancel = false) {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    setRecording(false);
    setRecordSecs(0);
    if (!recorder) return;
    if (cancel) {
      recorder.ondataavailable = null;
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      if (recorder.state !== "inactive") recorder.stop();
      chunksRef.current = [];
      return;
    }
    if (recorder.state !== "inactive") recorder.stop();
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
      <header className="flex shrink-0 items-center gap-3 border-b border-[color:var(--samba-border)] px-3 py-2.5 sm:px-4">
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-2xl space-y-2 px-3 py-3 sm:px-4">
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
                    className="mx-auto max-w-sm rounded-2xl border border-[color:var(--samba-border)] bg-[color:var(--samba-surface)] px-4 py-2.5 text-center text-sm"
                  >
                    {message.body}
                  </div>
                );
              }

              const accent = message.sender?.color ?? "var(--samba-accent)";
              const time = formatRelative(message.createdAt);
              const menuOpen = menuId === message._id;

              return (
                <div
                  key={message._id}
                  className={`group relative flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
                >
                  {!mine ? (
                    <span
                      aria-hidden
                      className="mb-1 h-7 w-1 shrink-0 rounded-full"
                      style={{ background: accent }}
                    />
                  ) : null}

                  <div className="relative min-w-0 max-w-[min(78%,24rem)]">
                    <button
                      type="button"
                      className={`absolute top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-sm transition group-hover:opacity-100 focus:opacity-100 ${
                        mine ? "-left-9" : "-right-9"
                      } ${menuOpen ? "opacity-100" : ""}`}
                      aria-label="Message actions"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuId(menuOpen ? null : message._id);
                      }}
                    >
                      <DotsHorizontal className="size-4" strokeWidth={2} />
                    </button>

                    {menuOpen ? (
                      <div
                        className={`absolute z-20 min-w-[11rem] overflow-hidden rounded-xl border border-[color:var(--samba-border)] bg-white py-1 text-sm shadow-sm ${
                          mine ? "right-0 top-9" : "left-0 top-9"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!message.deletedForEveryone ? (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[color:var(--samba-surface)]"
                            onClick={() => startReply(message)}
                          >
                            <CornerUpLeft className="size-4" strokeWidth={1.75} />
                            Reply
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[color:var(--samba-surface)]"
                          onClick={() => void onDeleteForMe(message._id)}
                        >
                          <Trash01 className="size-4" strokeWidth={1.75} />
                          Delete for me
                        </button>
                        {message.canDeleteForEveryone ? (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#B45309] hover:bg-[color:var(--samba-surface)]"
                            onClick={() => void onDeleteForEveryone(message._id)}
                          >
                            <Trash01 className="size-4" strokeWidth={1.75} />
                            Delete for everyone
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    <div
                      className={`min-w-0 overflow-hidden ${
                        message.type === "image" &&
                        !message.body &&
                        !message.deletedForEveryone
                          ? "p-1"
                          : "px-3 py-2"
                      } ${
                        mine
                          ? "rounded-[1.15rem] rounded-br-md bg-[color:var(--samba-ink)] text-[#FFFDF7]"
                          : "rounded-[1.15rem] rounded-bl-md bg-[#F3F1EC] text-[color:var(--samba-ink)]"
                      }`}
                    >
                      {message.replyTo ? (
                        <div
                          className={`mb-2 rounded-lg border-l-2 px-2 py-1.5 text-xs ${
                            mine
                              ? "border-[color:var(--samba-accent)] bg-white/10"
                              : "border-[color:var(--samba-accent)] bg-black/5"
                          }`}
                        >
                          <p
                            className={`font-semibold ${mine ? "text-[color:var(--samba-accent)]" : "text-[color:var(--samba-accent)]"}`}
                          >
                            {message.replyTo.senderName}
                          </p>
                          <p
                            className={`truncate ${mine ? "text-white/70" : "text-[color:var(--samba-muted)]"}`}
                          >
                            {message.replyTo.preview}
                          </p>
                        </div>
                      ) : null}

                      {message.deletedForEveryone ? (
                        <p
                          className={`pr-11 text-[15px] italic leading-snug ${
                            mine ? "text-white/55" : "text-[color:var(--samba-ink)]/45"
                          }`}
                        >
                          This message was deleted
                        </p>
                      ) : (
                        <>
                          {message.type === "image" && message.media ? (
                            <div className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={message.media.secureUrl}
                                alt=""
                                className={`max-h-64 w-full object-cover ${
                                  message.body
                                    ? "mb-1.5 rounded-xl"
                                    : "rounded-[0.95rem]"
                                }`}
                              />
                              {!message.body ? (
                                <time
                                  dateTime={new Date(
                                    message.createdAt,
                                  ).toISOString()}
                                  className="absolute bottom-1.5 right-2 rounded-md bg-black/35 px-1.5 py-0.5 text-[10px] leading-none tabular-nums text-white/95"
                                >
                                  {time}
                                </time>
                              ) : null}
                            </div>
                          ) : null}

                          {message.type === "audio" && message.media ? (
                            <div className="min-w-[14rem]">
                              <audio
                                controls
                                preload="metadata"
                                src={message.media.secureUrl}
                                className="w-full max-w-xs"
                              />
                            </div>
                          ) : null}

                          {message.type === "file" && message.media ? (
                            <a
                              href={message.media.secureUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={`inline-flex items-center gap-2 text-sm font-semibold underline-offset-2 hover:underline ${
                                mine
                                  ? "text-[#FFFDF7]"
                                  : "text-[color:var(--samba-ink)]"
                              }`}
                            >
                              <File04
                                className="size-4 shrink-0"
                                strokeWidth={1.75}
                              />
                              Open file
                            </a>
                          ) : null}

                          {message.body ? (
                            <p className="break-words whitespace-pre-wrap [overflow-wrap:anywhere] pr-11 text-[15px] leading-snug">
                              {message.body}
                            </p>
                          ) : null}
                        </>
                      )}

                      {(message.body ||
                        message.deletedForEveryone ||
                        message.type === "audio" ||
                        message.type === "file") && (
                        <time
                          dateTime={new Date(message.createdAt).toISOString()}
                          className={`mt-1 block text-right text-[10px] leading-none tabular-nums ${
                            mine
                              ? "text-white/55"
                              : "text-[color:var(--samba-ink)]/40"
                          }`}
                        >
                          {time}
                        </time>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-[color:var(--samba-border)] bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="relative mx-auto w-full max-w-2xl px-2.5 pt-2 sm:px-4">
          {replyTo ? (
            <div className="mb-2 flex items-start gap-2 rounded-xl border border-[color:var(--samba-border)] bg-[color:var(--samba-surface)] px-3 py-2">
              <CornerUpLeft
                className="mt-0.5 size-4 shrink-0 text-[color:var(--samba-accent)]"
                strokeWidth={1.75}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[color:var(--samba-accent)]">
                  Replying to {replyTo.senderName}
                </p>
                <p className="truncate text-sm text-[color:var(--samba-muted)]">
                  {replyTo.preview}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-1 hover:bg-white"
                aria-label="Cancel reply"
                onClick={() => setReplyTo(null)}
              >
                <XClose className="size-4" strokeWidth={2} />
              </button>
            </div>
          ) : null}

          {attachOpen ? (
            <div className="samba-attach-toolbar absolute bottom-full left-2.5 mb-2 flex gap-2 rounded-2xl border border-[color:var(--samba-border)] bg-white p-2 sm:left-4">
              <button
                type="button"
                disabled={uploading}
                onClick={() => galleryRef.current?.click()}
                className="flex w-[4.5rem] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold text-[color:var(--samba-ink)] transition hover:bg-[color:var(--samba-surface)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--samba-surface)]">
                  <Image01 className="size-5" strokeWidth={1.75} />
                </span>
                Image
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => cameraRef.current?.click()}
                className="flex w-[4.5rem] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold text-[color:var(--samba-ink)] transition hover:bg-[color:var(--samba-surface)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--samba-surface)]">
                  <Camera01 className="size-5" strokeWidth={1.75} />
                </span>
                Camera
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="flex w-[4.5rem] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold text-[color:var(--samba-ink)] transition hover:bg-[color:var(--samba-surface)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--samba-surface)]">
                  <File04 className="size-5" strokeWidth={1.75} />
                </span>
                File
              </button>
            </div>
          ) : null}

          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => onFileInput(e, "image")}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={uploading}
            onChange={(e) => onFileInput(e, "image")}
          />
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={(e) => onFileInput(e, "file")}
          />

          {recording ? (
            <div className="flex items-center gap-2 py-1">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#B45309]" />
              <p className="flex-1 text-sm font-semibold tabular-nums">
                Recording {String(Math.floor(recordSecs / 60)).padStart(2, "0")}:
                {String(recordSecs % 60).padStart(2, "0")}
              </p>
              <button
                type="button"
                className="samba-btn-ghost px-3 py-2 text-sm"
                onClick={() => stopRecording(true)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="samba-btn px-3 py-2 text-sm"
                onClick={() => stopRecording(false)}
              >
                Send
              </button>
            </div>
          ) : (
            <form onSubmit={onSend} className="flex items-end gap-2">
              <button
                type="button"
                className="relative mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--samba-border)] bg-white transition hover:bg-[color:var(--samba-surface)] disabled:opacity-55"
                aria-label={attachOpen ? "Close attach menu" : "Attach"}
                aria-expanded={attachOpen}
                disabled={uploading}
                onClick={() => setAttachOpen((o) => !o)}
              >
                {uploading ? (
                  <span
                    className="samba-spin block size-5 rounded-full border-2 border-[color:var(--samba-ink)] border-t-transparent"
                    aria-hidden
                  />
                ) : attachOpen ? (
                  <XClose className="size-5" strokeWidth={2} />
                ) : (
                  <Plus className="size-5" strokeWidth={2} />
                )}
              </button>

              <textarea
                ref={inputRef}
                className="samba-input samba-composer-input min-h-[2.75rem] flex-1 resize-none overflow-hidden"
                rows={1}
                value={text}
                onChange={(e) => onTyping(e.target.value)}
                onKeyDown={onComposerKeyDown}
                placeholder={
                  replyTo ? "Write your reply…" : "Write to your person…"
                }
                aria-label="Message"
                disabled={uploading}
              />

              {text.trim() ? (
                <button
                  className="samba-btn mb-0.5 shrink-0 px-3.5 py-3"
                  type="submit"
                  disabled={uploading}
                  aria-label="Send"
                >
                  <Send01 className="size-5" strokeWidth={2} />
                </button>
              ) : (
                <button
                  type="button"
                  className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--samba-border)] bg-white transition hover:bg-[color:var(--samba-surface)] disabled:opacity-55"
                  aria-label="Record voice note"
                  disabled={uploading}
                  onClick={() => void startRecording()}
                >
                  <Microphone01 className="size-5" strokeWidth={1.75} />
                </button>
              )}
            </form>
          )}

          {error ? (
            <p className="px-1 pt-2 text-sm text-[#B45309]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
