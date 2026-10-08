/** What each upload kind accepts (checked in the browser and again on the server). */
export const UPLOAD_KINDS = {
  photo: { types: ["image/jpeg", "image/png", "image/webp", "image/avif"], maxBytes: 8 * 1024 * 1024 },
  logo: { types: ["image/jpeg", "image/png", "image/webp", "image/avif"], maxBytes: 4 * 1024 * 1024 },
  license: { types: ["image/jpeg", "image/png", "image/webp", "application/pdf"], maxBytes: 10 * 1024 * 1024 },
  thumb: { types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 4 * 1024 * 1024 },
  video: { types: ["video/mp4", "video/quicktime"], maxBytes: 50 * 1024 * 1024 },
} as const;

export type UploadKind = keyof typeof UPLOAD_KINDS;
export const MEDIA_BUCKET = "media";

export const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};
