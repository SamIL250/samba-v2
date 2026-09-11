"use client";

import { useEffect, useRef } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/lib/api";

export function EnsureUser({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensure = useMutation(api.users.ensure);
  const ensuredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || isLoading || !isAuthenticated || !user) return;
    if (ensuredFor.current === user.id) return;
    ensuredFor.current = user.id;
    void ensure({
      displayName: user.fullName ?? user.firstName ?? undefined,
      avatarUrl: user.imageUrl,
    }).catch(() => {
      // Allow retry if Convex auth/token was not ready yet
      ensuredFor.current = null;
    });
  }, [isLoaded, isLoading, isAuthenticated, user, ensure]);

  return <>{children}</>;
}
