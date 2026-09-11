import type { Id } from "@/lib/api";

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

export async function uploadToCloudinary(
  file: File,
  signature: UploadSignature,
): Promise<{
  public_id: string;
  secure_url: string;
  resource_type: string;
  width?: number;
  height?: number;
  format?: string;
}> {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signature.apiKey);
  form.append("timestamp", String(signature.timestamp));
  form.append("signature", signature.signature);
  form.append("folder", signature.folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/auto/upload`,
    { method: "POST", body: form },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${text}`);
  }

  return await res.json();
}

export type ConfirmedMedia = {
  mediaId: Id<"mediaAssets">;
  secureUrl: string;
};
