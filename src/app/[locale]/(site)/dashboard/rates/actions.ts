"use server";

import { updateTag } from "next/cache";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { pageCacheTag } from "@/lib/public-page";
import {
  bundlesSchema, rateSettingsSchema, ratesSchema,
  type BundleInput, type RateInput, type RateSettingsInput,
} from "@/lib/validation/rates";

export type RatesResult = { ok?: boolean; error?: "failed" };

/** Show on page / in PDF, currency, VAT. */
export async function saveRateSettings(input: RateSettingsInput): Promise<RatesResult> {
  const { page } = await requireCreator();
  const parsed = rateSettingsSchema.safeParse(input);
  if (!parsed.success) return { error: "failed" };
  await db.rateSettings.upsert({ where: { pageId: page.id }, create: { pageId: page.id, ...parsed.data }, update: parsed.data });
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}

/** Replaces the rate types of one of the creator's own accounts. */
export async function saveRates(accountId: string, items: RateInput[]): Promise<RatesResult> {
  const { page } = await requireCreator();
  const parsed = ratesSchema.safeParse(items);
  if (!parsed.success) return { error: "failed" };
  // Ownership check: the account must be on this creator's page.
  const account = await db.socialAccount.findFirst({ where: { id: String(accountId), pageId: page.id }, select: { id: true } });
  if (!account) return { error: "failed" };

  await db.$transaction([
    db.rate.deleteMany({ where: { accountId: account.id } }),
    db.rate.createMany({
      data: parsed.data.map((r, sort) => ({ accountId: account.id, name: r.name, nameEn: r.nameEn || null, price: r.price, sort })),
    }),
  ]);
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}

/** Replaces the creator's bundles. Every platform in a bundle must be one of their accounts. */
export async function saveBundles(items: BundleInput[]): Promise<RatesResult> {
  const { page } = await requireCreator();
  const parsed = bundlesSchema.safeParse(items);
  if (!parsed.success) return { error: "failed" };

  const own = new Set((await db.socialAccount.findMany({ where: { pageId: page.id }, select: { id: true } })).map((a) => a.id));
  for (const b of parsed.data) {
    if (new Set(b.accountIds).size !== b.accountIds.length || b.accountIds.some((id) => !own.has(id))) return { error: "failed" };
  }

  await db.$transaction([
    db.rateBundle.deleteMany({ where: { pageId: page.id } }),
    ...parsed.data.map((b, sort) =>
      db.rateBundle.create({
        data: {
          pageId: page.id,
          name: b.name || null,
          nameEn: b.nameEn || null,
          sort,
          platforms: { create: b.accountIds.map((accountId) => ({ accountId })) },
          rates: { create: b.rates.map((r, i) => ({ name: r.name, nameEn: r.nameEn || null, price: r.price, sort: i })) },
        },
      }),
    ),
  ]);
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}
