"use server";

import { updateTag } from "next/cache";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { removeUnused, resolveFile } from "@/lib/page-files";
import { pageCacheTag } from "@/lib/public-page";
import { linksSchema, servicesSchema, type LinkInput, type ServiceInput } from "@/lib/validation/links";

export type LinksResult = { ok?: boolean; error?: "failed" | "invalid_url"; index?: number };

/**
 * Replaces the creator's "My links" and "My services" (order = list order).
 * Link images must be fresh uploads in the creator's own folder or images
 * their links already had; replaced images are deleted.
 */
export async function saveLinksAndServices(links: LinkInput[], services: ServiceInput[]): Promise<LinksResult> {
  const { user, page } = await requireCreator();
  const parsedLinks = linksSchema.safeParse(links);
  if (!parsedLinks.success) {
    const bad = parsedLinks.error.issues.find((i) => i.path[1] === "url");
    return bad ? { error: "invalid_url", index: Number(bad.path[0]) } : { error: "failed" };
  }
  const parsedServices = servicesSchema.safeParse(services);
  if (!parsedServices.success) return { error: "failed" };

  const current = new Set(
    (await db.pageLink.findMany({ where: { pageId: page.id }, select: { imageUrl: true } })).map((l) => l.imageUrl).filter((u): u is string => !!u),
  );
  const linkRows = [];
  for (const [sort, l] of parsedLinks.data.entries()) {
    const imageUrl = await resolveFile(user.id, "linkImage", l.image, current);
    if (imageUrl === undefined) return { error: "failed" };
    linkRows.push({ pageId: page.id, title: l.title, titleEn: l.titleEn || null, url: l.url, imageUrl, sort });
  }
  const serviceRows = parsedServices.data.map((s, sort) => ({
    pageId: page.id, name: s.name, nameEn: s.nameEn || null, description: s.description, descriptionEn: s.descriptionEn || null,
    price: s.price, unit: s.unit, unitEn: s.unitEn || null, sort,
  }));

  await db.$transaction([
    db.pageLink.deleteMany({ where: { pageId: page.id } }),
    db.pageLink.createMany({ data: linkRows }),
    db.service.deleteMany({ where: { pageId: page.id } }),
    db.service.createMany({ data: serviceRows }),
  ]);
  await removeUnused(current, new Set(linkRows.map((r) => r.imageUrl)));
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}
