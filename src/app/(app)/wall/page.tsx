"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
  type KeyboardEvent,
} from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Bookmark,
  Heart,
  MessageCircle01,
  Stars01,
  XClose,
} from "@untitledui/icons";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { formatRelative } from "@/lib/theme";

type WallPost = NonNullable<
  ReturnType<typeof useQuery<typeof api.wall.feed>>
>[number];

function WaveIcon({ className, strokeWidth = 1.75 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M7.5 14.5c.8 2.2 2.7 3.7 5 3.7 2.6 0 4.7-1.8 5.3-4.2.3-1.1-.2-2.2-1.2-2.7-.7-.4-1.5-.2-2 .3l-.6.6c-.4.4-1 .4-1.4 0l-.8-.8c-.5-.5-1.3-.5-1.8 0l-.3.3c-.4.4-1 .4-1.4 0l-.4-.4c-.6-.6-1.6-.5-2.1.2-.7.9-.6 2.2.7 3Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8.5c.4-1.8 1.9-3.2 3.8-3.5M12.5 4.8c1.2-.2 2.4.1 3.4.8M16.8 6.8c1 .8 1.6 2 1.7 3.2"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

function WallPostCard({
  post,
  onOpenMedia,
}: {
  post: WallPost;
  onOpenMedia: (url: string, kind: "image" | "video") => void;
}) {
  const toggleLike = useMutation(api.wall.toggleLike);
  const toggleBookmark = useMutation(api.wall.toggleBookmark);
  const toggleCheer = useMutation(api.wall.toggleCheer);
  const addComment = useMutation(api.wall.addComment);
  const removeComment = useMutation(api.wall.removeComment);

  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const media = post.media.find(Boolean);
  const isVideo = media?.resourceType === "video";

  async function onLike() {
    try {
      await toggleLike({ momentId: post._id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t like");
    }
  }

  async function onBookmark() {
    try {
      await toggleBookmark({ momentId: post._id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t bookmark");
    }
  }

  async function onCheer(kind: "wave" | "bloom") {
    try {
      await toggleCheer({ momentId: post._id, kind });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t send that");
    }
  }

  async function onComment(e?: FormEvent) {
    e?.preventDefault();
    if (!comment.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await addComment({ momentId: post._id, body: comment });
      setComment("");
      setShowComments(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t comment");
    } finally {
      setBusy(false);
    }
  }

  function onCommentKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onComment();
    }
  }

  return (
    <article className="overflow-hidden rounded-[1.35rem] border border-[color:var(--samba-border)] bg-white shadow-[0_1px_0_rgba(26,23,20,0.03)]">
      <header className="flex items-center gap-3 px-4 py-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-[color:var(--samba-bubble-out-text)]"
          style={{ background: "var(--samba-bubble-out)" }}
        >
          {(post.coupleName[0] ?? "C").toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-tight">
            {post.coupleName}
          </p>
          <p className="text-[11px] text-[color:var(--samba-muted)]">
            {formatRelative(post.publishedAt ?? post.createdAt)}
            {post.mood ? ` · ${post.mood}` : ""}
          </p>
        </div>
      </header>

      {media ? (
        <button
          type="button"
          className="relative block w-full bg-[color:var(--samba-surface)]"
          onClick={() =>
            onOpenMedia(media.secureUrl, isVideo ? "video" : "image")
          }
          aria-label="View full size"
        >
          {isVideo ? (
            <video
              src={media.secureUrl}
              className="aspect-square w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.secureUrl}
              alt=""
              className="aspect-square w-full object-cover"
            />
          )}
        </button>
      ) : (
        <div className="flex aspect-square items-center justify-center bg-[color:var(--samba-surface)] px-6 text-center text-sm text-[color:var(--samba-muted)]">
          {post.caption || "A shared moment"}
        </div>
      )}

      <div className="space-y-3 px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={`rounded-full p-2 transition hover:bg-[color:var(--samba-surface)] ${
              post.likedByMe ? "text-[#C45C5C]" : "text-[color:var(--samba-ink)]"
            }`}
            aria-label={post.likedByMe ? "Unlike" : "Like"}
            onClick={() => void onLike()}
          >
            <Heart
              className="size-6"
              strokeWidth={post.likedByMe ? 0 : 1.75}
              fill={post.likedByMe ? "currentColor" : "none"}
            />
          </button>
          <button
            type="button"
            className="rounded-full p-2 text-[color:var(--samba-ink)] transition hover:bg-[color:var(--samba-surface)]"
            aria-label="Comments"
            onClick={() => setShowComments((o) => !o)}
          >
            <MessageCircle01 className="size-6" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={`rounded-full p-2 transition hover:bg-[color:var(--samba-surface)] ${
              post.wavedByMe
                ? "text-[color:var(--samba-accent)]"
                : "text-[color:var(--samba-ink)]"
            }`}
            aria-label="Wave"
            title="Send a wave"
            onClick={() => void onCheer("wave")}
          >
            <WaveIcon className="size-6" />
          </button>
          <button
            type="button"
            className={`rounded-full p-2 transition hover:bg-[color:var(--samba-surface)] ${
              post.bloomedByMe
                ? "text-[color:var(--samba-accent)]"
                : "text-[color:var(--samba-ink)]"
            }`}
            aria-label="Bloom"
            title="Send a bloom"
            onClick={() => void onCheer("bloom")}
          >
            <Stars01
              className="size-6"
              strokeWidth={1.75}
              fill={post.bloomedByMe ? "currentColor" : "none"}
            />
          </button>
          <button
            type="button"
            className={`ml-auto rounded-full p-2 transition hover:bg-[color:var(--samba-surface)] ${
              post.bookmarkByMe
                ? "text-[color:var(--samba-ink)]"
                : "text-[color:var(--samba-ink)]"
            }`}
            aria-label={post.bookmarkByMe ? "Remove bookmark" : "Bookmark"}
            onClick={() => void onBookmark()}
          >
            <Bookmark
              className="size-6"
              strokeWidth={post.bookmarkByMe ? 0 : 1.75}
              fill={post.bookmarkByMe ? "currentColor" : "none"}
            />
          </button>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-[color:var(--samba-ink)]/70">
          {post.likeCount > 0 ? (
            <span>
              {post.likeCount} {post.likeCount === 1 ? "like" : "likes"}
            </span>
          ) : null}
          {post.waveCount > 0 ? (
            <span>
              {post.waveCount} {post.waveCount === 1 ? "wave" : "waves"}
            </span>
          ) : null}
          {post.bloomCount > 0 ? (
            <span>
              {post.bloomCount} {post.bloomCount === 1 ? "bloom" : "blooms"}
            </span>
          ) : null}
        </div>

        {post.caption ? (
          <p className="text-sm leading-relaxed">
            <span className="font-semibold">{post.coupleName}</span>{" "}
            <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {post.caption}
            </span>
          </p>
        ) : null}

        {post.commentCount > 0 && !showComments ? (
          <button
            type="button"
            className="text-sm text-[color:var(--samba-muted)]"
            onClick={() => setShowComments(true)}
          >
            View {post.commentCount === 1 ? "1 comment" : `all ${post.commentCount} comments`}
          </button>
        ) : null}

        {showComments ? (
          <div className="space-y-2 border-t border-[color:var(--samba-border)] pt-3">
            {post.comments.length === 0 ? (
              <p className="text-xs text-[color:var(--samba-muted)]">
                Be the first to leave a soft note.
              </p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto">
                {post.comments.map((c) => (
                  <li key={c._id} className="text-sm leading-snug">
                    <span className="font-semibold">{c.authorName}</span>{" "}
                    <span className="break-words [overflow-wrap:anywhere]">
                      {c.body}
                    </span>
                    <span className="ml-2 text-[10px] text-[color:var(--samba-muted)]">
                      {formatRelative(c.createdAt)}
                    </span>
                    {c.mine ? (
                      <button
                        type="button"
                        className="ml-2 text-[10px] font-semibold text-[#B45309]"
                        onClick={() =>
                          void removeComment({ commentId: c._id })
                        }
                      >
                        Remove
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <form
          onSubmit={(e) => void onComment(e)}
          className="flex items-center gap-2 border-t border-[color:var(--samba-border)] pt-3"
        >
          <input
            className="samba-input flex-1 py-2.5 text-sm"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={onCommentKey}
            placeholder="Add a soft comment…"
            disabled={busy}
            aria-label="Comment"
          />
          <button
            type="submit"
            className="text-sm font-bold text-[color:var(--samba-accent)] disabled:opacity-40"
            disabled={busy || !comment.trim()}
          >
            Post
          </button>
        </form>

        {error ? (
          <p className="text-xs text-[#B45309]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default function WallPage() {
  const posts = useQuery(api.wall.feed, { limit: 40 });
  const [lightbox, setLightbox] = useState<{
    url: string;
    kind: "image" | "video";
  } | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: Event) {
      if ((e as globalThis.KeyboardEvent).key === "Escape") setLightbox(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox]);

  if (posts === undefined) {
    return (
      <p className="animate-pulse text-sm opacity-60">Opening the wall…</p>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="samba-fade-up flex min-h-[60vh] items-center justify-center">
        <EmptyState
          title="Quiet for now"
          body="When a couple shares a moment publicly, it blooms here for soft likes, waves, and notes."
          illustration="/brand/wall/wall-empty.png"
          illustrationAlt=""
          action={
            <Link href="/moments" className="samba-btn">
              Go to Moments
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="samba-fade-up mx-auto max-w-lg space-y-5 pb-4">
        <div className="flex items-start gap-3 px-1">
          <Link
            href="/more"
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-white/70 md:hidden"
            aria-label="Back to more"
          >
            <ArrowLeft className="size-5" strokeWidth={2} />
          </Link>
          <div className="min-w-0 flex-1 text-center sm:text-left md:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
              Public wall
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
              Other couples waving
            </h1>
          </div>
        </div>

        <div className="space-y-6">
          {posts.map((post) => (
            <WallPostCard
              key={post._id}
              post={post}
              onOpenMedia={(url, kind) => setLightbox({ url, kind })}
            />
          ))}
        </div>
      </div>

      {lightbox ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Large media view"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            aria-label="Close"
            onClick={() => setLightbox(null)}
          >
            <XClose className="size-5" strokeWidth={2} />
          </button>
          <div
            className="max-h-[90vh] max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {lightbox.kind === "video" ? (
              <video
                src={lightbox.url}
                className="max-h-[90vh] w-full rounded-xl object-contain"
                controls
                autoPlay
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightbox.url}
                alt=""
                className="max-h-[90vh] w-full rounded-xl object-contain"
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
