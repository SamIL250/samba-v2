"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "convex/react";
import { Plus, XClose } from "@untitledui/icons";
import { api } from "@/lib/api";
import { CelebrationCard } from "@/components/CelebrationCard";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { HomeSkeleton } from "@/components/skeletons";
import {
  isMoodGender,
  isPartnerMoodKey,
  PARTNER_MOODS,
  partnerMoodIllustration,
  type MoodGender,
  type PartnerMoodKey,
} from "@/lib/moods";
import {
  daysTogether,
  formatRelative,
  isAnniversaryToday,
  yearsSince,
} from "@/lib/theme";

export default function HomePage() {
  const data = useQuery(api.couples.myCouple);
  const chatUnread = useQuery(api.chat.unreadCount);
  const regenerateInvite = useMutation(api.couples.regenerateInvite);
  const setCurrentMood = useMutation(api.couples.setCurrentMood);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const [moodBusy, setMoodBusy] = useState(false);
  const [moodTab, setMoodTab] = useState<MoodGender>("female");
  const messageUnread = chatUnread?.unread ?? 0;

  const datingStart = useMemo(() => {
    if (!data?.couple) return null;
    return (
      data.couple.datingStartedAt ??
      data.couple.anniversaryAt ??
      data.couple.createdAt
    );
  }, [data]);

  const dayCount = useMemo(() => {
    if (!datingStart) return 1;
    return daysTogether(datingStart);
  }, [datingStart]);

  const anniversaryToday = useMemo(() => {
    if (!datingStart) return false;
    if (!data?.couple.datingStartedAt && !data?.couple.anniversaryAt) {
      return false;
    }
    return isAnniversaryToday(datingStart);
  }, [data, datingStart]);

  const anniversaryYears = useMemo(() => {
    if (!datingStart || !anniversaryToday) return 0;
    return yearsSince(datingStart);
  }, [datingStart, anniversaryToday]);

  const birthdaysToday = useMemo(() => {
    if (!data) return [];
    return data.members
      .filter(
        (m) =>
          m.membership.birthDateAt &&
          isAnniversaryToday(m.membership.birthDateAt),
      )
      .map((m) => ({
        name:
          m.membership.partnerLabel ||
          m.user?.displayName ||
          "Your person",
        years: m.membership.birthDateAt
          ? yearsSince(m.membership.birthDateAt)
          : 0,
        mine: m.membership.userId === data.membership.userId,
      }));
  }, [data]);

  const justPaired = useMemo(() => {
    if (!data || data.couple.status !== "active") return false;
    const partner = data.members.find((m) => m.membership.role === "partner");
    if (!partner) return false;
    return Date.now() - partner.membership.joinedAt < 10 * 60_000;
  }, [data]);

  useEffect(() => {
    if (!moodOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMoodOpen(false);
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [moodOpen]);

  if (!data) {
    return <HomeSkeleton />;
  }

  const partnerPresence = data.presence.find(
    (p) => p.userId !== data.membership.userId,
  );
  const needsDatingDate =
    !data.couple.datingStartedAt && !data.couple.anniversaryAt;

  const partnerMember = data.members.find(
    (m) => m.membership.userId !== data.membership.userId,
  );
  const myMoodRaw = data.membership.currentMood;
  const myMood =
    myMoodRaw && isPartnerMoodKey(myMoodRaw) ? myMoodRaw : null;
  const myMoodGenderRaw = data.membership.moodGender;
  const myMoodGender: MoodGender =
    myMoodGenderRaw && isMoodGender(myMoodGenderRaw)
      ? myMoodGenderRaw
      : "female";
  const partnerMoodRaw = partnerMember?.membership.currentMood;
  const partnerMood =
    partnerMoodRaw && isPartnerMoodKey(partnerMoodRaw)
      ? partnerMoodRaw
      : null;
  const partnerMoodGenderRaw = partnerMember?.membership.moodGender;
  const partnerMoodGender: MoodGender =
    partnerMoodGenderRaw && isMoodGender(partnerMoodGenderRaw)
      ? partnerMoodGenderRaw
      : "female";
  const partnerMoodSrc = partnerMood
    ? partnerMoodIllustration(partnerMood, partnerMoodGender)
    : null;
  const myMoodSrc = myMood
    ? partnerMoodIllustration(myMood, myMoodGender)
    : null;

  async function onRegenerate() {
    setInviteBusy(true);
    try {
      await regenerateInvite({});
    } finally {
      setInviteBusy(false);
    }
  }

  async function onPickMood(mood: PartnerMoodKey | null) {
    setMoodBusy(true);
    try {
      await setCurrentMood(
        mood === null ? { mood: null } : { mood, gender: moodTab },
      );
      setMoodOpen(false);
    } finally {
      setMoodBusy(false);
    }
  }

  function openMoodPicker() {
    setMoodTab(myMood ? myMoodGender : "female");
    setMoodOpen(true);
  }

  return (
    <>
    <div className="samba-fade-up space-y-8">
      <ConfettiBurst
        fire={justPaired || anniversaryToday || birthdaysToday.length > 0}
      />

      {anniversaryToday ? (
        <CelebrationCard
          kind="anniversary"
          illustration="/brand/celebrate/anniversary.png"
          title={
            anniversaryYears <= 0
              ? "Happy anniversary"
              : `Happy ${anniversaryYears}-year anniversary`
          }
          body={`Today marks another year of ${data.couple.name}. You’re on day ${dayCount} — soft cheers from Samba.`}
        />
      ) : null}

      {birthdaysToday.map((b) => (
        <CelebrationCard
          key={b.name}
          kind="birthday"
          illustration="/brand/celebrate/birthday.png"
          title={b.mine ? "Happy birthday to you" : `Happy birthday, ${b.name}`}
          body={
            b.mine
              ? "Your person gets a reminder too — make today gentle and a little special."
              : `It’s ${b.name}’s day. Leave a note, send a soft signal, or plan something small.`
          }
        />
      ))}

      <section className="samba-panel relative overflow-hidden px-6 py-10">
        {!moodOpen ? (
          <div
            aria-hidden
            className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[color:var(--samba-glow)]/40 blur-2xl"
          />
        ) : null}

        <div className="absolute right-4 top-4 z-10 flex flex-col items-center gap-2 sm:right-6 sm:top-6">
          {partnerMoodSrc ? (
            <div
              className="flex h-24 w-[4.75rem] items-center justify-center overflow-hidden rounded-[999px] border border-[color:var(--samba-border)] bg-[color:var(--samba-surface)] shadow-sm sm:h-28 sm:w-[5.5rem]"
              title={
                partnerMember?.membership.moodUpdatedAt
                  ? formatRelative(partnerMember.membership.moodUpdatedAt)
                  : undefined
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={partnerMoodSrc}
                alt=""
                className="h-[85%] w-[85%] object-contain"
              />
            </div>
          ) : (
            <div className="flex h-24 w-[4.75rem] items-center justify-center rounded-[999px] border border-dashed border-[color:var(--samba-border)] bg-[color:var(--samba-surface)]/60 sm:h-28 sm:w-[5.5rem]" />
          )}

          {myMoodSrc ? (
            <button
              type="button"
              className="flex h-16 w-12 items-center justify-center overflow-hidden rounded-[999px] border border-[color:var(--samba-border)] bg-[color:var(--samba-elevated)] shadow-sm transition hover:border-[color:var(--samba-accent)] sm:h-[4.5rem] sm:w-14"
              aria-label="Update your mood"
              onClick={openMoodPicker}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={myMoodSrc}
                alt=""
                className="h-[85%] w-[85%] object-contain"
              />
            </button>
          ) : (
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--samba-border)] bg-[color:var(--samba-elevated)] text-[color:var(--samba-ink)] shadow-sm transition hover:border-[color:var(--samba-accent)]"
              aria-label="Update your mood"
              onClick={openMoodPicker}
            >
              <Plus className="size-5" strokeWidth={2} />
            </button>
          )}
        </div>

        <div className="relative flex flex-col gap-6 pr-[6.5rem] md:flex-row md:items-end md:justify-between md:pr-36">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
              Day {dayCount}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight md:text-5xl">
              {data.couple.name}
            </h1>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex -space-x-3">
                {data.members.map((m) => (
                  <div
                    key={m.membership._id}
                    className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[color:var(--samba-border)] text-sm font-bold text-[color:var(--samba-ink)]"
                    style={{ background: m.membership.color }}
                    title={m.membership.partnerLabel}
                  >
                    {m.user?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.user.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (m.membership.partnerLabel[0] ?? "?").toUpperCase()
                    )}
                  </div>
                ))}
              </div>
              <p className="text-sm text-[color:var(--samba-ink)]/65">
                {data.couple.status === "pending_partner"
                  ? "Waiting for your person…"
                  : partnerPresence
                    ? `Partner last seen ${formatRelative(partnerPresence.lastSeenAt)}`
                    : "Both of you belong here"}
              </p>
            </div>
            {needsDatingDate ? (
              <p className="mt-4 text-sm text-[color:var(--samba-muted)]">
                Day count starts from when you created this space.{" "}
                <Link
                  href="/couple"
                  className="font-semibold text-[color:var(--samba-accent)] underline"
                >
                  Add when you started dating
                </Link>{" "}
                for an accurate Day N and anniversary.
              </p>
            ) : null}
          </div>

          {data.couple.status === "pending_partner" && data.openInvite ? (
            <div className="rounded-2xl bg-[color:var(--samba-accent)]/10 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--samba-accent)]">
                Invite code
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-[0.2em]">
                {data.openInvite}
              </p>
              <p className="mt-2 max-w-xs text-sm text-[color:var(--samba-ink)]/65">
                Share{" "}
                <span className="font-semibold">/invite/{data.openInvite}</span>{" "}
                so they can join with their own login.
              </p>
              {data.membership.role === "creator" ? (
                <button
                  type="button"
                  className="mt-3 text-xs font-semibold text-[color:var(--samba-accent)] underline"
                  disabled={inviteBusy}
                  onClick={() => void onRegenerate()}
                >
                  {inviteBusy ? "Refreshing…" : "Regenerate code"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            href: "/chat",
            title: "Chat",
            body: "Whisper, send photos, leave little notes.",
            badge: messageUnread,
          },
          {
            href: "/play",
            title: "Play",
            body: "Truth or Dare and more — play together.",
            badge: 0,
          },
          {
            href: "/moments",
            title: "Moments",
            body: "Keep them private, or publish to the Wall.",
            badge: 0,
          },
        ].map((card, i) => (
          <Link
            key={card.href}
            href={card.href}
            className="samba-fade-up group samba-panel relative rounded-[1.5rem] p-6 transition hover:border-[color:var(--samba-border-strong)]"
            style={{ animationDelay: `${0.08 * (i + 1)}s` }}
          >
            {card.badge > 0 ? (
              <span className="absolute right-4 top-4 flex h-6 min-w-6 items-center justify-center rounded-full bg-[color:var(--samba-ink)] px-1.5 text-xs font-bold text-[color:var(--samba-elevated)]">
                {card.badge > 99 ? "99+" : card.badge}
              </span>
            ) : null}
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight group-hover:text-[color:var(--samba-accent)]">
              {card.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--samba-ink)]/65">
              {card.body}
            </p>
          </Link>
        ))}
      </section>
    </div>

      {moodOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain bg-[color:var(--background)]/95 px-4 pb-10 pt-[max(3.5rem,calc(env(safe-area-inset-top)+2.5rem))] backdrop-blur-md"
              role="dialog"
              aria-modal="true"
              aria-label="Choose your mood"
              onClick={() => setMoodOpen(false)}
            >
              <div
                className="mb-8 w-full max-w-lg rounded-[1.5rem] border border-[color:var(--samba-border)] bg-[color:var(--samba-elevated)] p-5 shadow-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
                      now?
                    </h2>
                    <p className="mt-1 text-sm text-[color:var(--samba-muted)]">
                      Your person will see this on Home.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-[color:var(--samba-surface)]"
                    aria-label="Close"
                    onClick={() => setMoodOpen(false)}
                  >
                    <XClose className="size-5" strokeWidth={2} />
                  </button>
                </div>

                <div
                  className="mb-4 grid grid-cols-2 gap-1 rounded-full border border-[color:var(--samba-border)] bg-[color:var(--samba-surface)] p-1"
                  role="tablist"
                  aria-label="Illustration style"
                >
                  {(["female", "male"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={moodTab === tab}
                      className={`rounded-full px-3 py-2 text-sm font-semibold capitalize transition ${
                        moodTab === tab
                          ? "bg-[color:var(--samba-elevated)] text-[color:var(--samba-ink)] shadow-sm"
                          : "text-[color:var(--samba-muted)] hover:text-[color:var(--samba-ink)]"
                      }`}
                      onClick={() => setMoodTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {(Object.keys(PARTNER_MOODS) as PartnerMoodKey[]).map(
                    (key) => {
                      const mood = PARTNER_MOODS[key];
                      const selected =
                        myMood === key && myMoodGender === moodTab;
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={moodBusy}
                          onClick={() => void onPickMood(key)}
                          className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition ${
                            selected
                              ? "border-[color:var(--samba-accent)] bg-[color:var(--samba-accent)]/10"
                              : "border-[color:var(--samba-border)] hover:border-[color:var(--samba-accent)]/50"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mood.illustrations[moodTab]}
                            alt=""
                            className="h-14 w-11 object-contain"
                          />
                          <span className="text-[11px] font-semibold leading-tight text-[color:var(--samba-ink)]">
                            {mood.label}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>

                {myMood ? (
                  <button
                    type="button"
                    className="mt-4 w-full rounded-full border border-[color:var(--samba-border)] px-4 py-2.5 text-sm font-semibold text-[color:var(--samba-muted)] transition hover:bg-[color:var(--samba-surface)]"
                    disabled={moodBusy}
                    onClick={() => void onPickMood(null)}
                  >
                    Clear my mood
                  </button>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
