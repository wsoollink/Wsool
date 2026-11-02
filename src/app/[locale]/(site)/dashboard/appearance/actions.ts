"use server";

import { FREE_LIMITS, hasPro } from "@/config/plans";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { pageChanged } from "@/lib/public-page";
import { appearanceSchema, type AppearanceInput } from "@/lib/validation/appearance";

export type AppearanceResult = { ok?: boolean; error?: "failed" | "pro_only" };

/** Template, custom colors, accent, icon style, hidden page sections, Wsool footer. Pro-only choices are checked here. */
export async function saveAppearance(input: AppearanceInput): Promise<AppearanceResult> {
  const { user, page } = await requireCreator("content");
  const parsed = appearanceSchema.safeParse(input);
  if (!parsed.success) return { error: "failed" };
  const value = parsed.data;

  const sub = await db.subscription.findUnique({ where: { userId: user.id }, select: { status: true, trialEndsAt: true } });
  if (!hasPro(sub)) {
    if (!FREE_LIMITS.templates.includes(value.template)) return { error: "pro_only" };
    if (value.hideBranding && !FREE_LIMITS.hideBranding) return { error: "pro_only" };
    // The private view is Pro: on Free a creator can keep or undo what they had, never make more private.
    const current = await db.page.findUnique({ where: { id: page.id }, select: { privateSections: true, lockWhole: true } });
    if (value.privateSections?.some((s) => !current?.privateSections.includes(s))) return { error: "pro_only" };
    if (value.lockWhole && !current?.lockWhole) return { error: "pro_only" };
  }
  // Older app versions send hidden sections for the first four only: keep the newer ones as they are.
  const known = ["numbers", "brands", "works", "rates"];
  const hiddenSections = value.hiddenSections && value.privateSections === undefined
    ? [...new Set([...value.hiddenSections, ...page.hiddenSections.filter((s) => !known.includes(s))])]
    : value.hiddenSections;
  // A section is in one place only: hidden wins over private.
  const privateSections = value.privateSections?.filter((s) => !(hiddenSections ?? page.hiddenSections).includes(s));

  await db.page.update({
    where: { id: page.id },
    data: {
      template: value.template,
      // Kept when switching away from Custom, so switching back restores them.
      ...(value.customColors && { customColors: value.customColors }),
      accent: value.accent,
      hideBranding: value.hideBranding,
      iconStyle: value.iconStyle,
      ...(hiddenSections && { hiddenSections }),
      ...(privateSections && { privateSections }),
      ...(value.lockWhole !== undefined && { lockWhole: value.lockWhole }),
    },
  });
  pageChanged(page.username);
  return { ok: true };
}
