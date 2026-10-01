/**
 * Turns a gallery image into a small, chat-ready sticker.
 *
 * Stickers are capped at 256px on the longest side and re-encoded so they
 * stay light in the chat (target ~120KB, hard-limited by the format).
 * Transparency is preserved (WebP/PNG), which is what makes them read as
 * "stickers" rather than photos.
 */

const MAX_DIMENSION = 256;
const TARGET_MAX_BYTES = 120 * 1024;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export type StickerResult = {
  file: File;
  width: number;
  height: number;
};

type Drawable = CanvasImageSource & { width: number; height: number };

async function decodeImage(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Some formats (or browsers) can't go through createImageBitmap — fall back.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error("That file doesn’t look like an image we can open");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function supportsWebp(): boolean {
  try {
    return document
      .createElement("canvas")
      .toDataURL("image/webp")
      .startsWith("data:image/webp");
  } catch {
    return false;
  }
}

function hasTransparency(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): boolean {
  try {
    const { data } = ctx.getImageData(0, 0, width, height);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
  } catch {
    // Tainted canvas shouldn't happen (same-origin blob), assume transparency.
    return true;
  }
  return false;
}

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Returns the first encoding that fits the size budget, else the smallest. */
async function encodeSticker(
  canvas: HTMLCanvasElement,
  keepAlpha: boolean,
): Promise<Blob> {
  const attempts: Array<{ type: string; quality?: number }> = [];

  if (supportsWebp()) {
    attempts.push(
      { type: "image/webp", quality: 0.85 },
      { type: "image/webp", quality: 0.7 },
      { type: "image/webp", quality: 0.55 },
    );
  }
  if (keepAlpha) {
    attempts.push({ type: "image/png" });
  } else {
    attempts.push(
      { type: "image/jpeg", quality: 0.82 },
      { type: "image/png" },
    );
  }

  let smallest: Blob | null = null;
  for (const attempt of attempts) {
    const blob = await toBlob(canvas, attempt.type, attempt.quality);
    if (!blob || !blob.type) continue;
    if (blob.size <= TARGET_MAX_BYTES) return blob;
    if (!smallest || blob.size < smallest.size) smallest = blob;
  }

  if (!smallest) {
    throw new Error("Couldn’t process that image — try another one");
  }
  return smallest;
}

export async function fileToSticker(file: File): Promise<StickerResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Stickers need to be images");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("That image is too large (15MB max)");
  }

  const source = await decodeImage(file);
  const scale = Math.min(
    1,
    MAX_DIMENSION / source.width,
    MAX_DIMENSION / source.height,
  );
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Image processing isn’t supported on this device");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  if ("close" in source && typeof source.close === "function") source.close();

  const keepAlpha = hasTransparency(ctx, width, height);
  const blob = await encodeSticker(canvas, keepAlpha);
  const ext = blob.type.split("/")[1] ?? "png";

  return {
    file: new File([blob], `sticker-${Date.now()}.${ext}`, {
      type: blob.type,
      lastModified: Date.now(),
    }),
    width,
    height,
  };
}
