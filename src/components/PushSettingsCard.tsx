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
  const sendTest = useMutation(api.push.sendTest);
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
          "Notifications are blocked. Allow them for this site in your browser settings.",
        );
      }
      // Force a fresh subscription so VAPID key rotations don't leave a dead endpoint.
      await subscribeBrowserPush(publicKey, saveSubscription, { forceNew: true });
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
      setMessage("Notifications turned off.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t turn off notifications");
    } finally {
      setBusy(false);
    }
  }

  async function onTest() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await sendTest({});
      setMessage(
        `Test sent to ${result.devices} device${result.devices === 1 ? "" : "s"}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t send test");
    } finally {
      setBusy(false);
    }
  }

  const statusPill = !supported
    ? { label: "Not supported", tone: "muted" as const }
    : status?.subscribed
      ? { label: "On", tone: "on" as const }
      : permission === "denied"
        ? { label: "Blocked", tone: "warn" as const }
        : { label: "Off", tone: "muted" as const };

  const pillTone =
    statusPill.tone === "on"
      ? "border-[#8BC48A]/70 bg-[#8BC48A]/20 text-[#2F6B33]"
      : statusPill.tone === "warn"
        ? "border-[#E2A36B]/70 bg-[#E2A36B]/25 text-[#8A4B12]"
        : "border-[color:var(--samba-border)] bg-[color:var(--samba-surface)] text-[color:var(--samba-muted)]";

  return (
    <div className="samba-panel p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--samba-accent)]/15">
          <Bell01 className="size-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Push notifications</p>
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${pillTone}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  statusPill.tone === "on"
                    ? "bg-[#3E8A45]"
                    : statusPill.tone === "warn"
                      ? "bg-[#C4741F]"
                      : "bg-[color:var(--samba-muted)]"
                }`}
              />
              {statusPill.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-[color:var(--samba-muted)]">
            Alerts for messages, signals, and games — even when SAMBA is closed.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-[#B45309]" role="alert">
          {error}
        </p>
      ) : message ? (
        <p className="mt-4 text-sm font-semibold text-[color:var(--samba-ink)]/70">
          {message}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="samba-btn"
          disabled={busy || !supported}
          onClick={() => void onEnable()}
        >
          {busy ? "Working…" : status?.subscribed ? "Refresh" : "Turn on"}
        </button>
        {status?.subscribed ? (
          <>
            <button
              type="button"
              className="samba-btn-ghost"
              disabled={busy}
              onClick={() => void onTest()}
            >
              Send test
            </button>
            <button
              type="button"
              className="samba-btn-ghost"
              disabled={busy}
              onClick={() => void onDisable()}
            >
              Turn off
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
