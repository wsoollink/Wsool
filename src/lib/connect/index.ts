import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Platform } from "@/generated/prisma/enums";
import { PLATFORM_NAMES } from "@/config/platforms";
import { VERIFICATION_DAYS } from "@/config/verification";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { expirePage } from "@/lib/public-page";
import { siteOrigin } from "@/lib/site-url";
import { canEncryptTokens, openToken, sealToken } from "@/lib/token-box";
import { RevokedError } from "./errors";
import type { Provider } from "./types";
import { tiktok } from "./tiktok";
import { twitch } from "./twitch";
import { youtube } from "./youtube";

/**
 * Platform connections (owner, Oct 2026): the creator links their own account through the platform's sign-in,
 * then followers and audience update by themselves (daily, `syncConnections` in the hourly job) and the account
 * counts as verified while linked (the sign-in proves ownership). Flow:
 *   start (web: session cookie; app: a 5-minute ticket) → sets a nonce cookie → platform consent screen
 *   → /api/connect/<platform>/callback (state signed + nonce cookie) → saveConnection → back to the dashboard or the app.
 */
export const PROVIDERS: Partial<Record<Platform, Provider>> = { youtube, tiktok, twitch };

export const connectablePlatforms = () =>
  canEncryptTokens() ? (Object.values(PROVIDERS).filter((p) => p!.configured()).map((p) => p!.platform) as Platform[]) : [];

export const providerFor = (platform: string) => {
  const p = PROVIDERS[platform as Platform];
  return p && p.configured() && canEncryptTokens() ? p : null;
};

/**
 * The site address the request came to (wsool.link, or a Netlify branch deploy while testing), so the platform
 * sends the creator back to the same site. Safe: platforms only accept redirect URIs registered with them.
 */
