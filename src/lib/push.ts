export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function subscribeBrowserPush(
  publicKey: string,
  save: (args: {
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  }) => Promise<unknown>,
  options?: { forceNew?: boolean },
) {
  const registration = await navigator.serviceWorker.ready;
  // Pull the latest SW so push handlers aren't stuck on an old cached script.
  try {
    await registration.update();
  } catch {
    // ignore — subscribe still works with the current worker
  }

  let subscription = await registration.pushManager.getSubscription();
  if (subscription && options?.forceNew) {
    try {
      await subscription.unsubscribe();
    } catch {
      // continue and attempt a fresh subscribe
    }
    subscription = null;
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Incomplete push subscription");
  }

  await save({
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    userAgent: navigator.userAgent,
  });
}

export const PUSH_OPTIN_DISMISS_KEY = "samba-push-optin-dismissed-at";

export function clearPushOptInDismiss() {
  try {
    localStorage.removeItem(PUSH_OPTIN_DISMISS_KEY);
  } catch {
    // ignore
  }
}
