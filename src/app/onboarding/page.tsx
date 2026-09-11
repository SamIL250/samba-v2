"use client";

import { FormEvent, startTransition, useEffect, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { EnsureUser } from "@/components/EnsureUser";
import { SambaMark } from "@/components/SambaLogo";
import { FieldKey, mapOnboardingError } from "@/lib/errors";
import { THEMES, type ThemeKey } from "@/lib/theme";

type FieldErrors = Partial<Record<FieldKey, string>>;

export default function OnboardingPage() {
  const me = useQuery(api.users.me);
  const createCouple = useMutation(api.couples.create);
  const joinWithCode = useMutation(api.couples.joinWithCode);
  const router = useRouter();

  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [theme, setTheme] = useState<ThemeKey>("ocean");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const shouldLeave = Boolean(me?.membership) || done;

  useEffect(() => {
    if (!shouldLeave) return;
    startTransition(() => {
      router.replace("/home");
    });
  }, [shouldLeave, router]);

  function clearField(field: FieldKey) {
    setErrors((prev) => {
      if (!prev[field] && !prev.form) return prev;
      const next = { ...prev };
      delete next[field];
      delete next.form;
      return next;
    });
  }

  function switchMode(next: "create" | "join") {
    setMode(next);
    setErrors({});
  }

  if (me === undefined || shouldLeave) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="animate-pulse text-sm opacity-60">
          {shouldLeave ? "Opening your space…" : "Loading…"}
        </p>
      </div>
    );
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const next: FieldErrors = {};
    if (name.trim().length < 2) {
      next.name = "Choose a name with at least 2 characters";
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setBusy(true);
    setErrors({});
    try {
      await createCouple({
        name,
        partnerLabel: label || me?.user.displayName || "Me",
        theme,
      });
      setDone(true);
    } catch (err) {
      const mapped = mapOnboardingError(err, "create");
      setErrors({ [mapped.field]: mapped.message });
      setBusy(false);
    }
  }

  async function onJoin(e: FormEvent) {
    e.preventDefault();
    const next: FieldErrors = {};
    if (code.trim().length < 4) {
      next.code = "Enter the full invite code";
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setBusy(true);
    setErrors({});
    try {
      await joinWithCode({
        code,
        partnerLabel: label || me?.user.displayName || "Me",
      });
      setDone(true);
    } catch (err) {
      const mapped = mapOnboardingError(err, "join");
      setErrors({ [mapped.field]: mapped.message });
      setBusy(false);
    }
  }

  return (
    <EnsureUser>
      <div
        className="flex min-h-screen items-center justify-center bg-white px-4 py-12"
        style={{ color: "var(--samba-ink)" }}
      >
        <div className="w-full max-w-lg">
          <div className="mb-8">
            <SambaMark size={56} priority />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
            Welcome
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
            Make it a two-person space
          </h1>
          <p className="mt-2 text-[color:var(--samba-muted)]">
            Create a couple and invite your person, or join with a code they
            shared.
          </p>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              className={mode === "create" ? "samba-btn" : "samba-btn-ghost"}
              onClick={() => switchMode("create")}
            >
              Create
            </button>
            <button
              type="button"
              className={mode === "join" ? "samba-btn" : "samba-btn-ghost"}
              onClick={() => switchMode("join")}
            >
              Join
            </button>
          </div>

          {errors.form ? (
            <p className="samba-field-hint mt-4" role="alert">
              {errors.form}
            </p>
          ) : null}

          {mode === "create" ? (
            <form onSubmit={onCreate} className="mt-6 space-y-4" noValidate>
              <label className="block space-y-1.5">
                <span
                  className={`text-sm font-medium ${errors.name ? "samba-field-error" : ""}`}
                >
                  {errors.name ? errors.name : "Couple name"}
                </span>
                <input
                  className={`samba-input ${errors.name ? "samba-input-error" : ""}`}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearField("name");
                  }}
                  placeholder="e.g. Alex & Sam"
                  required
                  minLength={2}
                  aria-invalid={Boolean(errors.name)}
                />
              </label>
              <label className="block space-y-1.5">
                <span
                  className={`text-sm font-medium ${errors.label ? "samba-field-error" : ""}`}
                >
                  {errors.label ? errors.label : "Your label"}
                </span>
                <input
                  className={`samba-input ${errors.label ? "samba-input-error" : ""}`}
                  value={label}
                  onChange={(e) => {
                    setLabel(e.target.value);
                    clearField("label");
                  }}
                  placeholder={me?.user.displayName ?? "Your name in chat"}
                  aria-invalid={Boolean(errors.label)}
                />
              </label>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">Theme</legend>
                <p className="text-sm text-[color:var(--samba-muted)]">
                  Pick the mood for your shared space.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
                    const selected = theme === key;
                    const t = THEMES[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTheme(key)}
                        aria-pressed={selected}
                        className="overflow-hidden rounded-2xl text-left transition"
                        style={{
                          border: selected
                            ? `1.5px solid ${t.accent}`
                            : "1px solid var(--samba-border)",
                          background: "#fff",
                        }}
                      >
                        <div className="relative aspect-[4/3] w-full bg-[color:var(--samba-surface)]">
                          <Image
                            src={t.preview}
                            alt={`${t.label} theme preview`}
                            fill
                            sizes="(max-width: 640px) 45vw, 220px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ background: t.accent }}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold tracking-tight">
                              {t.label}
                            </p>
                            <p className="text-xs text-[color:var(--samba-muted)]">
                              {t.blurb}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <button className="samba-btn w-full" disabled={busy} type="submit">
                {busy ? "Creating…" : "Create couple"}
              </button>
            </form>
          ) : (
            <form onSubmit={onJoin} className="mt-6 space-y-4" noValidate>
              <label className="block space-y-1.5">
                <span
                  className={`text-sm font-medium ${errors.code ? "samba-field-error" : ""}`}
                >
                  {errors.code ? errors.code : "Invite code"}
                </span>
                <input
                  className={`samba-input uppercase tracking-[0.2em] ${errors.code ? "samba-input-error" : ""}`}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    clearField("code");
                  }}
                  placeholder="ABCD1234"
                  required
                  aria-invalid={Boolean(errors.code)}
                />
              </label>
              <label className="block space-y-1.5">
                <span
                  className={`text-sm font-medium ${errors.label ? "samba-field-error" : ""}`}
                >
                  {errors.label ? errors.label : "Your label"}
                </span>
                <input
                  className={`samba-input ${errors.label ? "samba-input-error" : ""}`}
                  value={label}
                  onChange={(e) => {
                    setLabel(e.target.value);
                    clearField("label");
                  }}
                  placeholder={me?.user.displayName ?? "Your name in chat"}
                  aria-invalid={Boolean(errors.label)}
                />
              </label>
              <button className="samba-btn w-full" disabled={busy} type="submit">
                {busy ? "Joining…" : "Join couple"}
              </button>
            </form>
          )}
        </div>
      </div>
    </EnsureUser>
  );
}
