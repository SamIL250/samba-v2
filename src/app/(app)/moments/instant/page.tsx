"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera01, Image01, VideoRecorder } from "@untitledui/icons";
import { api } from "@/lib/api";
import { uploadToCloudinary } from "@/lib/cloudinary";

const MAX_VIDEO_BYTES = 5 * 1024 * 1024;

export default function InstantMomentPage() {
  const couple = useQuery(api.couples.myCouple);
  const create = useMutation(api.moments.create);
  const confirmMedia = useMutation(api.media.confirm);
  const getSignature = useAction(api.mediaActions.createUploadSignature);
  const router = useRouter();

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    url: string;
    kind: "image" | "video";
  } | null>(null);

  async function uploadAndSave(file: File) {
    if (!couple) return;

    if (file.type.startsWith("video/") && file.size > MAX_VIDEO_BYTES) {
      setError("Videos must be under 5MB");
      return;
    }
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Choose a photo or a short video");
      return;
    }

    setBusy(true);
    setError(null);
    const localUrl = URL.createObjectURL(file);
    setPreview({
      url: localUrl,
      kind: file.type.startsWith("video/") ? "video" : "image",
    });

    try {
      const signature = await getSignature({ coupleId: couple.couple._id });
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
      await create({
        mediaIds: [mediaId],
        visibility: "private",
      });
      router.push("/moments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t save instant moment");
      setBusy(false);
    } finally {
      URL.revokeObjectURL(localUrl);
    }
  }

  function onFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (file) void uploadAndSave(file);
  }

  return (
    <div className="samba-fade-up mx-auto max-w-md space-y-5">
      <div className="flex items-start gap-3">
        <Link
          href="/moments"
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-[color:var(--samba-surface)]"
          aria-label="Back to moments"
        >
          <ArrowLeft className="size-5" strokeWidth={2} />
        </Link>
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--samba-accent)]">
            Instant
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
            Snap & save
          </h1>
          <p className="mt-1 text-sm text-[color:var(--samba-muted)]">
            Photo or short video under 5MB — no caption, no mood.
          </p>
        </div>
      </div>

      <div className="samba-panel overflow-hidden p-5 sm:p-6">
        {preview ? (
          <div className="relative mb-5 overflow-hidden rounded-2xl bg-[color:var(--samba-surface)]">
            {preview.kind === "video" ? (
              <video
                src={preview.url}
                className="aspect-[4/5] w-full object-cover"
                controls
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.url}
                alt=""
                className="aspect-[4/5] w-full object-cover"
              />
            )}
            {busy ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                <p className="rounded-full bg-[color:var(--samba-elevated)] px-4 py-2 text-sm font-semibold">
                  Saving…
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mb-5 rounded-2xl border border-dashed border-[color:var(--samba-border-strong)] bg-[color:var(--samba-surface)]/70 px-4 py-8 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/moments/moments-upload.png"
              alt=""
              className="mx-auto mb-3 h-32 w-32 object-contain"
            />
            <p className="text-sm font-semibold">Ready when you are</p>
            <p className="mt-1 text-xs text-[color:var(--samba-muted)]">
              One tap — camera, gallery, or a tiny video.
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={busy || !couple}
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-2xl border border-[color:var(--samba-border)] bg-[color:var(--samba-elevated)] px-2 py-4 text-xs font-semibold transition hover:border-[color:var(--samba-accent)] disabled:opacity-55"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--samba-surface)]">
              <Camera01 className="size-5" strokeWidth={1.75} />
            </span>
            Camera
          </button>
          <button
            type="button"
            disabled={busy || !couple}
            onClick={() => galleryRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-2xl border border-[color:var(--samba-border)] bg-[color:var(--samba-elevated)] px-2 py-4 text-xs font-semibold transition hover:border-[color:var(--samba-accent)] disabled:opacity-55"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--samba-surface)]">
              <Image01 className="size-5" strokeWidth={1.75} />
            </span>
            Photo
          </button>
          <button
            type="button"
            disabled={busy || !couple}
            onClick={() => videoRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-2xl border border-[color:var(--samba-border)] bg-[color:var(--samba-elevated)] px-2 py-4 text-xs font-semibold transition hover:border-[color:var(--samba-accent)] disabled:opacity-55"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--samba-surface)]">
              <VideoRecorder className="size-5" strokeWidth={1.75} />
            </span>
            Video
          </button>
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={busy}
          onChange={onFileInput}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={onFileInput}
        />
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          disabled={busy}
          onChange={onFileInput}
        />

        {error ? (
          <p className="mt-4 text-center text-sm text-[#B45309]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
