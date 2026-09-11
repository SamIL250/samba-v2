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
import { AppShellSkeleton } from "@/components/skeletons";

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
    return <AppShellSkeleton />;
  }

  if (me === undefined || couple === undefined) {
    return <AppShellSkeleton />;
  }

  if (!me) {
    return <AppShellSkeleton />;
  }

  if (!me.membership || !couple) {
    return <AppShellSkeleton />;
  }

  const theme = (couple.couple.theme ?? "ocean") as ThemeKey;
  const vars = themeCssVars(theme);

  return (
    <div
      className={
        isThread
          ? "h-dvh overflow-hidden text-[color:var(--samba-ink)]"
          : "min-h-screen text-[color:var(--samba-ink)]"
      }
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
