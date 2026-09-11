"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { SambaLogo } from "@/components/SambaLogo";

const LINKS = [
  { href: "/home", label: "Home" },
  { href: "/chat", label: "Chat" },
  { href: "/play", label: "Play" },
  { href: "/moments", label: "Moments" },
  { href: "/wall", label: "Wall" },
  { href: "/couple", label: "Couple" },
] as const;

export function AppNav({ coupleName }: { coupleName?: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--samba-border)] bg-[color:var(--samba-surface)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <SambaLogo href="/home" size={44} />
          {coupleName ? (
            <span className="hidden text-sm text-[color:var(--samba-muted)] sm:inline">
              · {coupleName}
            </span>
          ) : null}
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  active
                    ? "border border-[color:var(--samba-bubble-out)] bg-[color:var(--samba-bubble-out)] font-semibold text-[color:var(--samba-bubble-out-text)]"
                    : "border border-transparent text-[color:var(--samba-muted)] hover:border-[color:var(--samba-border)] hover:text-[color:var(--samba-ink)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <UserButton />
      </div>
    </header>
  );
}
