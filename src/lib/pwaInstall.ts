/** Shared PWA install helpers (iOS has no beforeinstallprompt). */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return true;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const fullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || fullscreen || iosStandalone;
}

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  if (!isIosDevice()) return false;
  const ua = navigator.userAgent;
  const webkit = /WebKit/.test(ua);
  const notOther = !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/.test(ua);
  return webkit && notOther;
}

export function isAndroidChrome() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /Android/i.test(ua) &&
    /Chrome/i.test(ua) &&
    !/EdgA|OPR|SamsungBrowser/i.test(ua)
  );
}

/** Capture Chrome's install event (no-op on iOS). */
export function listenBeforeInstallPrompt(
  onEvent: (event: BeforeInstallPromptEvent) => void,
) {
  if (typeof window === "undefined") return () => undefined;

  const handler = (e: Event) => {
    e.preventDefault();
    onEvent(e as BeforeInstallPromptEvent);
  };

  window.addEventListener("beforeinstallprompt", handler);
  return () => window.removeEventListener("beforeinstallprompt", handler);
}
