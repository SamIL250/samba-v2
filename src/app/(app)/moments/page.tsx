"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Camera01,
  DotsHorizontal,
  Flash,
  Plus,
  Trash01,
} from "@untitledui/icons";
import { api, type Id } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { formatRelative } from "@/lib/theme";
import { MomentsSkeleton } from "@/components/skeletons";

const GRID_SPANS = [
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-1 row-span-1",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
] as const;

function gridSpanForIndex(index: number): string {
  return GRID_SPANS[index % GRID_SPANS.length]!;
}

export default function MomentsPage() {
  const moments = useQuery(api.moments.listMine);
  const setVisibility = useMutation(api.moments.setVisibility);
  const remove = useMutation(api.moments.remove);
  const [menuId, setMenuId] = useState<Id<"moments"> | null>(null);

  useEffect(() => {
    function onDocClick() {
      setMenuId(null);
    }
    if (!menuId) return;
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuId]);

  if (moments === undefined) {
    return <MomentsSkeleton />;
  }

  if (moments.length === 0) {
    return (
      <div className="samba-fade-up flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <EmptyState
          title="No moments yet"
          body="Capture a tiny chapter — a meal, a laugh, a walk. Private by default; flip one public when you want other couples to peek."
          illustration="/brand/moments/moments-empty.png"
          illustrationAlt=""
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link href="/moments/instant" className="samba-btn">
                Instant moment
              </Link>
              <Link href="/moments/new" className="samba-btn-ghost">
                Full moment
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="samba-fade-up space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
            Moments
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
            Yours, together
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/moments/instant"
            className="samba-btn-ghost inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm"
          >
            <Flash className="size-4" strokeWidth={1.75} />
            Instant
          </Link>
          <Link
            href="/moments/new"
            className="samba-btn inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm"
          >
            <Plus className="size-4" strokeWidth={2} />
            New
          </Link>
        </div>
      </div>

      <div className="grid auto-rows-[7.5rem] grid-cols-2 gap-2 sm:auto-rows-[9rem] sm:grid-cols-3 sm:gap-2.5 md:auto-rows-[10rem]">
        {moments.map((moment, index) => {
          const media = moment.media[0];
          const isVideo = media?.resourceType === "video";
          const menuOpen = menuId === moment._id;
          return (
            <article
              key={moment._id}
              className={`group relative overflow-hidden rounded-2xl bg-[color:var(--samba-surface)] ${gridSpanForIndex(index)}`}
            >
              {media ? (
                isVideo ? (
                  <video
                    src={media.secureUrl}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={media.secureUrl}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[color:var(--samba-accent)]/15 px-3 text-center text-xs font-semibold text-[color:var(--samba-ink)]/55">
                  {moment.caption || "Moment"}
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />

              <div className="absolute right-2 top-2 z-10">
                <button
                  type="button"
                  className={`flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--samba-elevated)] text-[color:var(--samba-ink)] shadow-sm transition ${
                    menuOpen
                      ? "opacity-100"
                      : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                  }`}
                  aria-label="Moment options"
                  aria-expanded={menuOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuId(menuOpen ? null : moment._id);
                  }}
                >
                  <DotsHorizontal className="size-4" strokeWidth={2} />
                </button>

                {menuOpen ? (
                  <div
                    className="absolute right-0 top-10 min-w-[10.5rem] overflow-hidden rounded-xl border border-[color:var(--samba-border)] bg-[color:var(--samba-elevated)] py-1 text-sm shadow-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--samba-muted)]">
                      {moment.visibility === "public" ? "Public" : "Private"}
                      {" · "}
                      {formatRelative(moment.createdAt)}
                    </p>
                    {moment.caption ? (
                      <p className="line-clamp-2 border-b border-[color:var(--samba-border)] px-3 py-2 text-xs text-[color:var(--samba-ink)]/70">
                        {moment.caption}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[color:var(--samba-surface)]"
                      onClick={() => {
                        setMenuId(null);
                        void setVisibility({
                          momentId: moment._id,
                          visibility:
                            moment.visibility === "public"
                              ? "private"
                              : "public",
                        });
                      }}
                    >
                      Make{" "}
                      {moment.visibility === "public" ? "private" : "public"}
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#B45309] hover:bg-[color:var(--samba-surface)]"
                      onClick={() => {
                        setMenuId(null);
                        void remove({ momentId: moment._id });
                      }}
                    >
                      <Trash01 className="size-4" strokeWidth={1.75} />
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>

              {isVideo ? (
                <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Video
                </span>
              ) : null}
            </article>
          );
        })}

        <Link
          href="/moments/instant"
          className="col-span-1 row-span-1 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[color:var(--samba-border-strong)] bg-[color:var(--samba-surface)] text-[color:var(--samba-muted)] transition hover:border-[color:var(--samba-accent)] hover:text-[color:var(--samba-ink)]"
        >
          <Camera01 className="size-6" strokeWidth={1.75} />
          <span className="text-xs font-semibold">Instant</span>
        </Link>
      </div>
    </div>
  );
}
