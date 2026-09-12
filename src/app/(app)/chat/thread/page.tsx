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
  Download01,
  FaceSmile,
  File04,
  Image01,
  Microphone01,
  Palette,
  Plus,
  Send01,
  Trash01,
  XClose,
} from "@untitledui/icons";
import EmojiPicker, { Theme as EmojiTheme } from "emoji-picker-react";
import { api, type Id } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { ChatThreadSkeleton } from "@/components/skeletons";
import { uploadToCloudinary } from "@/lib/cloudinary";
import {
  CHAT_BACKGROUNDS,
  chatBackgroundStyle,
  isChatBackgroundKey,
  type ChatBackgroundKey,
} from "@/lib/chatBackgrounds";
import { formatRelative, THEMES, type ThemeKey } from "@/lib/theme";

type MediaKind = "image" | "audio" | "file";

const COMPOSER_MAX_HEIGHT = 120;

type ReplyDraft = {
  id: Id<"messages">;
  preview: string;
  senderName: string;
};

async function downloadMedia(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

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
  const updateProfile = useMutation(api.couples.updateProfile);

  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyDraft | null>(null);
  const [menuId, setMenuId] = useState<Id<"messages"> | null>(null);
  const [appearOpen, setAppearOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [highlightId, setHighlightId] = useState<Id<"messages"> | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiPanelRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const appearPanelRef = useRef<HTMLDivElement>(null);
  const appearButtonRef = useRef<HTMLButtonElement>(null);
  const messageRefs = useRef<Map<string, HTMLElement>>(new Map());
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressOrigin = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
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
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      const target = e.target;
      if (!(target instanceof Node)) return;

      if (
        emojiOpen &&
        (emojiPanelRef.current?.contains(target) ||
          emojiButtonRef.current?.contains(target))
      ) {
        return;
      }

      if (
        appearOpen &&
        (appearPanelRef.current?.contains(target) ||
          appearButtonRef.current?.contains(target))
      ) {
        return;
      }

      if (menuId) {
        const openMenu = document.querySelector(
          `[data-message-menu="${menuId}"]`,
        );
        const openTrigger = document.querySelector(
          `[data-message-menu-trigger="${menuId}"]`,
        );
        if (
          openMenu?.contains(target) ||
          openTrigger?.contains(target)
        ) {
          return;
        }
      }

      setMenuId(null);
      setAppearOpen(false);
      if (emojiOpen) setEmojiOpen(false);
    }
    if (!menuId && !appearOpen && !emojiOpen) return;
    // Defer so the opening click doesn't immediately close the picker
    const id = window.setTimeout(() => {
      document.addEventListener("pointerdown", onDocPointerDown);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", onDocPointerDown);
    };
  }, [menuId, appearOpen, emojiOpen]);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: Event) {
      if ((e as globalThis.KeyboardEvent).key === "Escape") setLightbox(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox]);

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

  const currentTheme = (couple?.couple.theme ?? "ocean") as ThemeKey;
  const rawBackground = couple?.couple.chatBackground ?? "none";
  const chatBackground: ChatBackgroundKey = isChatBackgroundKey(rawBackground)
    ? rawBackground
    : "none";

  async function onThemePick(theme: ThemeKey) {
    try {
      await updateProfile({ theme });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t update theme");
    }
  }

  async function onBackgroundPick(chatBackground: ChatBackgroundKey) {
    try {
      await updateProfile({ chatBackground });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn’t update background",
      );
    }
  }

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

  function insertEmoji(emoji: string) {
    const el = inputRef.current;
    if (!el) {
      onTyping(text + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    onTyping(next);
    window.requestAnimationFrame(() => {
      const pos = start + emoji.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressOrigin.current = null;
  }

  function beginLongPress(
    messageId: Id<"messages">,
    clientX: number,
    clientY: number,
  ) {
    clearLongPress();
    longPressOrigin.current = { x: clientX, y: clientY };
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      longPressOrigin.current = null;
      setAppearOpen(false);
      setEmojiOpen(false);
      setMenuId(messageId);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
      }
    }, 480);
  }

  function scrollToMessage(messageId: Id<"messages">) {
    const el = messageRefs.current.get(messageId);
    const list = listRef.current;
    if (!el) {
      setError("That message isn’t available here anymore");
      window.setTimeout(() => setError(null), 2500);
      return;
    }
    if (list) {
      const listRect = list.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      list.scrollTop +=
        elRect.top - listRect.top - listRect.height / 2 + elRect.height / 2;
    }
    setHighlightId(messageId);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(null), 1800);
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
    return <ChatThreadSkeleton />;
  }

  if (!conversation) {
    return (
      <div className="bg-[color:var(--samba-elevated)] px-4 py-8">
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
    <div className="fixed inset-0 z-10 flex flex-col overflow-hidden bg-[color:var(--samba-chat-chrome)]">
      <header className="relative z-30 flex shrink-0 items-center gap-3 border-b border-[color:var(--samba-border)] bg-[color:var(--samba-chat-chrome)] px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-4">
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

        <div className="relative shrink-0">
          <button
            ref={appearButtonRef}
            type="button"
            className={`flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[color:var(--samba-surface)] ${
              appearOpen ? "bg-[color:var(--samba-surface)]" : ""
            }`}
            aria-label="Chat appearance"
            aria-expanded={appearOpen}
            onClick={(e) => {
              e.stopPropagation();
              setMenuId(null);
              setAppearOpen((o) => !o);
            }}
          >
            <Palette className="size-5" strokeWidth={1.75} />
          </button>

          {appearOpen ? (
            <div
              ref={appearPanelRef}
              className="absolute right-0 top-12 z-40 w-[min(18.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-[color:var(--samba-border)] bg-[color:var(--samba-elevated)] p-3 shadow-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="px-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--samba-muted)]">
                Theme
              </p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
                  const t = THEMES[key];
                  const selected = currentTheme === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      title={t.label}
                      className="flex flex-col items-center gap-1"
                      onClick={() => void onThemePick(key)}
                    >
                      <span
                        className="relative block h-10 w-10 overflow-hidden rounded-full border-2"
                        style={{
                          borderColor: selected ? t.accent : "transparent",
                          background: t.gradient,
                          boxShadow: selected
                            ? `0 0 0 1.5px ${t.accent}`
                            : undefined,
                        }}
                      >
                        <span
                          className="absolute bottom-0 left-0 right-0 h-1/2"
                          style={{ background: t.bubbleOut }}
                          aria-hidden
                        />
                        <span
                          className="absolute right-1.5 top-1.5 h-3 w-3 rounded-full"
                          style={{ background: t.accent }}
                          aria-hidden
                        />
                      </span>
                      <span className="text-[10px] font-semibold text-[color:var(--samba-ink)]">
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 px-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--samba-muted)]">
                Background
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(Object.keys(CHAT_BACKGROUNDS) as ChatBackgroundKey[]).map(
                  (key) => {
                    const bg = CHAT_BACKGROUNDS[key];
                    const selected = chatBackground === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`overflow-hidden rounded-xl border-2 text-left transition ${
                          selected
                            ? "border-[color:var(--samba-accent)]"
                            : "border-[color:var(--samba-border)] hover:border-[color:var(--samba-accent)]/50"
                        }`}
                        onClick={() => void onBackgroundPick(key)}
                      >
                        <span
                          className="block h-12 w-full"
                          style={chatBackgroundStyle(key)}
                          aria-hidden
                        />
                        <span className="block px-1.5 py-1 text-[10px] font-semibold leading-tight text-[color:var(--samba-ink)]">
                          {bg.label}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        style={chatBackgroundStyle(chatBackground)}
      >
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
                  ref={(node) => {
                    if (node) messageRefs.current.set(message._id, node);
                    else messageRefs.current.delete(message._id);
                  }}
                  className={`group relative flex items-end gap-2 rounded-2xl transition ${
                    mine ? "justify-end" : "justify-start"
                  } ${
                    highlightId === message._id
                      ? "samba-message-highlight"
                      : ""
                  }`}
                >
                  {!mine ? (
                    <span
                      aria-hidden
                      className="mb-1 h-7 w-1 shrink-0 rounded-full"
                      style={{ background: accent }}
                    />
                  ) : null}

                  <div
                    className="relative min-w-0 max-w-[min(78%,24rem)] touch-manipulation"
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      beginLongPress(message._id, e.clientX, e.clientY);
                    }}
                    onPointerUp={clearLongPress}
                    onPointerCancel={clearLongPress}
                    onPointerMove={(e) => {
                      const origin = longPressOrigin.current;
                      if (!origin) return;
                      const dx = Math.abs(e.clientX - origin.x);
                      const dy = Math.abs(e.clientY - origin.y);
                      if (dx > 10 || dy > 10) clearLongPress();
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      clearLongPress();
                      setAppearOpen(false);
                      setEmojiOpen(false);
                      setMenuId(message._id);
                    }}
                  >
                    <button
                      type="button"
                      data-message-menu-trigger={message._id}
                      className={`absolute top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--samba-elevated)] shadow-sm transition ${
                        mine ? "-left-9" : "-right-9"
                      } ${
                        menuOpen
                          ? "opacity-100"
                          : "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                      }`}
                      aria-label="Message actions"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearLongPress();
                        setMenuId(menuOpen ? null : message._id);
                      }}
                    >
                      <DotsHorizontal className="size-4" strokeWidth={2} />
                    </button>

                    {menuOpen ? (
                      <div
                        data-message-menu={message._id}
                        className={`absolute z-20 min-w-[11rem] overflow-hidden rounded-xl border border-[color:var(--samba-border)] bg-[color:var(--samba-elevated)] py-1 text-sm shadow-sm ${
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
                          ? "rounded-[1.15rem] rounded-br-md bg-[color:var(--samba-bubble-out)] text-[color:var(--samba-bubble-out-text)]"
                          : "rounded-[1.15rem] rounded-bl-md bg-[color:var(--samba-bubble-in)] text-[color:var(--samba-ink)]"
                      }`}
                    >
                      {message.replyTo ? (
                        <button
                          type="button"
                          className={`mb-2 w-full rounded-lg border-l-2 px-2 py-1.5 text-left text-xs transition hover:brightness-95 ${
                            mine
                              ? "border-[color:var(--samba-accent)] bg-[color:var(--samba-ink)]/10"
                              : "border-[color:var(--samba-accent)] bg-black/5"
                          }`}
                          onClick={() => scrollToMessage(message.replyTo!._id)}
                          aria-label={`Go to message from ${message.replyTo.senderName}`}
                        >
                          <p className="font-semibold text-[color:var(--samba-accent)]">
                            {message.replyTo.senderName}
                          </p>
                          <p
                            className={`truncate ${mine ? "text-white/70" : "text-[color:var(--samba-muted)]"}`}
                          >
                            {message.replyTo.preview}
                          </p>
                        </button>
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
                            <div className="group/image relative">
                              <button
                                type="button"
                                className="block w-full overflow-hidden text-left"
                                onClick={() =>
                                  setLightbox({
                                    url: message.media!.secureUrl,
                                    name: `samba-${message._id}.jpg`,
                                  })
                                }
                                aria-label="View photo"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={message.media.secureUrl}
                                  alt=""
                                  className={`max-h-64 w-full object-cover transition group-hover/image:brightness-95 ${
                                    message.body
                                      ? "mb-1.5 rounded-xl"
                                      : "rounded-[0.95rem]"
                                  }`}
                                />
                              </button>
                              <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover/image:opacity-100">
                                <button
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
                                  aria-label="Download photo"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void downloadMedia(
                                      message.media!.secureUrl,
                                      `samba-${message._id}.jpg`,
                                    );
                                  }}
                                >
                                  <Download01
                                    className="size-4"
                                    strokeWidth={2}
                                  />
                                </button>
                              </div>
                              {!message.body ? (
                                <time
                                  dateTime={new Date(
                                    message.createdAt,
                                  ).toISOString()}
                                  className="pointer-events-none absolute bottom-1.5 right-2 rounded-md bg-black/35 px-1.5 py-0.5 text-[10px] leading-none tabular-nums text-white/95"
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
                                  ? "text-[color:var(--samba-bubble-out-text)]"
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

      <div className="shrink-0 border-t border-[color:var(--samba-border)] bg-[color:var(--samba-chat-chrome)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
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
                className="rounded-full p-1 hover:bg-[color:var(--samba-surface)]"
                aria-label="Cancel reply"
                onClick={() => setReplyTo(null)}
              >
                <XClose className="size-4" strokeWidth={2} />
              </button>
            </div>
          ) : null}

          {attachOpen ? (
            <div className="samba-attach-toolbar absolute bottom-full left-2.5 mb-2 flex gap-2 rounded-2xl border border-[color:var(--samba-border)] bg-[color:var(--samba-elevated)] p-2 sm:left-4">
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
            <form onSubmit={onSend} className="relative flex items-end gap-2">
              <button
                type="button"
                className="relative mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--samba-border)] bg-[color:var(--samba-elevated)] transition hover:bg-[color:var(--samba-surface)] disabled:opacity-55"
                aria-label={attachOpen ? "Close attach menu" : "Attach"}
                aria-expanded={attachOpen}
                disabled={uploading}
                onClick={() => {
                  setEmojiOpen(false);
                  setAttachOpen((o) => !o);
                }}
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

              <div className="relative min-w-0 flex-1">
                {emojiOpen ? (
                  <div
                    ref={emojiPanelRef}
                    className="absolute bottom-full left-0 z-30 mb-2 rounded-2xl border border-[color:var(--samba-border)] bg-[color:var(--samba-elevated)] shadow-sm"
                  >
                    <EmojiPicker
                      theme={EmojiTheme.LIGHT}
                      width={Math.min(320, typeof window !== "undefined" ? window.innerWidth - 32 : 320)}
                      height={360}
                      previewConfig={{ showPreview: false }}
                      onEmojiClick={(emojiData) => {
                        insertEmoji(emojiData.emoji);
                      }}
                    />
                  </div>
                ) : null}
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    className="samba-input samba-composer-input min-h-[2.75rem] w-full resize-none overflow-hidden pr-11"
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
                  <button
                    ref={emojiButtonRef}
                    type="button"
                    className={`absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition ${
                      emojiOpen
                        ? "bg-[color:var(--samba-surface)] text-[color:var(--samba-accent)]"
                        : "text-[color:var(--samba-muted)] hover:bg-[color:var(--samba-surface)] hover:text-[color:var(--samba-ink)]"
                    }`}
                    aria-label="Emoji"
                    aria-expanded={emojiOpen}
                    disabled={uploading}
                    onClick={() => {
                      setAttachOpen(false);
                      setEmojiOpen((o) => !o);
                    }}
                  >
                    <FaceSmile className="size-5" strokeWidth={1.75} />
                  </button>
                </div>
              </div>

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
                  className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--samba-border)] bg-[color:var(--samba-elevated)] transition hover:bg-[color:var(--samba-surface)] disabled:opacity-55"
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

      {lightbox ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={() => setLightbox(null)}
        >
          <div className="absolute right-4 top-4 flex gap-2">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              aria-label="Download photo"
              onClick={(e) => {
                e.stopPropagation();
                void downloadMedia(lightbox.url, lightbox.name);
              }}
            >
              <Download01 className="size-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              aria-label="Close"
              onClick={() => setLightbox(null)}
            >
              <XClose className="size-5" strokeWidth={2} />
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt=""
            className="max-h-[90vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
