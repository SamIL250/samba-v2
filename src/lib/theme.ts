export const THEMES = {
  ocean: {
    label: "Honey",
    blurb: "Bright & warm",
    preview: "/brand/themes/theme-honey.png",
    accent: "#E4B429",
    accentSoft: "#F0C94A",
    glow: "#F8E7A8",
    surface: "#FAF9F6",
    ink: "#1A1714",
    muted: "#6B6560",
    border: "#E4E1DB",
    bubbleIn: "#F3F1EC",
    bubbleOut: "#1A1714",
    bubbleOutText: "#FFFDF7",
    chatChrome: "#FFFFFF",
    gradient: "linear-gradient(160deg, #FFFDF7 0%, #FAF6EE 45%, #F3EFE6 100%)",
  },
  sunset: {
    label: "Amber",
    blurb: "Deeper gold",
    preview: "/brand/themes/theme-amber.png",
    accent: "#C47A1A",
    accentSoft: "#E09A3A",
    glow: "#F2D2A0",
    surface: "#FFF6EC",
    ink: "#2A1A10",
    muted: "#7A5A40",
    border: "#E8D5C0",
    bubbleIn: "#F8E8D8",
    bubbleOut: "#8B4518",
    bubbleOutText: "#FFF8F0",
    chatChrome: "#FFF9F3",
    gradient: "linear-gradient(160deg, #FFF9F2 0%, #F8E8D4 50%, #F0D8B8 100%)",
  },
  forest: {
    label: "Champagne",
    blurb: "Soft blush",
    preview: "/brand/themes/theme-champagne.png",
    accent: "#C4897A",
    accentSoft: "#D9A89C",
    glow: "#F0D8D0",
    surface: "#FBF6F4",
    ink: "#2A1C1A",
    muted: "#7A6460",
    border: "#E8DCD8",
    bubbleIn: "#F5EAE6",
    bubbleOut: "#5C3D38",
    bubbleOutText: "#FFF8F6",
    chatChrome: "#FFFCFB",
    gradient: "linear-gradient(160deg, #FFFCFA 0%, #F7ECE8 50%, #EFE0DA 100%)",
  },
  midnight: {
    label: "Linen",
    blurb: "Quiet & cool",
    preview: "/brand/themes/theme-linen.png",
    accent: "#8A8F6E",
    accentSoft: "#A8AD8E",
    glow: "#D8DBC8",
    surface: "#F4F3EF",
    ink: "#1E211C",
    muted: "#646860",
    border: "#D8D6CE",
    bubbleIn: "#EAE8E2",
    bubbleOut: "#2C3228",
    bubbleOutText: "#F7F6F2",
    chatChrome: "#F7F6F2",
    gradient: "linear-gradient(160deg, #F9F8F5 0%, #EEEEE8 50%, #E2E2DA 100%)",
  },
} as const;

export type ThemeKey = keyof typeof THEMES;

export function themeCssVars(theme: ThemeKey): Record<string, string> {
  const t = THEMES[theme];
  return {
    "--samba-accent": t.accent,
    "--samba-accent-soft": t.accentSoft,
    "--samba-glow": t.glow,
    "--samba-surface": t.surface,
    "--samba-ink": t.ink,
    "--samba-muted": t.muted,
    "--samba-gradient": t.gradient,
    "--samba-border": t.border,
    "--samba-border-strong": t.border,
    "--samba-bubble-in": t.bubbleIn,
    "--samba-bubble-out": t.bubbleOut,
    "--samba-bubble-out-text": t.bubbleOutText,
    "--samba-chat-chrome": t.chatChrome,
  };
}

export function daysTogether(from: number, now = Date.now()): number {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
