"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { EnsureUser } from "@/components/EnsureUser";
import { SambaMark } from "@/components/SambaLogo";
import { THEMES, type ThemeKey } from "@/lib/theme";

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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (me === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="animate-pulse text-sm opacity-60">Loading…</p>
      </div>
    );
  }

  if (me?.membership) {
    router.replace("/home");
    return null;
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createCouple({
        name,
        partnerLabel: label || me?.user.displayName || "Me",
        theme,
      });
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create couple");
    } finally {
      setBusy(false);
    }
  }

  async function onJoin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await joinWithCode({
        code,
        partnerLabel: label || me?.user.displayName || "Me",
      });
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join");
    } finally {
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
          <h1 className="mt-2 font-[family-name:var(--font-display)] font-bold tracking-tight text-3xl">
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
              onClick={() => setMode("create")}
            >
              Create
            </button>
            <button
              type="button"
              className={mode === "join" ? "samba-btn" : "samba-btn-ghost"}
              onClick={() => setMode("join")}
            >
              Join
            </button>
          </div>

          {mode === "create" ? (
            <form onSubmit={onCreate} className="mt-6 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Couple name</span>
                <input
                  className="samba-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex & Sam"
                  required
                  minLength={2}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Your label</span>
                <input
                  className="samba-input"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={me?.user.displayName ?? "Your name in chat"}
                />
              </label>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Theme</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTheme(key)}
                      className="rounded-xl px-3 py-3 text-sm font-semibold"
                      style={{
                        background: THEMES[key].surface,
                        color: THEMES[key].ink,
                        border:
                          theme === key
                            ? `1.5px solid ${THEMES[key].accent}`
                            : "1px solid var(--samba-border)",
                      }}
                    >
                      {THEMES[key].label}
                    </button>
                  ))}
                </div>
              </fieldset>
              {error ? <p className="text-sm text-[#B45309]">{error}</p> : null}
              <button className="samba-btn w-full" disabled={busy} type="submit">
                {busy ? "Creating…" : "Create couple"}
              </button>
            </form>
          ) : (
            <form onSubmit={onJoin} className="mt-6 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Invite code</span>
                <input
                  className="samba-input uppercase tracking-[0.2em]"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="ABCD1234"
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Your label</span>
                <input
                  className="samba-input"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={me?.user.displayName ?? "Your name in chat"}
                />
              </label>
              {error ? <p className="text-sm text-[#B45309]">{error}</p> : null}
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
