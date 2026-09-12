"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/** Keep fixed overlays inside the visible viewport when the mobile keyboard opens. */
export function useKeyboardSafeOverlayStyle(): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const sync = () => {
      setStyle({
        top: vv.offsetTop,
        height: vv.height,
        bottom: "auto",
      });
    };

    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);

  return style;
}

export function GameModalShell({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const viewportStyle = useKeyboardSafeOverlayStyle();

  return (
    <div
      className="samba-signal-overlay samba-signal-overlay-in fixed inset-x-0 top-0 z-[85] flex items-start justify-center overflow-y-auto px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-4 sm:items-center sm:pt-6"
      style={{ pointerEvents: "auto", ...viewportStyle }}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div className="samba-signal-card-in my-2 w-full max-w-md rounded-[1.75rem] border border-[color:var(--samba-border)] bg-[color:var(--samba-elevated)] p-5 sm:my-0 sm:p-6">
        {children}
      </div>
    </div>
  );
}
