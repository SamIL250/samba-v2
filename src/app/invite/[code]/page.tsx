"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Show, SignInButton } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { SambaLogo } from "@/components/SambaLogo";
import { EnsureUser } from "@/components/EnsureUser";

export default function InvitePage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const preview = useQuery(api.couples.getInvitePreview, code ? { code } : "skip");
  const me = useQuery(api.users.me);
  const join = useMutation(api.couples.joinWithCode);
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onJoin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await join({
        code,
        partnerLabel: label || me?.user.displayName || "Partner",
      });
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{
        background: "var(--samba-gradient)",
        color: "var(--samba-ink)",
      }}
    >
      <div className="w-full max-w-md p-8">
        <SambaLogo href="/" size={48} />
        {preview === undefined ? (
          <p className="mt-4 animate-pulse text-sm opacity-60">Checking invite…</p>
        ) : preview === null ? (
          <>
            <h1 className="mt-3 font-[family-name:var(--font-display)] font-bold tracking-tight text-3xl">
              Invite not found
            </h1>
            <p className="mt-2 text-[var(--samba-ink)]/65">
              This code may be expired, used, or mistyped. Ask your person for a
              fresh one.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-3 font-[family-name:var(--font-display)] font-bold tracking-tight text-3xl">
              You&apos;re invited to {preview.coupleName}
            </h1>
            <p className="mt-2 text-[var(--samba-ink)]/65">
              {preview.creatorName} opened a couple space and wants you in it —
              with your own login.
            </p>

            <Show when="signed-out">
              <div className="mt-6">
                <SignInButton mode="modal" forceRedirectUrl={`/invite/${code}`}>
                  <button className="samba-btn w-full">Sign in to join</button>
                </SignInButton>
              </div>
            </Show>

            <Show when="signed-in">
              <EnsureUser>
                {me?.membership ? (
                  <p className="mt-6 text-sm text-[var(--samba-ink)]/65">
                    You already belong to a couple.{" "}
                    <button
                      type="button"
                      className="font-semibold text-[var(--samba-accent)]"
                      onClick={() => router.push("/home")}
                    >
                      Go home
                    </button>
                  </p>
                ) : (
                  <form onSubmit={onJoin} className="mt-6 space-y-4">
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium">Your label</span>
                      <input
                        className="samba-input"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder={me?.user.displayName ?? "Your name"}
                      />
                    </label>
                    {error ? <p className="text-sm text-[#B45309]">{error}</p> : null}
                    <button className="samba-btn w-full" disabled={busy} type="submit">
                      {busy ? "Joining…" : "Join this couple"}
                    </button>
                  </form>
                )}
              </EnsureUser>
            </Show>
          </>
        )}
      </div>
    </div>
  );
}
