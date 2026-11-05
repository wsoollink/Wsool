import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import type { AgencyPlan, AgencyRole } from "@/generated/prisma/enums";
import { AGENCY_CREATOR_LIMIT, agencyPlanExpired } from "@/config/agency-plans";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { expirePage } from "@/lib/public-page";
import { refreshAgencyPage } from "@/lib/agency-page";

/**
 * Marketing agencies (owner, Nov 2026, phase 1). An agency manages creators' pages with each creator's
 * consent and the permissions they choose; the page always stays the creator's and they can unlink anytime.
 *
 * Acting mode: an agency member picks a creator in /agency, which sets the ACT_COOKIE (the link id). From then
 * on requireCreator(scope) returns that creator's page instead of the member's own, but only for scopes the
 * creator allowed (content / rates / contact; "view" always). Calls without a scope (subscription, referrals,
 * verification, accounts, username…) are refused, so anything not opted in stays the creator's alone.
 */
export const ACT_COOKIE = "wsool_act";
/** Readable menu keys for the dashboard nav while acting. */
export const ACT_NAV_COOKIE = "wsool_act_nav";
export const UNLINK_GRACE_DAYS = 14;
/** An agency-covered Pro plan "ends" here (it never renews; unlinking moves the end to now + 14 days). */
const AGENCY_PRO_END = new Date("2099-12-31T00:00:00Z");

/** `accounts` = Accounts & numbers: only while the page is a draft the agency is preparing (afterwards it's the creator's alone). */
export type ActScope = "content" | "rates" | "contact" | "view" | "accounts";
export type Perms = { content: boolean; rates: boolean; contact: boolean };

const RANK: Record<AgencyRole, number> = { viewer: 0, editor: 1, manager: 2, owner: 3 };
export const roleAtLeast = (role: AgencyRole, min: AgencyRole) => RANK[role] >= RANK[min];

/** The signed-in user's agency membership (first visit links an invited email to the account). */
export const getMembership = cache(async (user?: CurrentUser | null) => {
  const me = user === undefined ? await getCurrentUser() : user;
  if (!me) return null;
  // A suspended account loses agency access too (like staff access in src/lib/admin.ts).
  const account = await db.user.findUnique({ where: { id: me.id }, select: { suspendedAt: true } });
  if (account?.suspendedAt) return null;
  let member = await db.agencyMember.findFirst({ where: { userId: me.id, agency: { status: "active" } }, include: { agency: true } });
  if (!member && me.email) {
    const invited = await db.agencyMember.findFirst({ where: { email: me.email.toLowerCase(), userId: null, agency: { status: "active" } }, include: { agency: true } });
    if (invited) {
      member = await db.agencyMember.update({ where: { id: invited.id }, data: { userId: me.id, joinedAt: new Date() }, include: { agency: true } });
    }
  }
  return member ? { user: me, member, agency: member.agency } : null;
});

/** For /agency pages and actions: 404 to anyone who isn't on an active agency's team (or below `min`). */
export async function requireAgency(min: AgencyRole = "viewer") {
  const m = await getMembership();
  if (!m || !roleAtLeast(m.member.role, min)) notFound();
  return m;
}

/** Who to tell about a link change on the agency side: its owners and managers who have an account. */
export async function agencyManagers(agencyId: string) {
  const rows = await db.agencyMember.findMany({ where: { agencyId, role: { in: ["owner", "manager"] }, userId: { not: null } }, select: { userId: true } });
  return rows.map((r) => r.userId!);
}

async function refresh(pageId: string) {
  const page = await db.page.findUnique({ where: { id: pageId }, select: { username: true } });
  if (page) expirePage(page.username);
}

/**
 * While linked, the agency's plan covers Pro (owner decision). A creator already paying with auto-renew keeps
 * their own plan untouched; anyone else gets an agency-covered Pro (provider "agency", never renews).
 */
export async function applyAgencyPro(userId: string) {
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub) return;
  const paying = (sub.status === "active" || sub.status === "past_due") && !sub.cancelAtPeriodEnd && !!sub.paymentToken && sub.provider !== "agency";
  if (paying) return;
  await db.subscription.update({
    where: { id: sub.id },
    data: { plan: "pro", status: "active", provider: "agency", currentPeriodEnd: AGENCY_PRO_END, cancelAtPeriodEnd: true, failedAttempts: 0, nextRetryAt: null },
  });
}

/** After unlinking, an agency-covered Pro lasts UNLINK_GRACE_DAYS more, then the hourly job moves the page to Free. */
async function endAgencyPro(userId: string) {
  const end = new Date(Date.now() + UNLINK_GRACE_DAYS * 86_400_000);
  await db.subscription.updateMany({ where: { userId, provider: "agency", currentPeriodEnd: { gt: end } }, data: { currentPeriodEnd: end, cancelAtPeriodEnd: true } });
}

