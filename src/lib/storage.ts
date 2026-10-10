import "server-only";
import { randomUUID } from "node:crypto";
import { EXTENSIONS, MEDIA_BUCKET, UPLOAD_KINDS, VERIFICATION_BUCKET, type UploadKind } from "@/config/uploads";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Every file a creator uploads lives under <bucket>/<userId>/<kind>/ (bucket
 * "media" for public page files, "verification" for private screenshots). The server
 * picks the path, so a creator can never write into someone else's folder.
 */

export type UploadTicket = { path: string; token: string };
export type UploadError = "type" | "size" | "failed";

export async function createUploadTicket(
  userId: string,
  kind: UploadKind,
  contentType: string,
  size: number,
): Promise<UploadTicket | { error: UploadError }> {
  const rule = UPLOAD_KINDS[kind];
  if (!(rule.types as readonly string[]).includes(contentType)) return { error: "type" };
  if (!Number.isFinite(size) || size <= 0 || size > rule.maxBytes) return { error: "size" };

  const path = `${userId}/${kind}/${randomUUID()}.${EXTENSIONS[contentType]}`;
  const { data, error } = await createSupabaseAdmin().storage.from(rule.bucket).createSignedUploadUrl(path);
  if (error || !data) return { error: "failed" };
  return { path: data.path, token: data.token };
}

/** True when `path` is in this user's folder for `kind` and the file was actually uploaded. */
export async function isOwnUploadedFile(userId: string, kind: UploadKind, path: string): Promise<boolean> {
  const prefix = `${userId}/${kind}/`;
  if (!path.startsWith(prefix) || path.includes("..")) return false;
  const name = path.slice(prefix.length);
  if (!/^[0-9a-f-]{36}\.[a-z0-9]{2,4}$/.test(name)) return false;
  const { data } = await createSupabaseAdmin().storage.from(UPLOAD_KINDS[kind].bucket).list(`${userId}/${kind}`, { search: name, limit: 1 });
  return !!data?.some((f) => f.name === name);
}

export function publicFileUrl(path: string): string {
  return `${supabaseEnv().url}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

/** Storage path of one of our public file URLs, or null for anything else (e.g. demo assets). */
export function pathFromPublicUrl(url: string | null | undefined): string | null {
  const prefix = `${supabaseEnv().url}/storage/v1/object/public/${MEDIA_BUCKET}/`;
  return url?.startsWith(prefix) ? url.slice(prefix.length) : null;
}

/** Best-effort removal of files that are no longer used. */
export async function removeFiles(paths: (string | null)[]) {
  const list = paths.filter((p): p is string => !!p);
  if (list.length) await createSupabaseAdmin().storage.from(MEDIA_BUCKET).remove(list);
}

/** Short-lived link to a private verification screenshot (staff review only). */
export async function signedVerificationUrl(path: string, seconds = 600): Promise<string | null> {
  const { data } = await createSupabaseAdmin().storage.from(VERIFICATION_BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

export async function removeVerificationFiles(paths: string[]) {
  if (paths.length) await createSupabaseAdmin().storage.from(VERIFICATION_BUCKET).remove(paths);
}

/** A private screenshot as base64 for the AI reader (null if missing or too big for the API). */
export async function readPrivateImage(path: string): Promise<{ data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" } | null> {
  const ext = path.split(".").pop();
  const mediaType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "jpg" ? "image/jpeg" : null;
  if (!mediaType) return null;
  const { data } = await createSupabaseAdmin().storage.from(VERIFICATION_BUCKET).download(path);
  if (!data || data.size > 5 * 1024 * 1024) return null;
  return { data: Buffer.from(await data.arrayBuffer()).toString("base64"), mediaType };
}
