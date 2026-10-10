"use server";

import { updateTag } from "next/cache";
import { FREE_LIMITS, hasPro } from "@/config/plans";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { pageCacheTag } from "@/lib/public-page";
import { appearanceSchema, type AppearanceInput } from "@/lib/validation/appearance";

export type AppearanceResult = { ok?: boolean; error?: "failed" | "pro_only" };

/** Template, custom colors, accent, photo shape, Wsool footer. Pro-only choices are checked here. */
export async function saveAppearance(input: AppearanceInput): Promise<AppearanceResult> {
  const { user, page } = await requireCreator();
  const parsed = appearanceSchema.safeParse(input);
  if (!parsed.success) return { error: "failed" };
  const value = parsed.data;

  const sub = await db.subscription.findUnique({ where: { userId: user.id }, select: { status: true, trialEndsAt: true } });
  if (!hasPro(sub)) {
    if (!FREE_LIMITS.templates.includes(value.template)) return { error: "pro_only" };
    if (value.hideBranding && !FREE_LIMITS.hideBranding) return { error: "pro_only" };
  }

  await db.page.update({
    where: { id: page.id },
    data: {
      template: value.template,
      // Kept when switching away from Custom, so switching back restores them.
      ...(value.customColors && { customColors: value.customColors }),
      accent: value.accent,
      photoShape: value.photoShape,
      hideBranding: value.hideBranding,
    },
  });
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}
