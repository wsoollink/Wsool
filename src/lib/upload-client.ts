"use client";

import { MEDIA_BUCKET, UPLOAD_KINDS, type UploadKind } from "@/config/uploads";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { requestUpload } from "@/app/[locale]/(site)/dashboard/upload-actions";

export type ClientUploadError = "type" | "size" | "failed";

/**
 * Shrinks a photo before upload: longest side at most `maxSide`, saved as JPEG
 * (or WebP for logos, which keeps transparency). Smaller uploads on mobile data
 * and faster pages. Other files pass through.
 */
export async function shrinkImage(file: File, maxSide = 1600, quality = 0.85, outType: "image/jpeg" | "image/webp" = "image/jpeg"): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.type === outType && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outType, quality));
    // A browser without WebP encoding returns PNG; keep the original then.
    if (!blob || blob.type !== outType) return file;
    return new File([blob], file.name.replace(/\.\w+$/, outType === "image/webp" ? ".webp" : ".jpg"), { type: outType });
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

/**
 * Grabs a frame near the start of a video as a JPEG cover. Returns null when
 * the browser can't decode the video (the creator can still pick a cover).
 */
export async function videoCover(file: File, at = 0.5): Promise<File | null> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("decode"));
      setTimeout(() => reject(new Error("timeout")), 15_000);
    });
    video.currentTime = Math.min(at, (video.duration || 1) / 2);
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      setTimeout(() => reject(new Error("timeout")), 10_000);
    });
    const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    if (!canvas.width || !canvas.height) return null;
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    return blob ? new File([blob], "cover.jpg", { type: "image/jpeg" }) : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
