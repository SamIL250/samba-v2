"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { formatRelative } from "@/lib/theme";

export default function WallPage() {
  const moments = useQuery(api.moments.listPublic, { limit: 40 });

  if (moments === undefined) {
    return (
      <p className="animate-pulse text-sm opacity-60">Opening the wall…</p>
    );
  }

  if (moments.length === 0) {
    return (
      <div className="samba-fade-up flex min-h-[60vh] items-center justify-center">
        <EmptyState
          title="Quiet for now"
          body="When a couple shares a moment publicly, it blooms here — soft glances only, no comments yet."
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
    <div className="samba-fade-up space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
          Public wall
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">
          Other couples waving
        </h1>
      </div>

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
              {moment.caption ? (
                <p className="text-sm leading-relaxed">{moment.caption}</p>
              ) : null}
              <p className="text-[10px] text-[color:var(--samba-ink)]/40">
                {formatRelative(moment.publishedAt ?? moment.createdAt)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
