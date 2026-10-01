"use client";

import { useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Plus, StickerSquare, Trash01 } from "@untitledui/icons";
import { api, type Id } from "@/lib/api";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { fileToSticker } from "@/lib/stickers";

type Props = {
  coupleId: Id<"couples">;
  conversationId: Id<"conversations">;
  replyToId?: Id<"messages">;
  onSent: () => void;
  onError: (message: string) => void;
};

export function StickerPicker({
  coupleId,
  conversationId,
  replyToId,
  onSent,
  onError,
}: Props) {
  const stickers = useQuery(api.stickers.list, {});
  const importSticker = useMutation(api.stickers.importSticker);
  const removeSticker = useMutation(api.stickers.remove);
  const sendSticker = useMutation(api.stickers.sendSticker);
  const confirmMedia = useMutation(api.media.confirm);
  const getSignature = useAction(api.mediaActions.createUploadSignature);

  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<Id<"stickers"> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;

    setBusy(true);
    onError("");
    try {
      const sticker = await fileToSticker(file);
      const signature = await getSignature({ coupleId });
      const uploaded = await uploadToCloudinary(sticker.file, signature);
      const mediaId = await confirmMedia({
        coupleId,
        cloudinaryPublicId: uploaded.public_id,
        resourceType: uploaded.resource_type,
        width: uploaded.width ?? sticker.width,
        height: uploaded.height ?? sticker.height,
        format: uploaded.format,
        secureUrl: uploaded.secure_url,
      });
      await importSticker({ mediaId, label: file.name.replace(/\.[^.]+$/, "") });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn’t add that sticker");
    } finally {
      setBusy(false);
    }
  }

  async function onSend(stickerId: Id<"stickers">) {
    if (busy) return;
    setBusy(true);
    onError("");
    try {
      await sendSticker({ conversationId, stickerId, replyToId });
      onSent();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn’t send that sticker");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(stickerId: Id<"stickers">) {
    if (busy) return;
    setRemovingId(stickerId);
    onError("");
    try {
      await removeSticker({ stickerId });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn’t remove that sticker");
    } finally {
      setRemovingId(null);
    }
  }

  const isEmpty = Array.isArray(stickers) && stickers.length === 0;

  return (
    <div className="w-[min(20.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-[color:var(--samba-border)] bg-[color:var(--samba-elevated)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[color:var(--samba-border)] px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--samba-muted)]">
          Stickers
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1 rounded-full border border-[color:var(--samba-border)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--samba-ink)] transition hover:border-[color:var(--samba-accent)] disabled:opacity-55"
        >
          {busy ? (
            <span
              className="samba-spin block size-3 rounded-full border-2 border-[color:var(--samba-ink)] border-t-transparent"
              aria-hidden
            />
          ) : (
            <Plus className="size-3.5" strokeWidth={2.5} />
          )}
          Add
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto p-3">
        {!stickers ? null : isEmpty ? (
          <div className="px-2 py-6 text-center">
            <StickerSquare
              className="mx-auto size-7 text-[color:var(--samba-muted)]"
              strokeWidth={1.5}
            />
            <p className="mt-2 text-xs leading-relaxed text-[color:var(--samba-muted)]">
              No stickers yet. Tap{" "}
              <span className="font-semibold text-[color:var(--samba-ink)]">
                Add
              </span>{" "}
              and pick a photo — we’ll size it down for you.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {stickers.map((sticker) => (
              <div key={sticker._id} className="group relative">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onSend(sticker._id)}
                  className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-[color:var(--samba-surface)] p-1.5 transition hover:bg-[color:var(--samba-accent)]/15 disabled:opacity-55"
                  aria-label="Send sticker"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sticker.url}
                    alt=""
                    loading="lazy"
                    className="max-h-full max-w-full object-contain"
                  />
                </button>
                <button
                  type="button"
                  disabled={busy || removingId === sticker._id}
                  onClick={() => void onRemove(sticker._id)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--samba-elevated)] text-[color:var(--samba-muted)] opacity-0 shadow-sm transition group-hover:opacity-100 focus-visible:opacity-100 hover:text-[#B45309] disabled:opacity-55"
                  aria-label="Remove sticker from pack"
                >
                  <Trash01 className="size-3" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={busy}
        onChange={(e) => void onImport(e)}
      />
    </div>
  );
}
