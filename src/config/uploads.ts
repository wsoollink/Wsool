export const MEDIA_BUCKET = "media";
/** Private: account screenshots for verification, read by staff via signed URLs. */
export const VERIFICATION_BUCKET = "verification";

/** What each upload kind accepts (checked in the browser and again on the server), and its bucket. */
export const UPLOAD_KINDS = {
  photo: { types: ["image/jpeg", "image/png", "image/webp", "image/avif"], maxBytes: 8 * 1024 * 1024, bucket: MEDIA_BUCKET },
  logo: { types: ["image/jpeg", "image/png", "image/webp", "image/avif"], maxBytes: 4 * 1024 * 1024, bucket: MEDIA_BUCKET },
  license: { types: ["image/jpeg", "image/png", "image/webp", "application/pdf"], maxBytes: 10 * 1024 * 1024, bucket: MEDIA_BUCKET },
  linkImage: { types: ["image/jpeg", "image/png", "image/webp", "image/avif"], maxBytes: 4 * 1024 * 1024, bucket: MEDIA_BUCKET },
  thumb: { types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 4 * 1024 * 1024, bucket: MEDIA_BUCKET },
  video: { types: ["video/mp4", "video/quicktime"], maxBytes: 50 * 1024 * 1024, bucket: MEDIA_BUCKET },
  verification: { types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 10 * 1024 * 1024, bucket: VERIFICATION_BUCKET },
  /** Audience stats screenshot: read by the AI, then deleted (private bucket). */
  audienceShot: { types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 10 * 1024 * 1024, bucket: VERIFICATION_BUCKET },
} as const;

export type UploadKind = keyof typeof UPLOAD_KINDS;
export const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};
