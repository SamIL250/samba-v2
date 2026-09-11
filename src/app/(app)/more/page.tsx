"use client";

import Link from "next/link";
import { LayoutGrid01, Users01 } from "@untitledui/icons";

const ITEMS = [
  {
    href: "/wall",
    title: "Wall",
    body: "See public moments from other couples — like, wave, and leave a soft note.",
    Icon: LayoutGrid01,
  },
  {
    href: "/couple",
    title: "Couple profile",
    body: "Manage your names, couple name, theme, and shared details.",
    Icon: Users01,
  },
] as const;

export default function MorePage() {
  return (
    <div className="samba-fade-up mx-auto max-w-lg space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
          More
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
          Extra space
        </h1>
        <p className="mt-2 text-sm text-[color:var(--samba-muted)]">
          Wall and your couple settings live here.
        </p>
      </div>

      <div className="space-y-3">
        {ITEMS.map(({ href, title, body, Icon }) => (
          <Link
            key={href}
            href={href}
            className="samba-panel flex items-start gap-4 p-5 transition hover:border-[color:var(--samba-accent)]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--samba-surface)]">
              <Icon className="size-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
                {title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[color:var(--samba-ink)]/65">
                {body}
              </p>
            </div>
            <span
              aria-hidden
              className="mt-1 text-[color:var(--samba-muted)]"
            >
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
