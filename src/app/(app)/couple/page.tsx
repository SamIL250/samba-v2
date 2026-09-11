"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft } from "@untitledui/icons";
import { api } from "@/lib/api";
import {
  CHAT_BACKGROUNDS,
  chatBackgroundStyle,
  isChatBackgroundKey,
  type ChatBackgroundKey,
} from "@/lib/chatBackgrounds";
import { THEMES, type ThemeKey } from "@/lib/theme";
import { CoupleSkeleton } from "@/components/skeletons";
import { PushSettingsCard } from "@/components/PushSettingsCard";

function toDateInput(value?: number) {
  if (!value) return "";
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateInput(value: string): number | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
}

export default function CoupleProfilePage() {
  const couple = useQuery(api.couples.myCouple);
  const me = useQuery(api.users.me);
  const updateProfile = useMutation(api.couples.updateProfile);

  const [coupleName, setCoupleName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [partnerLabel, setPartnerLabel] = useState("");
  const [datingStarted, setDatingStarted] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [theme, setTheme] = useState<ThemeKey>("ocean");
  const [chatBackground, setChatBackground] =
    useState<ChatBackgroundKey>("none");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!couple || !me) return;
    const key = `${couple.couple._id}:${me.user._id}`;
    // Only hydrate once per couple session — live presence updates were
    // resetting the form mid-edit and snapping the dating date back.
    if (hydratedFor.current === key) return;
    hydratedFor.current = key;

    setCoupleName(couple.couple.name);
    setDisplayName(me.user.displayName);
    setPartnerLabel(couple.membership.partnerLabel);
    setDatingStarted(
      toDateInput(
        couple.couple.datingStartedAt ?? couple.couple.anniversaryAt,
      ),
    );
    setBirthDate(toDateInput(couple.membership.birthDateAt));
    setTheme((couple.couple.theme ?? "ocean") as ThemeKey);
    const bg = couple.couple.chatBackground ?? "none";
    setChatBackground(isChatBackgroundKey(bg) ? bg : "none");
  }, [couple, me]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile({
        name: coupleName,
        displayName,
        partnerLabel,
        theme,
        chatBackground,
        datingStartedAt: parseDateInput(datingStarted),
        birthDateAt: parseDateInput(birthDate),
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t save");
    } finally {
      setBusy(false);
    }
  }

  if (couple === undefined || me === undefined) {
    return <CoupleSkeleton />;
  }

  if (!couple || !me) {
    return (
      <p className="text-sm text-[color:var(--samba-muted)]">
        Pair up first to manage your couple profile.
      </p>
    );
  }

  const partner = couple.members.find(
    (m) => m.membership.userId !== me.user._id,
  );

  return (
    <div className="samba-fade-up mx-auto max-w-xl space-y-5">
      <div className="flex items-start gap-3 md:hidden">
        <Link
          href="/more"
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-white/70"
          aria-label="Back to more"
        >
          <ArrowLeft className="size-5" strokeWidth={2} />
        </Link>
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
            Couple
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
            Your shared profile
          </h1>
        </div>
      </div>

      <div className="hidden md:block">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
          Couple
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          Your shared profile
        </h1>
        <p className="mt-2 text-sm text-[color:var(--samba-muted)]">
          Names, theme, and the details that make this space yours.
        </p>
      </div>

      <PushSettingsCard />

      <form onSubmit={onSave} className="samba-panel space-y-5 p-5 sm:p-6">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Couple name</span>
          <input
            className="samba-input"
            value={coupleName}
            onChange={(e) => setCoupleName(e.target.value)}
            placeholder="e.g. Alex & Sam"
            required
            minLength={2}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Your display name</span>
          <input
            className="samba-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Your label in chat</span>
          <input
            className="samba-input"
            value={partnerLabel}
            onChange={(e) => setPartnerLabel(e.target.value)}
            placeholder="How you appear to your person"
            required
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Started dating</span>
          <input
            type="date"
            className="samba-input"
            value={datingStarted}
            onChange={(e) => setDatingStarted(e.target.value)}
          />
          <p className="text-xs text-[color:var(--samba-muted)]">
            Powers Day N on Home and your annual anniversary celebration.
          </p>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Your birthday</span>
          <input
            type="date"
            className="samba-input"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
          <p className="text-xs text-[color:var(--samba-muted)]">
            Each of you sets your own — Home will celebrate when it’s the day.
          </p>
        </label>

        {partner?.user ? (
          <div className="rounded-2xl bg-[color:var(--samba-surface)] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--samba-muted)]">
              Your person
            </p>
            <p className="mt-1 text-sm font-semibold">
              {partner.membership.partnerLabel || partner.user.displayName}
            </p>
            <p className="text-xs text-[color:var(--samba-muted)]">
              {partner.user.displayName}
              {partner.membership.birthDateAt
                ? ` · birthday ${toDateInput(partner.membership.birthDateAt)}`
                : " · birthday not set yet"}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-[color:var(--samba-surface)] px-4 py-3 text-sm text-[color:var(--samba-muted)]">
            Waiting for your person to join.
            {couple.openInvite ? (
              <span className="mt-1 block font-semibold text-[color:var(--samba-ink)]">
                Invite code: {couple.openInvite}
              </span>
            ) : null}
          </div>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Theme</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
              const t = THEMES[key];
              const selected = theme === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTheme(key)}
                  className="overflow-hidden rounded-xl border-2 text-left transition"
                  style={{
                    borderColor: selected ? t.accent : "var(--samba-border)",
                    background: t.chatChrome,
                  }}
                >
                  <span
                    className="relative block h-14 w-full"
                    style={{ background: t.gradient }}
                  >
                    <span
                      className="absolute bottom-0 left-0 right-0 h-1/2"
                      style={{ background: t.bubbleOut }}
                    />
                    <span
                      className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full"
                      style={{ background: t.accent }}
                    />
                  </span>
                  <span className="block px-2 py-1.5 text-[11px] font-semibold">
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Chat background</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(CHAT_BACKGROUNDS) as ChatBackgroundKey[]).map(
              (key) => {
                const bg = CHAT_BACKGROUNDS[key];
                const selected = chatBackground === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setChatBackground(key)}
                    className={`overflow-hidden rounded-xl border-2 text-left ${
                      selected
                        ? "border-[color:var(--samba-accent)]"
                        : "border-[color:var(--samba-border)]"
                    }`}
                  >
                    <span
                      className="block h-10 w-full"
                      style={chatBackgroundStyle(key)}
                    />
                    <span className="block px-1.5 py-1 text-[10px] font-semibold">
                      {bg.label}
                    </span>
                  </button>
                );
              },
            )}
          </div>
        </fieldset>

        {error ? (
          <p className="text-sm text-[#B45309]" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="text-sm font-semibold text-[color:var(--samba-ink)]/70">
            Saved
          </p>
        ) : null}

        <button className="samba-btn w-full" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
