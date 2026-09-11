"use client";

import { useEffect } from "react";

/** Registers the Samba service worker (needed for install + Web Push). */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let intervalId: number | undefined;

    const register = () => {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((reg) => {
          void reg.update();
          // Periodic check so phones pick up push-handler updates without a reinstall.
          intervalId = window.setInterval(() => {
            void reg.update();
          }, 1000 * 60 * 30);
        })
        .catch(() => {
          // Ignore — push/install degrade gracefully.
        });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
