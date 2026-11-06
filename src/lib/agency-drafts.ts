import "server-only";
import { randomUUID } from "node:crypto";
import { AGENCY_CREATOR_LIMIT, agencyPlanExpired } from "@/config/agency-plans";
import type { AgencyPlan, Lang } from "@/generated/prisma/enums";
import { agencyManagers, applyAgencyPro, type Perms } from "@/lib/agency";
import { refreshAgencyPage } from "@/lib/agency-page";
import type { CurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notify, sendAgencyDraftInvite } from "@/lib/notify";
import { expirePage } from "@/lib/public-page";
import { usernameError } from "@/lib/username";

/**
 * Pages an agency prepares for new creators (owner, Nov 2026). The page sits on a placeholder account (users.placeholder,
 * email draft-<id>@wsool.invalid, agency-covered Pro so every template and section can be filled) with a `draft` link that
 * lets the agency edit everything. It stays hidden. The creator gets an email; signing in with that address shows the
 * page on /onboarding, where they claim it (it becomes theirs and the link turns active with the permissions they pick) or
 * decline it (deleted). Unclaimed after DRAFT_DAYS: deleted by the hourly job. A draft counts toward the plan's limit.
 */
export const DRAFT_DAYS = 30;
export const PLACEHOLDER_DOMAIN = "wsool.invalid";
export const isPlaceholderEmail = (email: string) => email.endsWith(`@${PLACEHOLDER_DOMAIN}`);
/** What the agency may change once the creator claims a draft, unless they pick otherwise. */
const FULL: Perms = { content: true, rates: true, contact: true };

export type DraftError = "expired" | "limit" | "has_page" | "already" | "invalid" | "failed" | "taken" | "reserved" | "length" | "characters" | "dots" | "extension";

type Member = { agency: { id: string; name: string; plan: AgencyPlan; planUntil: Date | null; kind: string }; user: CurrentUser };

/** Creates a hidden page for a new creator and emails them. Username rules = a normal claim. */
export async function createDraft(m: Member, input: { username: string; email: string; name: string; lang: Lang }): Promise<{ ok: true } | { error: DraftError }> {
  if (m.agency.kind !== "agency") return { error: "invalid" };
  if (agencyPlanExpired(m.agency.planUntil)) return { error: "expired" };
  const limit = AGENCY_CREATOR_LIMIT[m.agency.plan];
  if (limit !== null && (await db.agencyLink.count({ where: { agencyId: m.agency.id, status: { in: ["active", "pending", "draft"] } } })) >= limit) return { error: "limit" };
  const email = input.email.trim().toLowerCase();
  // Someone with a page already: invite their page instead.
  if (await db.page.findFirst({ where: { user: { email } }, select: { id: true } })) return { error: "has_page" };
  if (await db.agencyLink.findFirst({ where: { agencyId: m.agency.id, status: "draft", draftEmail: email }, select: { id: true } })) return { error: "already" };
  const nameError = await usernameError(input.username);
  if (nameError) return { error: nameError as DraftError };

  const id = randomUUID();
  try {
    await db.$transaction(async (tx) => {
      await tx.user.create({ data: { id, email: `draft-${id}@${PLACEHOLDER_DOMAIN}`, placeholder: true, subscription: { create: { plan: "pro", status: "trialing", trialEndsAt: new Date() } } } });
      const page = await tx.page.create({
        data: { userId: id, username: input.username, primaryLang: input.lang, isPublished: false, translations: { create: { lang: input.lang, fullName: input.name } } },
      });
      await tx.agencyLink.create({
        data: {
          agencyId: m.agency.id, pageId: page.id, invitedBy: m.user.id, status: "draft", ...{ canContent: true, canRates: true, canContact: true },
          draftEmail: email, draftExpiresAt: new Date(Date.now() + DRAFT_DAYS * 86_400_000),
        },
      });
    });
  } catch {
    return { error: "taken" };
  }
  await applyAgencyPro(id);
  await sendAgencyDraftInvite(email, { agency: m.agency.name, username: input.username, name: input.name, days: DRAFT_DAYS }, input.lang);
  return { ok: true };
}

/** Emails the creator again (the agency's "resend" button). */
export async function resendDraft(agencyId: string, agencyName: string, linkId: string) {
  const link = await db.agencyLink.findFirst({
    where: { id: linkId, agencyId, status: "draft" },
    select: { draftEmail: true, draftExpiresAt: true, page: { select: { username: true, primaryLang: true, translations: { select: { fullName: true }, take: 1 } } } },
  });
  if (!link?.draftEmail || !link.draftExpiresAt) return false;
  const days = Math.max(1, Math.ceil((link.draftExpiresAt.getTime() - Date.now()) / 86_400_000));
  await sendAgencyDraftInvite(link.draftEmail, { agency: agencyName, username: link.page.username, name: link.page.translations[0]?.fullName ?? "", days }, link.page.primaryLang);
  return true;
}

