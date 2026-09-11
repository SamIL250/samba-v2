"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { formatRelative } from "@/lib/theme";

const MOOD_LABEL: Record<string, string> = {
  cozy: "Cozy",
  adventure: "Adventure",
  silly: "Silly",
  romantic: "Romantic",
  grateful: "Grateful",
  wild: "Wild",
};

export default function MomentsPage() {
  const moments = useQuery(api.moments.listMine);
  const setVisibility = useMutation(api.moments.setVisibility);
  const remove = useMutation(api.moments.remove);

  if (moments === undefined) {
    return <p className="animate-pulse text-sm opacity-60">Gathering moments…</p>;
  }

  return (
    <div className="samba-fade-up space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
            Moments
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] font-bold tracking-tight text-4xl">
            Yours, together
          </h1>
          <p className="mt-2 max-w-md text-[color:var(--samba-ink)]/65">
            Private by default. Flip any moment public when you want other couples to peek.
          </p>
        </div>
        <Link href="/moments/new" className="samba-btn">
          New moment
        </Link>
      </div>

      {moments.length === 0 ? (
        <EmptyState
          title="No moments yet"
          body="Capture a tiny chapter — a meal, a laugh, a walk. You two will thank yourselves later."
          illustration="/brand/moments/moments-empty.png"
          illustrationAlt=""
          action={
            <Link href="/moments/new" className="samba-btn">
              Create one
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {moments.map((moment) => (
            <article
              key={moment._id}
              className="samba-panel overflow-hidden"
            >
              {moment.media[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={moment.media[0].secureUrl}
                  alt=""
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="aspect-[4/3] w-full bg-[color:var(--samba-accent)]/10" />
              )}
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="rounded-full bg-[color:var(--samba-accent)]/10 px-2.5 py-1 font-semibold text-[color:var(--samba-accent)]">
                    {moment.visibility === "public" ? "Public" : "Private"}
                    {moment.mood ? ` · ${MOOD_LABEL[moment.mood] ?? moment.mood}` : ""}
                  </span>
                  <span className="text-[color:var(--samba-ink)]/45">
                    {formatRelative(moment.createdAt)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{moment.caption || "Untitled moment"}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="samba-btn-ghost px-3 py-1.5 text-xs"
                    onClick={() =>
                      void setVisibility({
                        momentId: moment._id,
                        visibility:
                          moment.visibility === "public" ? "private" : "public",
                      })
                    }
                  >
                    Make {moment.visibility === "public" ? "private" : "public"}
                  </button>
                  <button
                    type="button"
                    className="samba-btn-ghost px-3 py-1.5 text-xs"
                    onClick={() => void remove({ momentId: moment._id })}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
