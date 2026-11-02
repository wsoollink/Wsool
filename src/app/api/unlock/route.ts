import { NextResponse, type NextRequest } from "next/server";
import { hasPro } from "@/config/plans";
import { normalizeUsername } from "@/config/usernames";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { hashLinkToken, linkActive, linkUnlock, unlockCookieName, unlockCookieOptions } from "@/lib/private-view";
import { ipFrom, rateLimit } from "@/lib/rate-limit";
import { isBot } from "@/lib/analytics";

/**
 * Private links (wsool.link/<username>?k=<token>): the proxy sends them here. A live link sets the page's unlock cookie,
 * counts the visit and goes back to the clean page URL (the token never stays in the address bar or in analytics).
 */
export async function GET(request: NextRequest) {
  const username = normalizeUsername(request.nextUrl.searchParams.get("u") ?? "").slice(0, 20);
  const token = (request.nextUrl.searchParams.get("k") ?? "").slice(0, 64);
  const back = NextResponse.redirect(new URL(`/${username}`, request.url), 303);
  back.headers.set("cache-control", "no-store");
  if (!username || !token || !(await rateLimit(`unlock-link:${ipFrom(request.headers)}`, 60, 3600))) return back;

  const link = await db.privateLink.findFirst({
    where: { tokenHash: hashLinkToken(token), ...linkActive(), page: { username, isPublished: true, deletedAt: null, user: { suspendedAt: null } } },
    select: { id: true, name: true, pageId: true, views: true, page: { select: { userId: true, user: { select: { subscription: { select: { plan: true, status: true, trialEndsAt: true } } } } } } },
  });
  if (!link || !hasPro(link.page.user.subscription)) return back;

  back.cookies.set(unlockCookieName(link.pageId), linkUnlock(link.pageId, link.id), unlockCookieOptions);
  // Link previews (WhatsApp, Slack…) fetch the URL too: don't count them.
  if (!isBot(request.headers.get("user-agent") ?? "")) {
    await db.privateLink.update({ where: { id: link.id }, data: { views: { increment: 1 }, lastViewedAt: new Date() } });
    if (link.views === 0) await notify(link.page.userId, "private_link_opened", { name: link.name }, { dedupeKey: `private_link_opened:${link.id}` }).catch(() => {});
  }
  return back;
}
