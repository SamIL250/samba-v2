"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import {
  DotsHorizontal,
  Home01,
  Image01,
  MessageChatCircle,
  PuzzlePiece01,
} from "@untitledui/icons";
import type { ComponentType, SVGProps } from "react";
import { api } from "@/lib/api";

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const LINKS: {
  href: string;
  label: string;
  Icon: IconType;
  match?: (pathname: string) => boolean;
}[] = [
  { href: "/home", label: "Home", Icon: Home01 },
  { href: "/chat", label: "Chat", Icon: MessageChatCircle },
  { href: "/play", label: "Play", Icon: PuzzlePiece01 },
  { href: "/moments", label: "Moments", Icon: Image01 },
  {
    href: "/more",
    label: "More",
    Icon: DotsHorizontal,
    match: (pathname) =>
      pathname === "/more" ||
      pathname.startsWith("/more/") ||
      pathname === "/wall" ||
      pathname.startsWith("/wall/") ||
      pathname === "/couple" ||
      pathname.startsWith("/couple/"),
  },
];

export function AppBottomNav() {
  const pathname = usePathname();
  const inbox = useQuery(api.signals.inbox);
  const signalBadge = inbox?.unreadCount ?? 0;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--samba-border)] backdrop-blur-md md:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        background:
          "color-mix(in srgb, var(--samba-elevated) 94%, transparent)",
      }}
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 pt-2 pb-2">
        {LINKS.map(({ href, label, Icon, match }) => {
          const active = match
            ? match(pathname)
            : pathname === href || pathname.startsWith(`${href}/`);
          const showBadge = href === "/chat" && signalBadge > 0;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-semibold tracking-tight transition ${
                  active
                    ? "text-[color:var(--samba-ink)]"
                    : "text-[color:var(--samba-muted)]"
                }`}
              >
                <span
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full ${
                    active
                      ? "bg-[color:var(--samba-bubble-out)] text-[color:var(--samba-bubble-out-text)]"
                      : "bg-transparent"
                  }`}
                >
                  <Icon
                    className="size-5"
                    strokeWidth={active ? 2.25 : 1.75}
                  />
                  {showBadge ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--samba-ink)] px-1 text-[9px] font-bold text-white">
                      {signalBadge > 9 ? "9+" : signalBadge}
                    </span>
                  ) : null}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
