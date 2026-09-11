"use client";

import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";
import { api } from "@/lib/api";
import { AppNav } from "./AppNav";
import { AppBottomNav } from "./AppBottomNav";
import { SoftSignalOverlay } from "./SoftSignalOverlay";
import { TruthOrDareOverlay } from "./TruthOrDareOverlay";
import { themeCssVars, type ThemeKey } from "@/lib/theme";
import { EnsureUser } from "./EnsureUser";

function CoupleShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const couple = useQuery(api.couples.myCouple, isAuthenticated ? {} : "skip");
  const heartbeat = useMutation(api.presence.heartbeat);
  const router = useRouter();
  const pathname = usePathname();
  const isThread =
    pathname === "/chat/thread" || pathname.startsWith("/chat/thread/");

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (me === undefined) return;
    if (me && !me.membership) {
      startTransition(() => {
        router.replace("/onboarding");
      });
    }
  }, [authLoading, isAuthenticated, me, router]);

  useEffect(() => {
    if (!couple?.couple) return;
    void heartbeat({});
    const id = setInterval(() => {
      void heartbeat({});
    }, 25_000);
    return () => clearInterval(id);
  }, [couple?.couple?._id, heartbeat]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--samba-gradient,#F3F8F8)] text-[color:var(--samba-ink,#102A2B)]">
        <p className="animate-pulse text-sm opacity-60">Connecting your session…</p>
      </div>
    );
  }

  if (me === undefined || couple === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--samba-gradient,#F3F8F8)] text-[color:var(--samba-ink,#102A2B)]">
        <p className="animate-pulse text-sm opacity-60">Opening your space…</p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--samba-gradient,#F3F8F8)]">
        <p className="animate-pulse text-sm opacity-60">Setting up your profile…</p>
      </div>
    );
  }

  if (!me.membership || !couple) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--samba-gradient,#F3F8F8)]">
        <p className="text-sm opacity-60">Taking you to onboarding…</p>
      </div>
    );
  }

  const theme = (couple.couple.theme ?? "ocean") as ThemeKey;
  const vars = themeCssVars(theme);

  return (
    <div
      className="min-h-screen text-[color:var(--samba-ink)]"
      style={{
        ...vars,
        background: isThread
          ? "var(--samba-chat-chrome)"
          : "var(--samba-gradient)",
      }}
    >
      {!isThread ? <AppNav coupleName={couple.couple.name} /> : null}
      <main
        className={
          isThread
            ? "p-0"
            : "mx-auto w-full max-w-5xl px-4 py-6 pb-28 md:pb-24"
        }
      >
        {children}
      </main>
      {!isThread ? <AppBottomNav /> : null}
      <SoftSignalOverlay />
      <TruthOrDareOverlay />
    </div>
  );
}

export function CoupleGate({ children }: { children: React.ReactNode }) {
  return (
    <EnsureUser>
      <CoupleShell>{children}</CoupleShell>
    </EnsureUser>
  );
}
