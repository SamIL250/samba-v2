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
    elevated: "#FFFFFF",
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
    elevated: "#FFFCF8",
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
    elevated: "#FFFEFE",
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
    elevated: "#FBFAF7",
    gradient: "linear-gradient(160deg, #F9F8F5 0%, #EEEEE8 50%, #E2E2DA 100%)",
  },
} as const;

export type ThemeKey = keyof typeof THEMES;
export type ColorMode = "light" | "dark";

type ThemePalette = {
  accent: string;
  accentSoft: string;
  glow: string;
  surface: string;
  ink: string;
  muted: string;
  border: string;
  bubbleIn: string;
  bubbleOut: string;
  bubbleOutText: string;
  chatChrome: string;
  elevated: string;
  gradient: string;
};

/** Dark shells keep each accent family, but invert surface / ink. */
const DARK_BY_THEME: Record<ThemeKey, ThemePalette> = {
  ocean: {
    accent: "#E8C04A",
    accentSoft: "#C9A030",
    glow: "#5A4A20",
    surface: "#1C1916",
    ink: "#F4F0E8",
    muted: "#A39E96",
    border: "#3A3530",
    bubbleIn: "#2A2622",
    bubbleOut: "#E8C04A",
    bubbleOutText: "#1A1714",
    chatChrome: "#141210",
    elevated: "#221E1A",
    gradient: "linear-gradient(160deg, #141210 0%, #1C1916 48%, #241F1A 100%)",
  },
  sunset: {
    accent: "#E09A3A",
    accentSoft: "#C47A1A",
    glow: "#5A3A18",
    surface: "#1F1610",
    ink: "#F8EEE4",
    muted: "#B09880",
    border: "#3F3228",
    bubbleIn: "#2E241C",
    bubbleOut: "#E09A3A",
    bubbleOutText: "#1A120C",
    chatChrome: "#16110C",
    elevated: "#261C14",
    gradient: "linear-gradient(160deg, #16110C 0%, #1F1610 50%, #2A1C12 100%)",
  },
  forest: {
    accent: "#D9A89C",
    accentSoft: "#C4897A",
    glow: "#5A3C36",
    surface: "#1F1716",
    ink: "#F7EEEB",
    muted: "#B09A96",
    border: "#3F322F",
    bubbleIn: "#2E2422",
    bubbleOut: "#D9A89C",
    bubbleOutText: "#1A1210",
    chatChrome: "#161110",
    elevated: "#261C1A",
    gradient: "linear-gradient(160deg, #161110 0%, #1F1716 50%, #2A1C1A 100%)",
  },
  midnight: {
    accent: "#A8AD8E",
    accentSoft: "#8A8F6E",
    glow: "#3A3E30",
    surface: "#181A16",
    ink: "#F0F1EC",
    muted: "#9A9E94",
    border: "#33362E",
    bubbleIn: "#252822",
    bubbleOut: "#A8AD8E",
    bubbleOutText: "#141610",
    chatChrome: "#12140F",
    elevated: "#1E211C",
    gradient: "linear-gradient(160deg, #12140F 0%, #181A16 50%, #22251E 100%)",
  },
};

export function isColorMode(value: unknown): value is ColorMode {
  return value === "light" || value === "dark";
}

export function themeCssVars(
  theme: ThemeKey,
  colorMode: ColorMode = "light",
): Record<string, string> {
  const light = THEMES[theme];
  const t = colorMode === "dark" ? DARK_BY_THEME[theme] : light;
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
    "--samba-elevated": t.elevated,
    "--background": t.surface,
    "--foreground": t.ink,
    colorScheme: colorMode,
  };
}

export function daysTogether(from: number, now = Date.now()): number {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

/** True when today matches the month/day of `dateAt` (local time). */
export function isAnniversaryToday(dateAt: number, now = Date.now()): boolean {
  const d = new Date(dateAt);
  const n = new Date(now);
  return d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

/** Whole years since `dateAt` as of today (0 if before first anniversary). */
export function yearsSince(dateAt: number, now = Date.now()): number {
  const d = new Date(dateAt);
  const n = new Date(now);
  let years = n.getFullYear() - d.getFullYear();
  const before =
    n.getMonth() < d.getMonth() ||
    (n.getMonth() === d.getMonth() && n.getDate() < d.getDate());
  if (before) years -= 1;
  return Math.max(0, years);
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
