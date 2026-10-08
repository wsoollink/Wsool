"use server";

import { updateTag } from "next/cache";
import { requireCreator } from "@/lib/creator";
import { isOwnUploadedFile, pathFromPublicUrl, publicFileUrl, removeFiles } from "@/lib/storage";
import { db } from "@/lib/db";
import { pageCacheTag } from "@/lib/public-page";
import { pageLanguages } from "@/lib/page-language";
import { profileSchema, TRANSLATION_FIELDS } from "@/lib/validation/profile";

export type SaveState = { ok?: boolean; errors?: Record<string, string>; error?: "failed" | "needs_name" };

/** Saves languages and the texts for each language of the signed-in creator's page. */
export async function saveProfile(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const { page } = await requireCreator();
  const read = (lang: "ar" | "en") =>
    Object.fromEntries(TRANSLATION_FIELDS.map((f) => [f, String(formData.get(`${lang}.${f}`) ?? "")]));

  const parsed = profileSchema.safeParse({
    primaryLang: formData.get("primaryLang"),
    enEnabled: formData.get("enEnabled") === "on",
    ar: read("ar"),
    en: read("en"),
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] = issue.message === "required" ? "required" : "invalid";
    return { errors };
  }

  const value = parsed.data;
  const langs = pageLanguages(value.primaryLang, value.enEnabled);
  try {
    // Every write is scoped to the page found from the verified session.
    await db.$transaction([
      db.page.update({ where: { id: page.id }, data: { primaryLang: value.primaryLang, enEnabled: value.enEnabled } }),
      ...langs.map((lang) =>
        db.pageTranslation.upsert({
          where: { pageId_lang: { pageId: page.id, lang } },
          create: { pageId: page.id, lang, ...value[lang] },
          update: value[lang],
        }),
      ),
    ]);
  } catch {
    return { error: "failed" };
  }
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}

/** Publishes or hides the page. Publishing needs a name in the primary language. */
export async function setPublished(publish: boolean): Promise<SaveState> {
  const { page } = await requireCreator();
  if (publish) {
    const tr = await db.pageTranslation.findUnique({
      where: { pageId_lang: { pageId: page.id, lang: page.primaryLang } },
      select: { fullName: true },
    });
    if (!tr?.fullName) return { error: "needs_name" };
  }
  await db.page.update({ where: { id: page.id }, data: { isPublished: publish } });
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}

/** Sets (path) or removes (null) the hero photo; deletes the previous file. */
export async function savePhoto(path: string | null): Promise<SaveState & { url?: string | null }> {
  const { user, page } = await requireCreator();
  if (path !== null && (typeof path !== "string" || !(await isOwnUploadedFile(user.id, "photo", path)))) {
    return { error: "failed" };
  }
  const url = path ? publicFileUrl(path) : null;
  await db.page.update({ where: { id: page.id }, data: { photoUrl: url } });
  await removeFiles([pathFromPublicUrl(page.photoUrl)]).catch(() => {});
  updateTag(pageCacheTag(page.username));
  return { ok: true, url };
}
