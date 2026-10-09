import "server-only";
import type { UploadKind } from "@/config/uploads";
import { isOwnUploadedFile, pathFromPublicUrl, publicFileUrl, removeFiles } from "@/lib/storage";

export type FileRef = { path: string | null; url: string | null };

/**
 * Resolves a file reference to the URL to store: a fresh upload must be in the
 * creator's own folder for that kind; an unchanged file must be one the
 * creator's rows already have. Anything else is refused (undefined).
 */
export async function resolveFile(userId: string, kind: UploadKind, ref: FileRef, current: Set<string>): Promise<string | null | undefined> {
  if (ref.path) return (await isOwnUploadedFile(userId, kind, ref.path)) ? publicFileUrl(ref.path) : undefined;
  if (ref.url) return current.has(ref.url) ? ref.url : undefined;
  return null;
}

/** Deletes files that were used before and are not used anymore. */
export async function removeUnused(before: Iterable<string>, after: Set<string | null>) {
  await removeFiles([...before].filter((u) => !after.has(u)).map((u) => pathFromPublicUrl(u))).catch(() => {});
}
