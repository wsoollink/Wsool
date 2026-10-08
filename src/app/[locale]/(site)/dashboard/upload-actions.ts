"use server";

import { z } from "zod";
import { UPLOAD_KINDS, type UploadKind } from "@/config/uploads";
import { requireCreator } from "@/lib/creator";
import { createUploadTicket } from "@/lib/storage";

const input = z.object({
  kind: z.enum(Object.keys(UPLOAD_KINDS) as [UploadKind, ...UploadKind[]]),
  contentType: z.string().max(100),
  size: z.number().int().positive(),
});

/** Gives the signed-in creator a one-time upload URL inside their own folder. */
export async function requestUpload(kind: UploadKind, contentType: string, size: number) {
  const { user } = await requireCreator();
  const parsed = input.safeParse({ kind, contentType, size });
  if (!parsed.success) return { error: "type" as const };
  return createUploadTicket(user.id, parsed.data.kind, parsed.data.contentType, parsed.data.size);
}
