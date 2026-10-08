"use client";

import { MEDIA_BUCKET, UPLOAD_KINDS, type UploadKind } from "@/config/uploads";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { requestUpload } from "@/app/[locale]/(site)/dashboard/upload-actions";

export type ClientUploadError = "type" | "size" | "failed";

/**
 * Shrinks a photo before upload: longest side at most `maxSide`, saved as JPEG.
 * Smaller uploads on mobile data and faster pages. Other files pass through.
 */
export async function shrinkImage(file: File, maxSide = 1600, quality = 0.85): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.type === "image/jpeg" && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

/** Checks, asks the server for a signed URL, uploads, and returns the storage path. */
export async function uploadFile(kind: UploadKind, file: File): Promise<{ path: string } | { error: ClientUploadError }> {
  const rule = UPLOAD_KINDS[kind];
  if (!(rule.types as readonly string[]).includes(file.type)) return { error: "type" };
  if (file.size > rule.maxBytes) return { error: "size" };

  const ticket = await requestUpload(kind, file.type, file.size);
  if ("error" in ticket) return { error: ticket.error };
  const { error } = await createSupabaseBrowser()
    .storage.from(MEDIA_BUCKET)
    .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type, cacheControl: "31536000" });
  return error ? { error: "failed" } : { path: ticket.path };
}
