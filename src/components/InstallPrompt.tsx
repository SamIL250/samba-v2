"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { XClose } from "@untitledui/icons";
import { SambaMark } from "@/components/SambaLogo";
import {
  isAndroidChrome,
  isIosSafari,
  isStandaloneDisplay,
  type BeforeInstallPromptEvent,
} from "@/lib/pwaInstall";

const STORAGE_KEY = "samba-install-dismissed-at";
const BROWSER_HINT_KEY = "samba-browser-chrome-hint-at";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const HINT_DISMISS_MS = 1000 * 60 * 60 * 24 * 3; // 3 days
const INSTALL_TIMEOUT_MS = 90_000;

type Phase =
  | "idle"
  | "prompting"
  | "installing"
  | "done"
  | "dismissed"
  | "failed";

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
 * Soft bottom prompt for signed-in app surfaces (Android).
 * Landing page uses the always-visible Download button instead — iPhone friends
 * often never notice this banner.
 */
export function InstallPrompt() {
  const pathname = usePathname();
  const onMarketing = pathname === "/";

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
    // Landing has an explicit Download button — don’t cover the hero with a banner.
    if (onMarketing) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMarketing]);

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
      if ("serviceWorker" in navigator) {
        try {
          await navigator.serviceWorker.ready;
        } catch {
          // continue
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

  if (onMarketing || !ready) return null;

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
                    phase === "prompting" ? "samba-install-pulse w-[18%]" : ""
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
                On iPhone, use the <span className="font-semibold">Download app</span>{" "}
                button on the home page — or Safari Share → Add to Home Screen.
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
