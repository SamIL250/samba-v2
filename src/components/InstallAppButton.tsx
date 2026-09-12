"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { XClose } from "@untitledui/icons";
import {
  isIosDevice,
  isStandaloneDisplay,
  listenBeforeInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwaInstall";

type Props = {
  className?: string;
  /** Visual style when sitting on the orange hero oval */
  onOval?: boolean;
  label?: string;
};

/**
 * Always-visible install CTA. iPhone has no beforeinstallprompt —
 * this opens clear Add to Home Screen steps instead of a easy-to-miss banner.
 */
export function InstallAppButton({
  className,
  onOval = false,
  label = "Download app",
}: Props) {
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStandalone(isStandaloneDisplay());
    setIos(isIosDevice());
    return listenBeforeInstallPrompt((event) => {
      setDeferred(event);
    });
  }, []);

  if (!mounted || standalone) return null;

  async function onClick() {
    if (deferred) {
      setBusy(true);
      try {
        await deferred.prompt();
        await deferred.userChoice;
        setDeferred(null);
      } catch {
        setOpen(true);
      } finally {
        setBusy(false);
      }
      return;
    }
    setOpen(true);
  }

  const buttonClass =
    className ??
    (onOval ? "samba-btn-ghost-on-oval" : "samba-btn-ghost");

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        disabled={busy}
        onClick={() => void onClick()}
      >
        {busy ? "Opening…" : label}
      </button>

      {open
        ? createPortal(
            <InstallHowToSheet
              ios={ios}
              onClose={() => setOpen(false)}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function InstallHowToSheet({
  ios,
  onClose,
}: {
  ios: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[140] flex items-end justify-center bg-black/35 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Install SAMBA"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-[color:var(--samba-border)] bg-white p-5 shadow-[0_18px_50px_rgba(26,23,20,0.18)] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative pr-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
            Get the app
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[color:var(--samba-ink)]">
            {ios ? "Add SAMBA to your iPhone" : "Install SAMBA"}
          </h2>
          <button
            type="button"
            className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--samba-muted)] transition hover:bg-[color:var(--samba-surface)]"
            aria-label="Close"
            onClick={onClose}
          >
            <XClose className="size-5" strokeWidth={2} />
          </button>
        </div>

        {ios ? (
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-[color:var(--samba-ink)]/85">
            <li>
              <span className="font-semibold">1.</span> Open this site in{" "}
              <span className="font-semibold">Safari</span> (not Chrome or
              Instagram’s browser).
            </li>
            <li>
              <span className="font-semibold">2.</span> Tap the{" "}
              <span className="font-semibold">Share</span> button{" "}
              <span
                className="mx-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-[color:var(--samba-surface)] align-middle text-[color:var(--samba-ink)]"
                aria-hidden
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
                  <path
                    d="M12 3v10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8 7l4-4 4 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{" "}
              at the bottom of Safari.
            </li>
            <li>
              <span className="font-semibold">3.</span> Scroll and tap{" "}
              <span className="font-semibold">Add to Home Screen</span>, then{" "}
              <span className="font-semibold">Add</span>.
            </li>
            <li>
              <span className="font-semibold">4.</span> Open <span className="font-semibold">SAMBA</span> from
              your Home Screen — that’s the real app (no Safari bar).
            </li>
          </ol>
        ) : (
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-[color:var(--samba-ink)]/85">
            <li>
              <span className="font-semibold">1.</span> Open this site in{" "}
              <span className="font-semibold">Chrome</span>.
            </li>
            <li>
              <span className="font-semibold">2.</span> Tap the menu{" "}
              <span className="font-semibold">⋮</span>, then{" "}
              <span className="font-semibold">Install app</span> (not “Add to
              Home screen”).
            </li>
            <li>
              <span className="font-semibold">3.</span> Open SAMBA from your Home
              Screen icon.
            </li>
          </ol>
        )}

        <button type="button" className="samba-btn mt-5 w-full" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
