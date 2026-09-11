"use client";

import { useEffect, useRef, useState } from "react";

export function ConfettiBurst({ fire }: { fire: boolean }) {
  const [pieces, setPieces] = useState<
    { id: number; left: number; delay: number; color: string }[]
  >([]);
  const fired = useRef(false);

  useEffect(() => {
    if (!fire || fired.current) return;
    fired.current = true;
    const colors = ["#E4B429", "#F0C94A", "#C9A227", "#F8E7A8", "#B8941A"];
    setPieces(
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        color: colors[i % colors.length]!,
      })),
    );
    const t = setTimeout(() => setPieces([]), 2200);
    return () => clearTimeout(t);
  }, [fire]);

  if (pieces.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 h-2.5 w-2.5 animate-[samba-fall_1.8s_ease-out_forwards] rounded-sm"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