/**
 * True while the creator's Pro is paid by a linked agency (checkout and free codes wait). During the 14-day grace
 * after unlinking it's false: the creator can subscribe, and their paid period starts when the grace ends.
 */
export function agencyCovered(sub: { provider: string | null; currentPeriodEnd: Date | null } | null) {
  return !!sub && sub.provider === "agency" && !!sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() >= AGENCY_PRO_END.getTime();
}

export type InviteError = "not_found" | "self" | "already" | "linked_elsewhere" | "limit" | "expired";

/** Agency invites an existing creator (by username or account email) with the permissions it asks for. */
export async function inviteCreator(m: { agency: { id: string; name: string; plan: AgencyPlan; planUntil: Date | null }; user: CurrentUser }, query: string, perms: Perms): Promise<{ ok: true } | { error: InviteError }> {
  // Trial or paid period over: linked creators stay, but no new invites until the owner renews the plan.
  if (agencyPlanExpired(m.agency.planUntil)) return { error: "expired" };
  // The plan's creator limit counts linked and invited creators.
  const limit = AGENCY_CREATOR_LIMIT[m.agency.plan];
  if (limit !== null && (await db.agencyLink.count({ where: { agencyId: m.agency.id, status: { in: ["active", "pending", "draft"] } } })) >= limit) return { error: "limit" };
  const q = query.trim().toLowerCase().replace(/^@/, "").replace(/^(https?:\/\/)?(www\.)?wsool\.link\//, "");
  const page = await db.page.findFirst({
    where: { deletedAt: null, ...(q.includes("@") ? { user: { email: q } } : { username: q }) },
    select: { id: true, userId: true, user: { select: { suspendedAt: true } } },
  });
  if (!page || page.user.suspendedAt) return { error: "not_found" };
  if (page.userId === m.user.id) return { error: "self" };
  const open = await db.agencyLink.findFirst({ where: { pageId: page.id, status: { in: ["pending", "active"] } }, select: { agencyId: true, status: true } });
  if (open?.agencyId === m.agency.id) return { error: "already" };
  if (open?.status === "active") return { error: "linked_elsewhere" };
  try {
    await db.agencyLink.create({ data: { agencyId: m.agency.id, pageId: page.id, invitedBy: m.user.id, canContent: perms.content, canRates: perms.rates, canContact: perms.contact } });
  } catch {
    return { error: "already" };
  }
  await notify(page.userId, "agency_invite", { agency: m.agency.name });
  return { ok: true };
}

/** Creator accepts an invite (with the permissions they settle on). One active agency per page. */
export async function acceptInvite(page: { id: string; userId: string }, linkId: string, perms: Perms): Promise<boolean> {
  const link = await db.agencyLink.findFirst({ where: { id: linkId, pageId: page.id, status: "pending", agency: { status: "active" } }, include: { agency: true } });
  if (!link) return false;
  if (await db.agencyLink.count({ where: { pageId: page.id, status: "active" } })) return false;
  try {
    const { count } = await db.agencyLink.updateMany({
      where: { id: link.id, status: "pending" },
      data: { status: "active", decidedAt: new Date(), canContent: perms.content, canRates: perms.rates, canContact: perms.contact },
    });
    if (count !== 1) return false;
  } catch {
    return false;
  }
  // Other invites waiting for this page are closed: only one agency at a time.
  await db.agencyLink.updateMany({ where: { pageId: page.id, status: "pending" }, data: { status: "declined", decidedAt: new Date() } });
  await applyAgencyPro(page.userId);
  await refresh(page.id);
  refreshAgencyPage(link.agency.slug);
  const name = await db.pageTranslation.findFirst({ where: { pageId: page.id }, select: { fullName: true }, orderBy: { lang: "asc" } });
  for (const id of await agencyManagers(link.agencyId)) await notify(id, "agency_accepted", { creator: name?.fullName ?? "" });
  return true;
}

export async function declineInvite(pageId: string, linkId: string) {
  const { count } = await db.agencyLink.updateMany({ where: { id: linkId, pageId, status: "pending" }, data: { status: "declined", decidedAt: new Date() } });
  return count === 1;
}

/** Ends an active link, from either side. The creator keeps everything, plus 14 days of Pro if the agency paid for it. */
export async function endLink(linkId: string, by: "creator" | "agency", scope: { pageId?: string; agencyId?: string }) {
  const link = await db.agencyLink.findFirst({
    where: { id: linkId, status: "active", ...(scope.pageId && { pageId: scope.pageId }), ...(scope.agencyId && { agencyId: scope.agencyId }) },
    include: { page: { select: { userId: true, translations: { select: { fullName: true }, take: 1 } } }, agency: { select: { name: true, slug: true } } },
  });
  if (!link) return false;
  const { count } = await db.agencyLink.updateMany({ where: { id: link.id, status: "active" }, data: { status: "ended", endedAt: new Date(), endedBy: by } });
  if (count !== 1) return false;
  await endAgencyPro(link.page.userId);
  await refresh(link.pageId);
  refreshAgencyPage(link.agency.slug);
  if (by === "creator") {
    for (const id of await agencyManagers(link.agencyId)) await notify(id, "agency_ended", { creator: link.page.translations[0]?.fullName ?? "" });
  } else {
    await notify(link.page.userId, "agency_removed", { agency: link.agency.name, days: UNLINK_GRACE_DAYS });
  }
  return true;
}

/** Stops an agency (staff): every active link ends as if the agency removed the creator. */
export async function deactivateAgency(agencyId: string) {
  const links = await db.agencyLink.findMany({ where: { agencyId, status: "active" }, select: { id: true } });
  for (const l of links) await endLink(l.id, "agency", { agencyId });
  await db.agencyLink.updateMany({ where: { agencyId, status: "pending" }, data: { status: "cancelled" } });
  const a = await db.agency.update({ where: { id: agencyId }, data: { status: "inactive" } });
  refreshAgencyPage(a.slug);
}

/** Path segment → section name stored in the activity log. */
const SECTIONS = ["edit", "accounts", "work", "links", "coupons", "appearance", "rates", "contact"] as const;

/**
 * Acting mode check used by requireCreator(). Returns the creator's page when the signed-in agency member may act
 * on it for `scope`; "denied" when they're acting but this scope isn't allowed; null when not acting at all.
 */
export async function actingFor(user: CurrentUser, scope?: ActScope) {
  const linkId = (await cookies()).get(ACT_COOKIE)?.value;
  if (!linkId || !/^[0-9a-f-]{36}$/.test(linkId)) return null;
  const link = await db.agencyLink.findFirst({
    // A draft = a page the agency prepared for a new creator (src/lib/agency-drafts.ts): editable until it's claimed.
    where: { id: linkId, status: { in: ["active", "draft"] }, agency: { status: "active", members: { some: { userId: user.id, user: { suspendedAt: null } } } } },
    include: {
      agency: { select: { id: true, name: true, members: { where: { userId: user.id }, select: { role: true } } } },
      page: { include: { user: { select: { email: true, suspendedAt: true } } } },
    },
  });
  if (!link || link.page.user.suspendedAt || link.page.deletedAt) return "ended" as const;
  const role = link.agency.members[0]?.role ?? "viewer";
  const perms: Perms = { content: link.canContent, rates: link.canRates, contact: link.canContact };
  const allowed = scope === "view"
    || (scope === "accounts" ? link.status === "draft" && roleAtLeast(role, "editor") : !!scope && perms[scope] && roleAtLeast(role, "editor"));
  if (!allowed) return "denied" as const;
  // A server action (not a page render) = a change: log which section it came from.
  const h = await headers();
  if (scope !== "view" && h.get("next-action")) {
    const path = new URL(h.get("referer") ?? "http://x/").pathname.replace(/^\/(ar|en)(?=\/)/, "");
    const section = SECTIONS.find((s) => path.startsWith(`/dashboard/${s}`)) ?? scope ?? "content";
    // The page re-render after an action carries the same header: one row per member + section per minute.
    const recent = await db.agencyActivity.count({ where: { pageId: link.pageId, userId: user.id, section, createdAt: { gte: new Date(Date.now() - 60_000) } } });
    if (!recent) await db.agencyActivity.create({ data: { agencyId: link.agencyId, pageId: link.pageId, userId: user.id, section } }).catch(() => {});
  }
  const { user: owner, ...page } = link.page;
  return {
    user: { id: page.userId, email: owner.email },
    page,
    acting: { linkId: link.id, agencyName: link.agency.name, perms, role },
  };
}

/** Join requests not accepted (new or declined) are deleted 12 months after they were sent (agencies privacy policy). */
export const AGENCY_REQUEST_KEEP_MONTHS = 12;
export async function purgeAgencyRequests(now = new Date()) {
  const before = new Date(now);
  before.setUTCMonth(before.getUTCMonth() - AGENCY_REQUEST_KEEP_MONTHS);
  const { count } = await db.agencyRequest.deleteMany({ where: { status: { in: ["new", "declined"] }, createdAt: { lt: before } } });
  return count;
}
