"use client";

import { useEffect, useState } from "react";
import { XClose } from "@untitledui/icons";
import { SambaMark } from "@/components/SambaLogo";

const STORAGE_KEY = "samba-install-dismissed-at";
const BROWSER_HINT_KEY = "samba-browser-chrome-hint-at";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const HINT_DISMISS_MS = 1000 * 60 * 60 * 24 * 3; // 3 days

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneDisplay() {
  if (typeof window === "undefined") return true;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const fullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || fullscreen || iosStandalone;
}

function isAndroidChrome() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Android/i.test(ua) && /Chrome/i.test(ua) && !/EdgA|OPR|SamsungBrowser/i.test(ua);
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && notChrome;
}

function wasDismissedRecently(key: string, ms: number) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < ms;
  } catch {
    return false;
  }
}

function dismissFor(key: string) {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    // ignore
  }
}

/**
 * Helps users get a real standalone install (no Chrome URL / close bar).
 * That yellow bar means Android opened a browser shortcut / Custom Tab, not the WebAPK.
 */
export function InstallPrompt() {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"install" | "ios" | "reinstall">("install");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("install");
      if (!wasDismissedRecently(STORAGE_KEY, DISMISS_MS)) {
        setReady(true);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const timer = window.setTimeout(() => {
      if (isStandaloneDisplay()) return;

      if (isIosSafari() && !wasDismissedRecently(STORAGE_KEY, DISMISS_MS)) {
        setMode("ios");
        setReady(true);
        return;
      }

      // Android already on the site in Chrome with the URL chrome visible —
      // guide a clean reinstall via Chrome's Install app (not "Add to Home screen").
      if (
        isAndroidChrome() &&
        !wasDismissedRecently(BROWSER_HINT_KEY, HINT_DISMISS_MS)
      ) {
        setMode("reinstall");
        setReady(true);
      }
    }, 1600);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const show = window.setTimeout(() => setVisible(true), 400);
    return () => window.clearTimeout(show);
  }, [ready]);

  function dismiss() {
    setVisible(false);
    if (mode === "reinstall") dismissFor(BROWSER_HINT_KEY);
    else dismissFor(STORAGE_KEY);
    window.setTimeout(() => setReady(false), 280);
  }

  async function onInstall() {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      dismissFor(STORAGE_KEY);
      dismissFor(BROWSER_HINT_KEY);
      setVisible(false);
      window.setTimeout(() => setReady(false), 280);
    } catch {
      setBusy(false);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[120] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 transition duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
      role="dialog"
      aria-label="Install SAMBA"
    >
      <div className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-[color:var(--samba-border)] bg-white shadow-[0_18px_50px_rgba(26,23,20,0.14)]">
        <div className="relative px-5 pb-5 pt-5">
          <button
            type="button"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--samba-muted)] transition hover:bg-[color:var(--samba-surface)]"
            aria-label="Dismiss"
            onClick={dismiss}
          >
            <XClose className="size-5" strokeWidth={2} />
          </button>

          <div className="flex items-center gap-3 pr-8">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[color:var(--samba-surface)] ring-1 ring-[color:var(--samba-border)]">
              <SambaMark size={44} priority />
            </div>
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[color:var(--samba-ink)]">
                SAMBA
              </p>
              <p className="mt-0.5 text-sm text-[color:var(--samba-muted)]">
                {mode === "reinstall"
                  ? "Hide the browser bar"
                  : "Your couple space, one tap away"}
              </p>
            </div>
          </div>

          {mode === "ios" ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm leading-relaxed text-[color:var(--samba-ink)]/80">
                Install SAMBA on your Home Screen: tap{" "}
                <span className="font-semibold">Share</span>, then{" "}
                <span className="font-semibold">Add to Home Screen</span>.
              </p>
              <button
                type="button"
                className="samba-btn w-full"
                onClick={dismiss}
              >
                Got it
              </button>
            </div>
          ) : mode === "reinstall" ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm leading-relaxed text-[color:var(--samba-ink)]/80">
                That yellow bar means Chrome opened a shortcut, not the real app.
                Long-press the Home Screen icon →{" "}
                <span className="font-semibold">Remove</span>, then in Chrome open
                SAMBA → menu → <span className="font-semibold">Install app</span>{" "}
                (not “Add to Home screen”), and open it from the new icon.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="samba-btn-ghost flex-1"
                  onClick={dismiss}
                >
                  Later
                </button>
                {deferred ? (
                  <button
                    type="button"
                    className="samba-btn flex-1"
                    disabled={busy}
                    onClick={() => void onInstall()}
                  >
                    {busy ? "Opening…" : "Install app"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="samba-btn flex-1"
                    onClick={dismiss}
                  >
                    Got it
                  </button>
                )}
              </div>
            </div>
          ) : (
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
                disabled={busy || !deferred}
                onClick={() => void onInstall()}
              >
                {busy ? "Opening…" : "Install app"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
