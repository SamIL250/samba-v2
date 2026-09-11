"use client";

import { FormEvent, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { uploadToCloudinary } from "@/lib/cloudinary";
import type { Id } from "@/lib/api";

const MOODS = [
  "cozy",
  "adventure",
  "silly",
  "romantic",
  "grateful",
  "wild",
] as const;

export default function NewMomentPage() {
  const couple = useQuery(api.couples.myCouple);
  const create = useMutation(api.moments.create);
  const confirmMedia = useMutation(api.media.confirm);
  const getSignature = useAction(api.mediaActions.createUploadSignature);
  const router = useRouter();

  const [caption, setCaption] = useState("");
  const [mood, setMood] = useState<(typeof MOODS)[number] | "">("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [mediaIds, setMediaIds] = useState<Id<"mediaAssets">[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files || !couple) return;
    setBusy(true);
    setError(null);
    try {
      const signature = await getSignature({ coupleId: couple.couple._id });
      const nextIds: Id<"mediaAssets">[] = [];
      const nextPreviews: string[] = [];
      for (const file of Array.from(files).slice(0, 6 - mediaIds.length)) {
        const uploaded = await uploadToCloudinary(file, signature);
        const mediaId = await confirmMedia({
          coupleId: couple.couple._id,
          cloudinaryPublicId: uploaded.public_id,
          resourceType: uploaded.resource_type,
          width: uploaded.width,
          height: uploaded.height,
          format: uploaded.format,
          secureUrl: uploaded.secure_url,
        });
        nextIds.push(mediaId);
        nextPreviews.push(uploaded.secure_url);
      }
      setMediaIds((prev) => [...prev, ...nextIds]);
      setPreviews((prev) => [...prev, ...nextPreviews]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await create({
        caption,
        mood: mood || undefined,
        mediaIds,
        visibility,
      });
      router.push("/moments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save moment");
      setBusy(false);
    }
  }

  return (
    <div className="samba-fade-up mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
          New moment
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] font-bold tracking-tight text-3xl">
          Capture a little forever
        </h1>
      </div>

      <form onSubmit={onSubmit} className="samba-panel space-y-5 p-6">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Caption</span>
          <textarea
            className="samba-input min-h-28 resize-y"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What made this feel like yours?"
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Mood</legend>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(m === mood ? "" : m)}
                className={`rounded-full px-3 py-1.5 text-sm capitalize ${
                  mood === m
                    ? "bg-[color:var(--samba-accent)] text-[color:var(--samba-ink)]"
                    : "bg-[color:var(--samba-accent)]/10 text-[color:var(--samba-ink)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <span className="text-sm font-medium">Photos</span>
          <label className="samba-btn-ghost inline-flex cursor-pointer text-sm">
            {busy ? "Uploading…" : "Add photos"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={busy || mediaIds.length >= 6}
              onChange={(e) => void onFiles(e.target.files)}
            />
          </label>
          {previews.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="aspect-square rounded-xl object-cover"
                />
              ))}
            </div>
          ) : null}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Visibility</legend>
          <div className="flex gap-2">
            {(["private", "public"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisibility(v)}
                className={`rounded-full px-4 py-2 text-sm capitalize ${
                  visibility === v
                    ? "bg-[color:var(--samba-accent)] text-[color:var(--samba-ink)]"
                    : "samba-btn-ghost"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <p className="text-xs text-[color:var(--samba-ink)]/55">
            Public moments appear on the Wall for other authenticated couples.
          </p>
        </fieldset>

        {error ? <p className="text-sm text-[#B45309]">{error}</p> : null}

        <button className="samba-btn w-full" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save moment"}
        </button>
      </form>
    </div>
  );
}
