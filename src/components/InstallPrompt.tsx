"use client";

import { useEffect, useRef, useState } from "react";
import { XClose } from "@untitledui/icons";
import { SambaMark } from "@/components/SambaLogo";

const STORAGE_KEY = "samba-install-dismissed-at";
const BROWSER_HINT_KEY = "samba-browser-chrome-hint-at";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const HINT_DISMISS_MS = 1000 * 60 * 60 * 24 * 3; // 3 days
const INSTALL_TIMEOUT_MS = 90_000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Phase =
  | "idle"
  | "prompting"
  | "installing"
  | "done"
  | "dismissed"
  | "failed";

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
  return (
    /Android/i.test(ua) && /Chrome/i.test(ua) && !/EdgA|OPR|SamsungBrowser/i.test(ua)
  );
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

function phaseLabel(phase: Phase, percent: number) {
  switch (phase) {
    case "prompting":
      return "Waiting for Chrome…";
    case "installing":
      return `Installing… ${percent}%`;
    case "done":
      return "Installed — open SAMBA from your Home Screen";
    case "failed":
      return "Install didn’t finish";
    case "dismissed":
      return "Install canceled";
    case "idle":
      return "";
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

/**
 * Helps users get a real standalone install (no Chrome URL / close bar).
 * Browsers don’t expose a true install %, so we show an estimated bar while Chrome works.
 */
export function InstallPrompt() {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"install" | "ios" | "reinstall">("install");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [phase, setPhase] = useState<Phase>("idle");
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const progressTimer = useRef<number | null>(null);
  const timeoutTimer = useRef<number | null>(null);
  const installedRef = useRef(false);
  const hasPromptRef = useRef(false);

  function clearTimers() {
    if (progressTimer.current !== null) {
      window.clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    if (timeoutTimer.current !== null) {
      window.clearTimeout(timeoutTimer.current);
      timeoutTimer.current = null;
    }
  }

  function startEstimatedProgress() {
    clearTimers();
    setPercent(8);
    progressTimer.current = window.setInterval(() => {
      setPercent((prev) => {
        if (prev >= 92) return prev;
        // Ease toward ~90% while Chrome builds the WebAPK (can take a while).
        const step = prev < 40 ? 4 : prev < 70 ? 2 : 1;
        return Math.min(92, prev + step);
      });
    }, 700);

    timeoutTimer.current = window.setTimeout(() => {
      if (installedRef.current) return;
      clearTimers();
      setPhase("failed");
      setError(
        "Chrome is taking too long. Close this, refresh the page, then try Chrome menu → Install app. Make sure you’re on sambaa.vercel.app in Chrome (not a shortcut).",
      );
    }, INSTALL_TIMEOUT_MS);
  }

  function finishInstalled() {
    if (installedRef.current) return;
    installedRef.current = true;
    clearTimers();
    setPercent(100);
    setPhase("done");
    setError(null);
    setDeferred(null);
    dismissFor(STORAGE_KEY);
    dismissFor(BROWSER_HINT_KEY);
  }

  useEffect(() => {
    if (isStandaloneDisplay()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      hasPromptRef.current = true;
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("install");
      if (!wasDismissedRecently(STORAGE_KEY, DISMISS_MS)) {
        setReady(true);
      }
    };

    const onInstalled = () => {
      finishInstalled();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const timer = window.setTimeout(() => {
      if (isStandaloneDisplay()) return;

      if (isIosSafari() && !wasDismissedRecently(STORAGE_KEY, DISMISS_MS)) {
        setMode("ios");
        setReady(true);
        return;
      }

      // No Chrome install event yet — show how to install / replace a bad shortcut.
      if (
        isAndroidChrome() &&
        !hasPromptRef.current &&
        !wasDismissedRecently(BROWSER_HINT_KEY, HINT_DISMISS_MS)
      ) {
        setMode("reinstall");
        setReady(true);
      }
    }, 2000);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimers();
    };
    // finishInstalled uses stable setters; listeners should only bind once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    const show = window.setTimeout(() => setVisible(true), 400);
    return () => window.clearTimeout(show);
  }, [ready]);

  function dismiss() {
    clearTimers();
    setVisible(false);
    setPhase("idle");
    setPercent(0);
    setError(null);
    if (mode === "reinstall") dismissFor(BROWSER_HINT_KEY);
    else dismissFor(STORAGE_KEY);
    window.setTimeout(() => setReady(false), 280);
  }

  async function onInstall() {
    if (!deferred) return;
    setError(null);
    setPhase("prompting");
    setPercent(4);
    installedRef.current = false;

    try {
      // Install criteria need an active worker; wait briefly so Chrome can package.
      if ("serviceWorker" in navigator) {
        try {
          await navigator.serviceWorker.ready;
        } catch {
          // continue — Chrome may still install
        }
      }

      await deferred.prompt();
      const choice = await deferred.userChoice;

      if (choice.outcome === "dismissed") {
        clearTimers();
        setPhase("dismissed");
        setPercent(0);
        setDeferred(null);
        return;
      }

      setPhase("installing");
      startEstimatedProgress();
      // appinstalled usually fires; if already standalone, finish immediately.
      if (isStandaloneDisplay()) {
        finishInstalled();
      }
    } catch (err) {
      clearTimers();
      setPhase("failed");
      setError(
        err instanceof Error
          ? err.message
          : "Couldn’t start install. Try Chrome menu → Install app.",
      );
    }
  }

  if (!ready) return null;

  const showProgress =
    phase === "prompting" || phase === "installing" || phase === "done";

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
            disabled={phase === "installing" || phase === "prompting"}
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

          {showProgress ? (
            <div className="mt-4 space-y-2" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[color:var(--samba-ink)]/75">
                <span>{phaseLabel(phase, percent)}</span>
                {phase !== "done" ? <span>{percent}%</span> : null}
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-[color:var(--samba-surface)]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
              >
                <div
                  className={`h-full rounded-full bg-[color:var(--samba-accent)] transition-[width] duration-500 ease-out ${
                    phase === "prompting"
                      ? "samba-install-pulse w-[18%]"
                      : ""
                  }`}
                  style={
                    phase === "prompting" ? undefined : { width: `${percent}%` }
                  }
                />
              </div>
              {phase === "installing" ? (
                <p className="text-xs leading-relaxed text-[color:var(--samba-muted)]">
                  Android is packaging the app. This can take up to a minute —
                  keep this tab open.
                </p>
              ) : null}
              {phase === "done" ? (
                <p className="text-xs leading-relaxed text-[color:var(--samba-muted)]">
                  Close this Chrome tab and open the new SAMBA icon on your Home
                  Screen (no yellow URL bar).
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="mt-3 text-sm text-[#B45309]" role="alert">
              {error}
            </p>
          ) : null}

          {phase === "done" ? (
            <button
              type="button"
              className="samba-btn mt-4 w-full"
              onClick={dismiss}
            >
              Done
            </button>
          ) : phase === "failed" || phase === "dismissed" ? (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="samba-btn-ghost flex-1"
                onClick={dismiss}
              >
                Close
              </button>
              {deferred ? (
                <button
                  type="button"
                  className="samba-btn flex-1"
                  onClick={() => void onInstall()}
                >
                  Try again
                </button>
              ) : null}
            </div>
          ) : mode === "ios" ? (
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
          ) : mode === "reinstall" && !deferred ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm leading-relaxed text-[color:var(--samba-ink)]/80">
                Remove any old SAMBA Home Screen icon, open this site in{" "}
                <span className="font-semibold">Chrome</span>, then use menu →{" "}
                <span className="font-semibold">Install app</span> (not “Add to
                Home screen”).
              </p>
              <button
                type="button"
                className="samba-btn w-full"
                onClick={dismiss}
              >
                Got it
              </button>
            </div>
          ) : phase === "prompting" || phase === "installing" ? null : (
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
                disabled={!deferred}
                onClick={() => void onInstall()}
              >
                Install app
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
