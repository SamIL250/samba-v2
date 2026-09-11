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
    gradient: "linear-gradient(160deg, #FFFDF7 0%, #FAF6EE 45%, #F3EFE6 100%)",
  },
  sunset: {
    label: "Amber",
    blurb: "Deeper gold",
    preview: "/brand/themes/theme-amber.png",
    accent: "#D9A21B",
    accentSoft: "#E8B84A",
    glow: "#F3DF9E",
    surface: "#FBF8F2",
    ink: "#1A1714",
    gradient: "linear-gradient(160deg, #FFFBF3 0%, #F8F1E4 50%, #F2EAD8 100%)",
  },
  forest: {
    label: "Champagne",
    blurb: "Soft & muted",
    preview: "/brand/themes/theme-champagne.png",
    accent: "#C9A227",
    accentSoft: "#DBB84A",
    glow: "#EFE0A8",
    surface: "#FAF8F3",
    ink: "#1A1714",
    gradient: "linear-gradient(160deg, #FFFEF9 0%, #F7F3EA 50%, #EFE9DC 100%)",
  },
  midnight: {
    label: "Linen",
    blurb: "Quiet & light",
    preview: "/brand/themes/theme-linen.png",
    accent: "#C4A84A",
    accentSoft: "#D4BC6A",
    glow: "#EDE3C0",
    surface: "#F9F8F5",
    ink: "#1A1714",
    gradient: "linear-gradient(160deg, #FFFEFC 0%, #F6F4EF 50%, #EEEBE4 100%)",
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
    "--samba-gradient": t.gradient,
    "--samba-border": "#E4E1DB",
    "--samba-border-strong": "#D4D0C8",
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
