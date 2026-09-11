"use client";

import { FormEvent, startTransition, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Show, SignInButton } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { SambaLogo } from "@/components/SambaLogo";
import { EnsureUser } from "@/components/EnsureUser";
import { cleanErrorMessage } from "@/lib/errors";

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
  const [done, setDone] = useState(false);

  const shouldLeave = Boolean(me?.membership) || done;

  useEffect(() => {
    if (!shouldLeave) return;
    startTransition(() => {
      router.replace("/home");
    });
  }, [shouldLeave, router]);

  async function onJoin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await join({
        code,
        partnerLabel: label || me?.user.displayName || "Partner",
      });
      setDone(true);
    } catch (err) {
      setError(cleanErrorMessage(err, "Could not join this couple"));
      setBusy(false);
    }
  }

  if (shouldLeave) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="animate-pulse text-sm opacity-60">Opening your space…</p>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-white px-4 py-12"
      style={{ color: "var(--samba-ink)" }}
    >
      <div className="w-full max-w-md p-8">
        <SambaLogo href="/" size={48} />
        {preview === undefined ? (
          <p className="mt-4 animate-pulse text-sm opacity-60">Checking invite…</p>
        ) : preview === null ? (
          <>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
              Invite not found
            </h1>
            <p className="mt-2 text-[color:var(--samba-muted)]">
              This code may be expired, used, or mistyped. Ask your person for a
              fresh one.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
              You&apos;re invited to {preview.coupleName}
            </h1>
            <p className="mt-2 text-[color:var(--samba-muted)]">
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
                <form onSubmit={onJoin} className="mt-6 space-y-4">
                  <label className="block space-y-1.5">
                    <span
                      className={`text-sm font-medium ${error ? "samba-field-error" : ""}`}
                    >
                      {error ?? "Your label"}
                    </span>
                    <input
                      className={`samba-input ${error ? "samba-input-error" : ""}`}
                      value={label}
                      onChange={(e) => {
                        setLabel(e.target.value);
                        setError(null);
                      }}
                      placeholder={me?.user.displayName ?? "Your name"}
                      aria-invalid={Boolean(error)}
                    />
                  </label>
                  <button className="samba-btn w-full" disabled={busy} type="submit">
                    {busy ? "Joining…" : "Join this couple"}
                  </button>
                </form>
              </EnsureUser>
            </Show>
          </>
        )}
      </div>
    </div>
  );
}
