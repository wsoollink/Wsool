"use server";

import { requireAgency } from "@/lib/agency";
import { refreshAgencyPage, slugError, type SlugError } from "@/lib/agency-page";
import { db } from "@/lib/db";
import { removeUnused, resolveFile } from "@/lib/page-files";
import { rateLimit } from "@/lib/rate-limit";
import { createUploadTicket } from "@/lib/storage";
import { agencyPageSchema, type AgencyPageInput } from "@/lib/validation/agency-page";
import { normalizeUsername } from "@/config/usernames";

/** The agency page is for agencies (not brand accounts), edited by managers and the owner. */
async function requirePageEditor() {
  const m = await requireAgency("manager");
  if (m.agency.kind !== "agency") return null;
  return m;
}

/** Signed upload URL for the agency logo, in the member's own folder. */
export async function requestAgencyUpload(_kind: string, contentType: string, size: number) {
  const m = await requirePageEditor();
  if (!m || typeof contentType !== "string" || typeof size !== "number") return { error: "type" as const };
  if (!(await rateLimit(`upload:${m.user.id}`, 150, 3600))) return { error: "type" as const };
  return createUploadTicket(m.user.id, "agencyLogo", contentType, size);
}

/** Live availability check while typing the page link. */
export async function checkAgencySlug(slug: string): Promise<{ error: SlugError | null }> {
  const m = await requirePageEditor();
  if (!m || typeof slug !== "string") return { error: "characters" as SlugError };
  if (!(await rateLimit(`slug-check:${m.user.id}`, 120, 600))) return { error: "taken" };
  return { error: await slugError(slug, m.agency.id) };
}

export type SaveAgencyPageResult = { ok: true; slug: string | null } | { error: "invalid" | "slug" | "needSlug" | "logo"; slugError?: SlugError };

export async function saveAgencyPage(input: AgencyPageInput): Promise<SaveAgencyPageResult> {
  const m = await requirePageEditor();
  if (!m) return { error: "invalid" };
  const parsed = agencyPageSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const d = parsed.data;
  const agency = await db.agency.findUniqueOrThrow({ where: { id: m.agency.id } });

  const slug = d.slug ? normalizeUsername(d.slug) : null;
  if (slug && slug !== agency.slug) {
    const err = await slugError(slug, agency.id);
    if (err) return { error: "slug", slugError: err };
  }
  if (d.published && !slug) return { error: "needSlug" };

  const current = new Set([agency.logoUrl].filter((u): u is string => !!u));
  const logoUrl = await resolveFile(m.user.id, "agencyLogo", d.logo, current);
  if (logoUrl === undefined) return { error: "logo" };

  const nul = (v: string) => v || null;
  // Only this agency's active links can be ordered or hidden.
  const links = await db.agencyLink.findMany({ where: { agencyId: agency.id, status: "active" }, select: { id: true } });
  const own = new Set(links.map((l) => l.id));
  const order = d.creators.filter((c) => own.has(c.linkId));

  try {
    await db.$transaction([
      db.agency.update({
        where: { id: agency.id },
        data: {
          slug, pagePublished: d.published, name: d.name, nameEn: nul(d.nameEn), tagline: nul(d.tagline), taglineEn: nul(d.taglineEn),
          bio: nul(d.bio), bioEn: nul(d.bioEn), city: nul(d.city), cityEn: nul(d.cityEn), logoUrl,
          whatsapp: nul(d.whatsapp), email: nul(d.email), website: nul(d.website), template: d.template, accent: d.accent,
        },
      }),
      ...order.map((c, i) => db.agencyLink.update({ where: { id: c.linkId }, data: { sort: i, agencyHidden: c.hidden } })),
    ]);
  } catch {
    // Unique slug taken in between.
    return { error: "slug", slugError: "taken" };
  }
  await removeUnused(current, new Set([logoUrl]));
  refreshAgencyPage(agency.slug);
  if (slug !== agency.slug) refreshAgencyPage(slug);
  return { ok: true, slug };
}
