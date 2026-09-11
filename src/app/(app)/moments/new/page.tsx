"use client";

import Link from "next/link";
import {
  FormEvent,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera01, Image01, XClose } from "@untitledui/icons";
import { api, type Id } from "@/lib/api";
import { uploadToCloudinary } from "@/lib/cloudinary";

const MOODS = [
  "cozy",
  "adventure",
  "silly",
  "romantic",
  "grateful",
  "wild",
] as const;

type Preview = {
  url: string;
  kind: "image" | "video";
};

export default function NewMomentPage() {
  const couple = useQuery(api.couples.myCouple);
  const create = useMutation(api.moments.create);
  const confirmMedia = useMutation(api.media.confirm);
  const getSignature = useAction(api.mediaActions.createUploadSignature);
  const router = useRouter();

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [caption, setCaption] = useState("");
  const [mood, setMood] = useState<(typeof MOODS)[number] | "">("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [mediaIds, setMediaIds] = useState<Id<"mediaAssets">[]>([]);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files || !couple) return;
    setBusy(true);
    setError(null);
    try {
      const signature = await getSignature({ coupleId: couple.couple._id });
      const nextIds: Id<"mediaAssets">[] = [];
      const nextPreviews: Preview[] = [];
      for (const file of Array.from(files).slice(0, 6 - mediaIds.length)) {
        if (!file.type.startsWith("image/")) {
          throw new Error("This form is for photos — use Instant for video");
        }
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
        nextPreviews.push({
          url: uploaded.secure_url,
          kind: "image",
        });
      }
      setMediaIds((prev) => [...prev, ...nextIds]);
      setPreviews((prev) => [...prev, ...nextPreviews]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function onFileInput(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    void onFiles(files);
  }

  function removePreview(index: number) {
    setMediaIds((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
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
    <div className="samba-fade-up mx-auto max-w-xl space-y-5">
      <div className="flex items-start gap-3">
        <Link
          href="/moments"
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-white/70"
          aria-label="Back to moments"
        >
          <ArrowLeft className="size-5" strokeWidth={2} />
        </Link>
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
            New moment
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
            Capture a little forever
          </h1>
        </div>
      </div>

      <form onSubmit={onSubmit} className="samba-panel space-y-5 p-5 sm:p-6">
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
                    ? "bg-[color:var(--samba-bubble-out)] text-[color:var(--samba-bubble-out-text)]"
                    : "bg-[color:var(--samba-surface)] text-[color:var(--samba-ink)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-3">
          <span className="text-sm font-medium">Photos</span>

          {previews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--samba-border-strong)] bg-[color:var(--samba-surface)]/70 px-4 py-6 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/moments/moments-upload.png"
                alt=""
                className="mx-auto mb-3 h-28 w-28 object-contain"
              />
              <p className="text-sm font-semibold text-[color:var(--samba-ink)]">
                Add a photo of this moment
              </p>
              <p className="mt-1 text-xs text-[color:var(--samba-muted)]">
                Take one now, or pick from your gallery.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => cameraRef.current?.click()}
                  className="samba-btn inline-flex items-center gap-2 px-4 py-2.5 text-sm"
                >
                  <Camera01 className="size-4" strokeWidth={1.75} />
                  Camera
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => galleryRef.current?.click()}
                  className="samba-btn-ghost inline-flex items-center gap-2 px-4 py-2.5 text-sm"
                >
                  <Image01 className="size-4" strokeWidth={1.75} />
                  Gallery
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {previews.map((preview, index) => (
                  <div
                    key={`${preview.url}-${index}`}
                    className="group relative aspect-square overflow-hidden rounded-xl"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100"
                      aria-label="Remove photo"
                      onClick={() => removePreview(index)}
                    >
                      <XClose className="size-3.5" strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
              {mediaIds.length < 6 ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => cameraRef.current?.click()}
                    className="samba-btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm"
                  >
                    <Camera01 className="size-4" strokeWidth={1.75} />
                    Camera
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => galleryRef.current?.click()}
                    className="samba-btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm"
                  >
                    <Image01 className="size-4" strokeWidth={1.75} />
                    Gallery
                  </button>
                </div>
              ) : null}
            </>
          )}

          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={busy || mediaIds.length >= 6}
            onChange={onFileInput}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={busy || mediaIds.length >= 6}
            onChange={onFileInput}
          />
          {busy ? (
            <p className="text-xs text-[color:var(--samba-muted)]">Uploading…</p>
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
                    ? "bg-[color:var(--samba-bubble-out)] text-[color:var(--samba-bubble-out-text)]"
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

        {error ? (
          <p className="text-sm text-[#B45309]" role="alert">
            {error}
          </p>
        ) : null}

        <button className="samba-btn w-full" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save moment"}
        </button>
      </form>
    </div>
  );
}
