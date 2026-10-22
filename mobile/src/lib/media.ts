import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as VideoThumbnails from "expo-video-thumbnails";
import { rpc } from "./api";

/** Upload kinds and limits (same as the website, src/config/uploads.ts). */
export type UploadKind = "photo" | "logo" | "license" | "linkImage" | "couponLogo" | "thumb" | "video" | "verification" | "audienceShot";
const MAX: Record<UploadKind, number> = { photo: 8, logo: 4, license: 10, linkImage: 4, couponLogo: 4, thumb: 4, video: 50, verification: 10, audienceShot: 10 };

export type Picked = { uri: string; type: string; size: number; width?: number; height?: number };
export type UploadError = "type" | "size" | "failed" | "permission";

/** Pick a photo from the library, shrunk on the phone first (JPEG, or PNG for logos to keep transparency). */
export async function pickImage(opts: { maxSide?: number; png?: boolean } = {}): Promise<Picked | null | { error: UploadError }> {
  // The system photo picker (iOS PHPicker, Android photo picker) needs no library permission: nothing to ask.
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  const a = res.canceled ? null : res.assets[0];
  if (!a) return null;
  const max = opts.maxSide ?? 1600;
  const big = (a.width ?? 0) > max || (a.height ?? 0) > max;
  const out = await manipulateAsync(a.uri, big ? [{ resize: (a.width ?? 0) >= (a.height ?? 0) ? { width: max } : { height: max } }] : [], {
    compress: 0.85, format: opts.png ? SaveFormat.PNG : SaveFormat.JPEG,
  });
  const blob = await (await fetch(out.uri)).blob();
  return { uri: out.uri, type: opts.png ? "image/png" : "image/jpeg", size: blob.size, width: out.width, height: out.height };
}

/** Pick a video (MP4 / MOV) and grab a cover from its first second. */
export async function pickVideo(): Promise<{ video: Picked; cover: Picked | null } | null | { error: UploadError }> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], videoMaxDuration: 180 });
  const a = res.canceled ? null : res.assets[0];
  if (!a) return null;
  const type = a.mimeType ?? (a.uri.toLowerCase().endsWith(".mov") ? "video/quicktime" : "video/mp4");
  const video = { uri: a.uri, type, size: a.fileSize ?? (await (await fetch(a.uri)).blob()).size };
  let cover: Picked | null = null;
  try {
    const thumb = await VideoThumbnails.getThumbnailAsync(a.uri, { time: 500, quality: 0.8 });
    const small = await manipulateAsync(thumb.uri, [{ resize: { width: 720 } }], { compress: 0.82, format: SaveFormat.JPEG });
    cover = { uri: small.uri, type: "image/jpeg", size: (await (await fetch(small.uri)).blob()).size };
  } catch {}
  return { video, cover };
}

/** Pick a license file (PDF or image). */
export async function pickDocument(): Promise<Picked | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png", "image/webp"], copyToCacheDirectory: true });
  const a = res.canceled ? null : res.assets[0];
  if (!a) return null;
  return { uri: a.uri, type: a.mimeType ?? "application/pdf", size: a.size ?? 0 };
}

/**
 * Uploads to the creator's own folder: the website gives a one-time signed
 * URL (and checks type/size), the file goes straight to storage, and the
 * section's save action checks the file again before using it.
 */
export async function upload(kind: UploadKind, file: Picked): Promise<{ path: string } | { error: UploadError }> {
  if (file.size > MAX[kind] * 1024 * 1024) return { error: "size" };
  try {
    const ticket = await rpc<{ path: string; signedUrl: string } | { error: UploadError }>("requestUpload", kind, file.type, file.size);
    if ("error" in ticket) return ticket;
    const body = await (await fetch(file.uri)).blob();
    const res = await fetch(ticket.signedUrl, { method: "PUT", headers: { "Content-Type": file.type, "Cache-Control": "max-age=31536000" }, body });
    return res.ok ? { path: ticket.path } : { error: "failed" };
  } catch {
    return { error: "failed" };
  }
}
