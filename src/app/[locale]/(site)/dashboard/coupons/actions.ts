"use server";

import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { removeUnused, resolveFile } from "@/lib/page-files";
import { pageChanged } from "@/lib/public-page";
import { couponsSchema, type CouponInput } from "@/lib/validation/coupons";

export type CouponsResult = { ok?: boolean; error?: "failed" | "invalid_url" | "invalid_code"; index?: number };

/**
 * Replaces the creator's "Discount coupons" (order = list order). Logos must be
 * fresh uploads in the creator's own folder or logos their coupons already had;
 * replaced logos are deleted.
 */
export async function saveCoupons(coupons: CouponInput[]): Promise<CouponsResult> {
  const { user, page } = await requireCreator();
  const parsed = couponsSchema.safeParse(coupons);
  if (!parsed.success) {
    const bad = parsed.error.issues.find((i) => i.path[1] === "url" || i.path[1] === "code");
    return bad ? { error: bad.path[1] === "url" ? "invalid_url" : "invalid_code", index: Number(bad.path[0]) } : { error: "failed" };
  }

  const current = new Set(
    (await db.coupon.findMany({ where: { pageId: page.id }, select: { logoUrl: true } })).map((c) => c.logoUrl).filter((u): u is string => !!u),
  );
  const rows = [];
  for (const [sort, c] of parsed.data.entries()) {
    const logoUrl = await resolveFile(user.id, "couponLogo", c.logo, current);
    if (logoUrl === undefined) return { error: "failed" };
    rows.push({
      pageId: page.id, store: c.store, storeEn: c.storeEn || null, description: c.description, descriptionEn: c.descriptionEn || null,
      code: c.code, url: c.url, logoUrl, expiresOn: c.expiresOn ? new Date(`${c.expiresOn}T00:00:00Z`) : null, sort,
    });
  }

  await db.$transaction([
    db.coupon.deleteMany({ where: { pageId: page.id } }),
    db.coupon.createMany({ data: rows }),
  ]);
  await removeUnused(current, new Set(rows.map((r) => r.logoUrl)));
  pageChanged(page.username);
  return { ok: true };
}
