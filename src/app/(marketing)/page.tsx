"use client";

import Link from "next/link";
import { Show, SignInButton } from "@clerk/nextjs";
import { SambaMark } from "@/components/SambaLogo";

function HeroBody({ onOval }: { onOval: boolean }) {
  const eyebrow = onOval ? "text-white" : "text-[color:var(--samba-accent)]";
  const title = onOval ? "text-white" : "text-[color:var(--samba-ink)]";
  const body = onOval ? "text-white/90" : "text-[color:var(--samba-muted)]";

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 pb-16 pt-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <SambaMark size={52} priority />
        </div>
        <div>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                className={
                  onOval ? "samba-btn-on-oval text-sm" : "samba-btn-ghost text-sm"
                }
              >
                Sign in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/home"
              className={onOval ? "samba-btn-on-oval text-sm" : "samba-btn text-sm"}
            >
              Open your space
            </Link>
          </Show>
        </div>
      </header>

      <section className="mt-16 flex flex-1 flex-col justify-center gap-10 md:mt-24 md:max-w-2xl">
        <div>
          <p
            className={`mb-4 text-xs font-bold uppercase tracking-[0.22em] ${eyebrow}`}
          >
            For two people, one story
          </p>
          <h1
            className={`text-5xl font-extrabold tracking-[-0.04em] md:text-7xl ${title}`}
            style={{ fontFamily: "var(--font-display)", lineHeight: 0.95 }}
          >
            Samba
          </h1>
          <p
            className={`mt-6 max-w-xl text-lg font-medium leading-relaxed md:text-xl ${body}`}
          >
            A shared nest for chats, little games, and moments that belong to
            you two — with an optional public window when you feel like waving.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className={onOval ? "samba-btn-on-oval" : "samba-btn"}>
                Start as a couple
              </button>
            </SignInButton>
            <Link
              href="/sign-up"
              className={onOval ? "samba-btn-ghost-on-oval" : "samba-btn-ghost"}
            >
              Create account
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/home"
              className={onOval ? "samba-btn-on-oval" : "samba-btn"}
            >
              Continue together
            </Link>
          </Show>
        </div>
      </section>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div aria-hidden className="samba-hero-oval pointer-events-none absolute inset-0" />

      <div className="relative z-10">
        <HeroBody onOval={false} />
      </div>

      <div className="samba-hero-oval-clip pointer-events-none absolute inset-0 z-20">
        <HeroBody onOval />
      </div>
    </div>
  );
}