/** Deletes a draft page with its placeholder account (agency's "delete", the creator's "decline", or expiry). */
async function removeDraft(linkId: string, where: { agencyId?: string; draftEmail?: string }) {
  const link = await db.agencyLink.findFirst({
    where: { id: linkId, status: "draft", ...where },
    select: { agencyId: true, page: { select: { userId: true, username: true, user: { select: { placeholder: true } }, translations: { select: { fullName: true }, take: 1 } } } },
  });
  // Only placeholder accounts are ever deleted here (never a real creator's).
  if (!link || !link.page.user.placeholder) return null;
  await db.user.delete({ where: { id: link.page.userId } });
  expirePage(link.page.username);
  return { agencyId: link.agencyId, name: link.page.translations[0]?.fullName ?? link.page.username };
}

export const deleteDraft = (agencyId: string, linkId: string) => removeDraft(linkId, { agencyId });

/** Before an agency is deleted for good: its unclaimed draft pages (and their placeholder accounts) go too. */
export async function deleteAgencyDrafts(agencyId: string) {
  const drafts = await db.agencyLink.findMany({ where: { agencyId, status: "draft" }, select: { id: true } });
  for (const d of drafts) await removeDraft(d.id, { agencyId });
}

/** Drafts waiting for this signed-in email (shown on /onboarding). */
export function draftsFor(email: string) {
  return db.agencyLink.findMany({
    where: { status: "draft", draftEmail: email.toLowerCase(), draftExpiresAt: { gt: new Date() }, agency: { status: "active" } },
    select: { id: true, draftExpiresAt: true, agency: { select: { name: true } }, page: { select: { username: true, photoUrl: true, translations: { select: { fullName: true }, take: 1 } } } },
    orderBy: { invitedAt: "desc" },
  });
}

/** The creator claims a draft: the page becomes theirs (still hidden until they publish) and the agency link turns active. */
export async function claimDraft(user: CurrentUser, linkId: string, perms: Perms = FULL): Promise<{ ok: true; username: string } | { error: "invalid" | "has_page" }> {
  const email = user.email.toLowerCase();
  if (await db.page.findUnique({ where: { userId: user.id }, select: { id: true } })) return { error: "has_page" };
  const link = await db.agencyLink.findFirst({
    where: { id: linkId, status: "draft", draftEmail: email, draftExpiresAt: { gt: new Date() }, agency: { status: "active" } },
    select: { id: true, agencyId: true, pageId: true, agency: { select: { slug: true } }, page: { select: { userId: true, username: true, user: { select: { placeholder: true } }, translations: { select: { fullName: true }, take: 1 } } } },
  });
  if (!link || !link.page.user.placeholder) return { error: "invalid" };
  const placeholder = link.page.userId;
  try {
    await db.$transaction(async (tx) => {
      await tx.page.update({ where: { id: link.pageId }, data: { userId: user.id } });
      await tx.agencyLink.update({
        where: { id: link.id },
        data: { status: "active", decidedAt: new Date(), canContent: perms.content, canRates: perms.rates, canContact: perms.contact, draftEmail: null, draftExpiresAt: null },
      });
      await tx.user.delete({ where: { id: placeholder } });
    });
  } catch {
    return { error: "invalid" };
  }
  await applyAgencyPro(user.id);
  expirePage(link.page.username);
  refreshAgencyPage(link.agency.slug);
  for (const id of await agencyManagers(link.agencyId)) await notify(id, "agency_draft_claimed", { creator: link.page.translations[0]?.fullName ?? link.page.username });
  return { ok: true, username: link.page.username };
}

/** The creator turns the prepared page down: it's deleted and the agency is told. */
export async function declineDraft(user: CurrentUser, linkId: string) {
  const gone = await removeDraft(linkId, { draftEmail: user.email.toLowerCase() });
  if (!gone) return false;
  for (const id of await agencyManagers(gone.agencyId)) await notify(id, "agency_draft_declined", { creator: gone.name });
  return true;
}

/** Hourly: drafts nobody claimed in DRAFT_DAYS are deleted and the agency is told. */
export async function expireDrafts(now = new Date()) {
  const old = await db.agencyLink.findMany({ where: { status: "draft", draftExpiresAt: { lte: now } }, select: { id: true } });
  let n = 0;
  for (const l of old) {
    const gone = await removeDraft(l.id, {});
    if (!gone) continue;
    n++;
    for (const id of await agencyManagers(gone.agencyId)) await notify(id, "agency_draft_expired", { creator: gone.name, days: DRAFT_DAYS });
  }
  return n;
}
