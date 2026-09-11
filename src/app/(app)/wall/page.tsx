"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { formatRelative } from "@/lib/theme";

export default function WallPage() {
  const moments = useQuery(api.moments.listPublic, { limit: 40 });

  if (moments === undefined) {
    return <p className="animate-pulse text-sm opacity-60">Opening the wall…</p>;
  }

  return (
    <div className="samba-fade-up space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
          Public wall
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] font-bold tracking-tight text-4xl">
          Other couples waving
        </h1>
        <p className="mt-2 max-w-lg text-[color:var(--samba-ink)]/65">
          Only moments couples chose to share. Soft glances — no comments yet.
        </p>
      </div>

      {moments.length === 0 ? (
        <EmptyState
          title="Quiet for now"
          body="When a couple publishes a moment, it will bloom here. You can be the first."
        />
      ) : (
        <div className="columns-1 gap-4 sm:columns-2">
          {moments.map((moment) => (
            <article
              key={moment._id}
              className="samba-panel mb-4 break-inside-avoid overflow-hidden"
            >
              {moment.media[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={moment.media[0].secureUrl}
                  alt=""
                  className="w-full object-cover"
                />
              ) : null}
              <div className="space-y-2 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--samba-accent)]">
                  {moment.coupleName}
                  {moment.mood ? ` · ${moment.mood}` : ""}
                </p>
                <p className="text-sm leading-relaxed">{moment.caption}</p>
                <p className="text-[10px] text-[color:var(--samba-ink)]/40">
                  {formatRelative(moment.publishedAt ?? moment.createdAt)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
