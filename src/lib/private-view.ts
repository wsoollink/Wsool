import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/investor";
import { canEncryptTokens, openToken, sealToken } from "@/lib/token-box";

/**
 * Private view of a creator page (owner, Nov 2026, Pro). Sections the creator marks "private" (or the whole page)
 * open with the page password or a private link made for one company. Either way the visitor gets an httpOnly
 * cookie scoped to that page:
 *   p.<version>.<sig>  password entered (stops working when the creator changes or removes the password)
 *   l.<linkId>.<sig>   private link opened (stops working when the link is revoked or expires)
 * Private data never reaches the browser before that: the public variant of the page is built without it.
 */
export const UNLOCK_DAYS = 30;
export const LINK_PARAM = "k";

const secret = () => process.env.CRON_SECRET || process.env.SUPABASE_SECRET_KEY || "local";
const sign = (text: string) => createHmac("sha256", secret()).update(`private-view:${text}`).digest("base64url");

export const newLinkToken = () => randomBytes(18).toString("base64url");
export const hashLinkToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** One cookie per page; the name doesn't reveal the page id. */
export const unlockCookieName = (pageId: string) => `wsool_pv_${createHash("sha256").update(pageId).digest("hex").slice(0, 12)}`;

export const passwordUnlock = (pageId: string, version: number) => `p.${version}.${sign(`${pageId}:p:${version}`)}`;
export const linkUnlock = (pageId: string, linkId: string) => `l.${linkId}.${sign(`${pageId}:l:${linkId}`)}`;

function sameSig(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Active = not revoked and not past its end date. */
export const linkActive = () => ({ revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] });

/** True when this visitor opened the page's private view (password still current, or private link still active). */
export async function isUnlocked(pageId: string, version: number): Promise<boolean> {
  const value = (await cookies()).get(unlockCookieName(pageId))?.value;
  if (!value) return false;
  const [kind, id] = value.split(".", 2);
  if (kind === "p") return Number(id) === version && sameSig(value, passwordUnlock(pageId, version));
  if (kind === "l" && /^[0-9a-f-]{36}$/.test(id ?? "") && sameSig(value, linkUnlock(pageId, id))) {
    return !!(await db.privateLink.findFirst({ where: { id, pageId, ...linkActive() }, select: { id: true } }));
  }
  return false;
}

export const unlockCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: UNLOCK_DAYS * 86_400 };

// ---- Managing the private view (creator only: dashboard + app, never an agency acting for them) ----

export const MAX_PRIVATE_LINKS = 50;

/** The public URL of a private link (null when its token can't be shown again). */
export function privateLinkUrl(origin: string, username: string, sealed: string | null) {
  const token = sealed ? openToken(sealed) : null;
  return token ? `${origin}/${username}?${LINK_PARAM}=${token}` : null;
}

export async function listPrivateLinks(pageId: string) {
  const rows = await db.privateLink.findMany({ where: { pageId, revokedAt: null }, orderBy: { createdAt: "desc" } });
  const now = Date.now();
  return rows.map((l) => ({ ...l, expired: !!l.expiresAt && l.expiresAt.getTime() < now }));
}

/** Sets (or with null removes) the page password. Either way earlier password unlocks stop working. */
export async function setPagePassword(pageId: string, password: string | null) {
  await db.page.update({
    where: { id: pageId },
    data: { privatePassword: password ? hashPassword(password) : null, privateVersion: { increment: 1 } },
  });
}

/** A new private link; returns its full token once (also kept sealed when TOKEN_ENCRYPTION_KEY is set). */
export async function createPrivateLink(pageId: string, name: string, days: number) {
  if ((await db.privateLink.count({ where: { pageId, revokedAt: null } })) >= MAX_PRIVATE_LINKS) return null;
  const token = newLinkToken();
  const link = await db.privateLink.create({
    data: {
      pageId, name, tokenHash: hashLinkToken(token),
      tokenSealed: canEncryptTokens() ? sealToken(token) : null,
      expiresAt: days ? new Date(Date.now() + days * 86_400_000) : null,
    },
  });
  return { link, token };
}

export async function revokePrivateLink(pageId: string, id: string) {
  const { count } = await db.privateLink.updateMany({ where: { id, pageId, revokedAt: null }, data: { revokedAt: new Date() } });
  return count === 1;
}