export function requestOrigin(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return siteOrigin();
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export const callbackUrl = (origin: string, platform: Platform) => `${origin}/api/connect/${platform}/callback`;
export const NONCE_COOKIE = "wsool_connect";

// ---- signed values (state for the platform, ticket for the app) ----

const signKey = () => createHmac("sha256", process.env.TOKEN_ENCRYPTION_KEY ?? "").update("wsool-connect").digest();
const sign = (body: string) => createHmac("sha256", signKey()).update(body).digest("base64url");

export type Flow = { userId: string; accountId: string; platform: Platform; source: "web" | "app"; nonce?: string; id?: string };

export function seal(flow: Flow, ttlSeconds: number) {
  const body = Buffer.from(JSON.stringify({ ...flow, exp: Date.now() + ttlSeconds * 1000 })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function unseal(value: string | null | undefined): Flow | null {
  const [body, mac] = (value ?? "").split(".");
  if (!body || !mac) return null;
  const want = Buffer.from(sign(body)), got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const flow = JSON.parse(Buffer.from(body, "base64url").toString()) as Flow & { exp: number };
    return flow.exp > Date.now() ? flow : null;
  } catch {
    return null;
  }
}

export const newNonce = () => randomBytes(16).toString("base64url");

/** The account to connect, only when it's the user's own and on a platform we can connect. */
export async function ownAccount(userId: string, accountId: string) {
  const account = await db.socialAccount.findFirst({
    where: { id: accountId, page: { userId, deletedAt: null } },
    select: { id: true, platform: true, page: { select: { username: true } } },
  });
  return account && providerFor(account.platform) ? account : null;
}

// ---- saving and updating ----

export type ConnectError = "denied" | "failed" | "no_channel" | "taken" | "gone";

const verifiedUntil = () => new Date(Date.now() + VERIFICATION_DAYS * 86_400_000);

/** Code from the platform → tokens → profile → link saved, account updated and verified. */
export async function completeConnection(flow: Flow, code: string, redirectUri: string): Promise<{ ok: true } | { error: ConnectError }> {
  const provider = providerFor(flow.platform);
  const account = provider && (await ownAccount(flow.userId, flow.accountId));
  if (!provider || !account || account.platform !== flow.platform) return { error: "gone" };

  const tokens = await provider.exchange(code, redirectUri).catch(() => null);
  if (!tokens) return { error: "failed" };
  const profile = await provider.profile(tokens.accessToken).catch(() => null);
  if (!profile) {
    await provider.revoke(tokens.refreshToken);
    return { error: "no_channel" };
  }
  // One Wsool account per platform account: someone else can't claim this channel.
  const other = await db.platformConnection.findUnique({ where: { platform_externalId: { platform: flow.platform, externalId: profile.externalId } }, select: { accountId: true } });
  if (other && other.accountId !== account.id) {
    await provider.revoke(tokens.refreshToken);
    return { error: "taken" };
  }
  const audience = await provider.audience?.(tokens.accessToken).catch(() => null);

  const now = new Date();
  await db.$transaction(async (tx) => {
    const data = {
      platform: flow.platform, externalId: profile.externalId, externalName: profile.name?.slice(0, 200) ?? null,
      refreshToken: sealToken(tokens.refreshToken), scopes: tokens.scopes, status: "active" as const, lastSyncAt: now, lastError: null,
    };
    await tx.platformConnection.upsert({ where: { accountId: account.id }, create: { ...data, accountId: account.id }, update: data });
    await tx.socialAccount.update({
      where: { id: account.id },
      data: {
        ...(profile.handle && { handle: profile.handle.slice(0, 60) }),
        url: profile.url,
        ...(profile.followers !== null && { followers: profile.followers, followersUpdatedAt: now }),
        verificationStatus: "verified", verifiedUntil: verifiedUntil(),
      },
    });
    // Linking replaces the screenshot: nothing left for staff to review.
    await tx.verificationRequest.updateMany({ where: { accountId: account.id, status: "pending" }, data: { status: "cancelled" } });
    if (audience) await tx.audienceData.upsert({ where: { accountId: account.id }, create: { accountId: account.id, ...audience }, update: audience });
  });
  expirePage(account.page.username);
  return { ok: true };
}

/** Daily update of every link not refreshed in the last 20 hours (a batch per hourly run). */
export async function syncConnections(limit = 40) {
  const due = await db.platformConnection.findMany({
    where: { status: "active", OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: new Date(Date.now() - 20 * 3_600_000) } }] },
    orderBy: { lastSyncAt: { sort: "asc", nulls: "first" } },
    take: limit,
    select: { id: true, accountId: true, platform: true, externalId: true, refreshToken: true, account: { select: { followers: true, platform: true, handle: true, page: { select: { userId: true, username: true } } } } },
  });
  let synced = 0, lost = 0, failed = 0;
  for (const c of due) {
    const provider = providerFor(c.platform);
    const refresh = openToken(c.refreshToken);
    if (!provider || !refresh) { failed++; continue; }
    try {
      const { accessToken: access, refreshToken: rotated } = await provider.refresh(refresh);
      // Some platforms (TikTok) hand out a new refresh token: keep it before anything else can fail.
      if (rotated && rotated !== refresh) await db.platformConnection.update({ where: { id: c.id }, data: { refreshToken: sealToken(rotated) } });
      const profile = await provider.profile(access);
      // The platform now returns another account (or none): treat it as lost.
      if (!profile || profile.externalId !== c.externalId) throw new RevokedError();
      const audience = await provider.audience?.(access).catch(() => null);
      const now = new Date();
      await db.$transaction(async (tx) => {
        await tx.platformConnection.update({ where: { id: c.id }, data: { lastSyncAt: now, lastError: null } });
        await tx.socialAccount.update({
          where: { id: c.accountId },
          data: {
            ...(profile.handle && { handle: profile.handle.slice(0, 60) }),
            url: profile.url,
            ...(profile.followers !== null && profile.followers !== c.account.followers && { followers: profile.followers, followersUpdatedAt: now }),
            verificationStatus: "verified", verifiedUntil: verifiedUntil(),
          },
        });
        if (audience) await tx.audienceData.upsert({ where: { accountId: c.accountId }, create: { accountId: c.accountId, ...audience }, update: audience });
      });
      expirePage(c.account.page.username);
      synced++;
    } catch (err) {
      if (err instanceof RevokedError) {
        lost++;
        await db.platformConnection.update({ where: { id: c.id }, data: { status: "error", lastError: "revoked", lastSyncAt: new Date() } });
        await notify(c.account.page.userId, "connection_lost", { platform: PLATFORM_NAMES[c.platform], handle: c.account.handle }, { dedupeKey: `connection_lost_${c.id}` });
      } else {
        failed++;
        // Try again in the next round (a few hours), not right away.
        await db.platformConnection.update({ where: { id: c.id }, data: { lastError: String((err as Error).message).slice(0, 200), lastSyncAt: new Date(Date.now() - 16 * 3_600_000) } });
      }
    }
  }
  return { synced, lost, failed };
}

/** Unlink (the creator's own account only): the token is revoked at the platform and deleted here. Verification stays until it expires. */
export async function disconnect(userId: string, accountId: string) {
  const c = await db.platformConnection.findFirst({ where: { accountId, account: { page: { userId } } }, select: { id: true, platform: true, refreshToken: true } });
  if (!c) return false;
  const refresh = openToken(c.refreshToken);
  if (refresh) await PROVIDERS[c.platform]?.revoke(refresh);
  await db.platformConnection.delete({ where: { id: c.id } });
  return true;
}
