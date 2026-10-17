import { authed, json, preflight } from "@/lib/mobile/api";
import { planSummary } from "@/lib/mobile/home";
import { db } from "@/lib/db";

/** Who is signed in: account, page (null = onboarding), plan and unread notifications. */
export const GET = authed(async ({ user }) => {
  const [page, plan, unread] = await Promise.all([
    db.page.findUnique({ where: { userId: user.id }, select: { username: true, isPublished: true, photoUrl: true, primaryLang: true, enEnabled: true, translations: { select: { lang: true, fullName: true } } } }),
    planSummary(user.id),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  const name = page ? (page.translations.find((t) => t.lang === page.primaryLang) ?? page.translations[0])?.fullName ?? null : null;
  return json({
    user: { id: user.id, email: user.email },
    page: page && { username: page.username, published: page.isPublished, photoUrl: page.photoUrl, name, primaryLang: page.primaryLang, enEnabled: page.enEnabled },
    plan,
    unread,
  });
});
export const OPTIONS = preflight;
