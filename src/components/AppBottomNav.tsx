"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home01,
  Image01,
  LayoutGrid01,
  MessageChatCircle,
  PuzzlePiece01,
} from "@untitledui/icons";
import type { ComponentType, SVGProps } from "react";

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const LINKS: {
  href: string;
  label: string;
  Icon: IconType;
}[] = [
  { href: "/home", label: "Home", Icon: Home01 },
  { href: "/chat", label: "Chat", Icon: MessageChatCircle },
  { href: "/play", label: "Play", Icon: PuzzlePiece01 },
  { href: "/moments", label: "Moments", Icon: Image01 },
  { href: "/wall", label: "Wall", Icon: LayoutGrid01 },
];

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--samba-border)] bg-white/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 pt-2 pb-2">
        {LINKS.map(({ href, label, Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
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
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    active
                      ? "bg-[color:var(--samba-accent)]"
                      : "bg-transparent"
                  }`}
                >
                  <Icon
                    className="size-5"
                    strokeWidth={active ? 2.25 : 1.75}
                  />
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
