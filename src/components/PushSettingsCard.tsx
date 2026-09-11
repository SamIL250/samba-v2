"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Bell01 } from "@untitledui/icons";
import { api } from "@/lib/api";
import {
  clearPushOptInDismiss,
  pushSupported,
  subscribeBrowserPush,
} from "@/lib/push";

export function PushSettingsCard() {
  const status = useQuery(api.push.status);
  const vapidPublicKey = useQuery(api.push.publicKey);
  const saveSubscription = useMutation(api.push.saveSubscription);
  const removeSubscription = useMutation(api.push.removeSubscription);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publicKey =
    vapidPublicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
  const permission =
    typeof Notification !== "undefined" ? Notification.permission : "default";
  const supported = pushSupported();

  async function onEnable() {
    setBusy(true);
    setError(null);
    setMessage(null);
    clearPushOptInDismiss();
    try {
      if (!supported) {
        throw new Error(
          "This browser can’t do push yet. On iPhone, install SAMBA to your Home Screen first.",
        );
      }
      if (!publicKey) {
        throw new Error("Push isn’t configured on this deployment yet.");
      }
      const next = await Notification.requestPermission();
      if (next !== "granted") {
        throw new Error(
          "Permission blocked. Enable notifications for this site in your browser settings, then try again.",
        );
      }
      await subscribeBrowserPush(publicKey, saveSubscription);
      setMessage("Notifications are on.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t enable notifications");
    } finally {
      setBusy(false);
    }
  }

  async function onDisable() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await removeSubscription({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      } else {
        await removeSubscription({});
      }
      setMessage("Notifications turned off on this device.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t turn off notifications");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="samba-panel space-y-3 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--samba-accent)]/15">
          <Bell01 className="size-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Push notifications</p>
          <p className="mt-1 text-sm text-[color:var(--samba-muted)]">
            Get alerts for messages, soft signals, moods, and Truth or Dare —
            even when SAMBA is closed.
          </p>
          <p className="mt-2 text-xs text-[color:var(--samba-muted)]">
            Status:{" "}
            {!supported
              ? "not supported here"
              : status?.subscribed
                ? "on for this account"
                : permission === "denied"
                  ? "blocked in browser"
                  : permission === "granted"
                    ? "allowed — finishing setup…"
                    : "off"}
          </p>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-[#B45309]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm font-semibold text-[color:var(--samba-ink)]/70">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="samba-btn"
          disabled={busy || !supported}
          onClick={() => void onEnable()}
        >
          {busy ? "Working…" : status?.subscribed ? "Refresh" : "Turn on"}
        </button>
        {status?.subscribed ? (
          <button
            type="button"
            className="samba-btn-ghost"
            disabled={busy}
            onClick={() => void onDisable()}
          >
            Turn off
          </button>
        ) : null}
      </div>
    </div>
  );
}
