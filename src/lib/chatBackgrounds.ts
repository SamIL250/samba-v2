import type { CSSProperties } from "react";

export const CHAT_BACKGROUNDS = {
  none: {
    label: "Plain",
    blurb: "Clean cream",
    color: "#FFFDF8",
    image: null as string | null,
    size: "auto",
  },
  dots: {
    label: "Soft dots",
    blurb: "Quiet speckles",
    color: "#F7F3EA",
    image: "/brand/chat/pattern-dots.svg",
    size: "48px 48px",
  },
  hearts: {
    label: "Tiny hearts",
    blurb: "A little sweet",
    color: "#F8F1E4",
    image: "/brand/chat/pattern-hearts.svg",
    size: "64px 64px",
  },
  waves: {
    label: "Warm waves",
    blurb: "Gentle lines",
    color: "#F6F2E8",
    image: "/brand/chat/pattern-waves.svg",
    size: "72px 36px",
  },
  grid: {
    label: "Honey grid",
    blurb: "Soft structure",
    color: "#F5F1E7",
    image: "/brand/chat/pattern-grid.svg",
    size: "40px 40px",
  },
  petals: {
    label: "Petals",
    blurb: "Scattered bloom",
    color: "#F8F4EC",
    image: "/brand/chat/pattern-petals.svg",
    size: "80px 80px",
  },
} as const;

export type ChatBackgroundKey = keyof typeof CHAT_BACKGROUNDS;

export function isChatBackgroundKey(value: string): value is ChatBackgroundKey {
  return value in CHAT_BACKGROUNDS;
}

export function chatBackgroundStyle(key: ChatBackgroundKey): CSSProperties {
  const bg = CHAT_BACKGROUNDS[key];
  return {
    backgroundColor: bg.color,
    backgroundImage: bg.image ? `url(${bg.image})` : "none",
    backgroundRepeat: bg.image ? "repeat" : "no-repeat",
    backgroundSize: bg.image ? bg.size : "auto",
  };
}
