"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Bell01, XClose } from "@untitledui/icons";
import { api } from "@/lib/api";
import {
  PUSH_OPTIN_DISMISS_KEY,
  pushSupported,
  subscribeBrowserPush,
} from "@/lib/push";

const DISMISS_MS = 1000 * 60 * 60 * 24 * 7;

function wasDismissedRecently() {
  try {
    const raw = localStorage.getItem(PUSH_OPTIN_DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || ios;
}

/**
 * Keeps Web Push subscriptions synced and shows a soft opt-in when needed.
 * Works best when SAMBA is installed as a PWA (required on iOS).
 */
export function PushNotifications() {
  const status = useQuery(api.push.status);
  const vapidPublicKey = useQuery(api.push.publicKey);
  const saveSubscription = useMutation(api.push.saveSubscription);
  const [showOptIn, setShowOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicKey =
    vapidPublicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;

  useEffect(() => {
    if (!pushSupported()) return;

    let cancelled = false;

    async function sync() {
      if (vapidPublicKey === undefined && !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        return;
      }
      if (!publicKey) return;

      if (Notification.permission === "granted") {
        try {
          await subscribeBrowserPush(publicKey, saveSubscription);
        } catch {
          // Soft fail — user can retry via the banner / Couple settings.
        }
        return;
      }

      if (Notification.permission !== "default") return;
      if (wasDismissedRecently()) return;
      if (!cancelled) {
        window.setTimeout(() => {
          if (!cancelled) setShowOptIn(true);
        }, isStandalone() ? 800 : 1500);
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [publicKey, vapidPublicKey, saveSubscription]);

  async function onEnable() {
    if (!publicKey) {
      setError("Push isn’t configured yet — try again after deploy.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError(
          "Notifications stayed off — you can enable them in Couple settings anytime.",
        );
        setBusy(false);
        return;
      }
      await subscribeBrowserPush(publicKey, saveSubscription);
      setShowOptIn(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn’t enable notifications",
      );
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    setShowOptIn(false);
    try {
      localStorage.setItem(PUSH_OPTIN_DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }

  if (!showOptIn) return null;
  if (status?.subscribed) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[115] flex justify-center px-4 pb-[max(1rem,calc(env(safe-area-inset-bottom)+4.5rem))] pt-2 md:pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-label="Enable notifications"
    >
      <div className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-[color:var(--samba-border)] bg-white p-5 shadow-[0_18px_50px_rgba(26,23,20,0.14)]">
        <div className="relative flex gap-3 pr-8">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--samba-accent)]/15 text-[color:var(--samba-ink)]">
            <Bell01 className="size-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
              Stay close
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[color:var(--samba-muted)]">
              Get a nudge when they message, send a soft signal, change mood, or
              start Truth or Dare — even if SAMBA is closed.
            </p>
          </div>
          <button
            type="button"
            className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--samba-muted)] transition hover:bg-[color:var(--samba-surface)]"
            aria-label="Dismiss"
            onClick={dismiss}
          >
            <XClose className="size-5" strokeWidth={2} />
          </button>
        </div>

        {error ? (
          <p className="mt-3 text-xs text-[#B45309]">{error}</p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="samba-btn-ghost flex-1"
            onClick={dismiss}
          >
            Not now
          </button>
          <button
            type="button"
            className="samba-btn flex-1"
            disabled={busy || !publicKey}
            onClick={() => void onEnable()}
          >
            {busy ? "Enabling…" : "Turn on"}
          </button>
        </div>
      </div>
    </div>
  );
}
