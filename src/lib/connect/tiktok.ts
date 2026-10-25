import "server-only";
import { RevokedError } from "./errors";
import type { Provider, ProviderProfile } from "./types";

/**
 * TikTok through Login Kit (owner, Oct 2026): the creator signs in on TikTok, then we read their username and
 * follower count (Display API `user/info`, scopes user.info.basic + user.info.profile + user.info.stats). TikTok's
 * public API has no audience data, so audience stays manual. Access tokens live 24h, refresh tokens 365 days and
 * may change on every refresh (the new one is saved by syncConnections). Credentials: TIKTOK_CLIENT_KEY /
 * TIKTOK_CLIENT_SECRET (redirect URI https://wsool.link/api/connect/tiktok/callback). Tests: TIKTOK_API_FAKE.
 */
const fake = process.env.TIKTOK_API_FAKE?.replace(/\/$/, "");
const URLS = {
  auth: fake ? `${fake}/v2/auth/authorize/` : "https://www.tiktok.com/v2/auth/authorize/",
  token: fake ? `${fake}/v2/oauth/token/` : "https://open.tiktokapis.com/v2/oauth/token/",
  revoke: fake ? `${fake}/v2/oauth/revoke/` : "https://open.tiktokapis.com/v2/oauth/revoke/",
  user: fake ? `${fake}/v2/user/info/` : "https://open.tiktokapis.com/v2/user/info/",
};
const SCOPES = ["user.info.basic", "user.info.profile", "user.info.stats"];
const TIMEOUT = 10_000;

const client = () => {
  const key = process.env.TIKTOK_CLIENT_KEY, secret = process.env.TIKTOK_CLIENT_SECRET;
  return key && secret ? { key, secret } : null;
};

type TokenBody = { access_token?: string; refresh_token?: string; scope?: string; error?: string };

async function token(params: Record<string, string>): Promise<{ status: number; body: TokenBody }> {
  const c = client()!;
  const res = await fetch(URLS.token, {
    method: "POST", signal: AbortSignal.timeout(TIMEOUT),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: c.key, client_secret: c.secret, ...params }),
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as TokenBody };
}

export const tiktok: Provider = {
  platform: "tiktok",
  configured: () => !!client(),

  authUrl(state, redirectUri) {
    const q = new URLSearchParams({ client_key: client()!.key, scope: SCOPES.join(","), response_type: "code", redirect_uri: redirectUri, state });
    return `${URLS.auth}?${q}`;
  },

  async exchange(code, redirectUri) {
    const { status, body } = await token({ code, grant_type: "authorization_code", redirect_uri: redirectUri });
    if (status !== 200 || !body.access_token || !body.refresh_token) return null;
    // The follower count needs user.info.stats: a creator who unticked it can't be linked.
    if (body.scope && !body.scope.split(",").includes("user.info.stats")) return null;
    return { accessToken: body.access_token, refreshToken: body.refresh_token, scopes: body.scope ?? "" };
  },

  async refresh(refreshToken) {
    const { status, body } = await token({ grant_type: "refresh_token", refresh_token: refreshToken });
    if (body.error === "invalid_grant") throw new RevokedError();
    if (status !== 200 || !body.access_token) throw new Error(`tiktok token ${status}`);
    return { accessToken: body.access_token, refreshToken: body.refresh_token };
  },

  async profile(accessToken): Promise<ProviderProfile | null> {
    const fields = "open_id,display_name,username,follower_count";
    const res = await fetch(`${URLS.user}?fields=${fields}`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(TIMEOUT) });
    type Body = { data?: { user?: { open_id?: string; display_name?: string; username?: string; follower_count?: number } }; error?: { code?: string } };
    const body = (await res.json().catch(() => ({}))) as Body;
    const code = body.error?.code;
    if (res.status === 401 || code === "access_token_invalid" || code === "scope_not_authorized") throw new RevokedError();
    if (!res.ok || (code && code !== "ok")) throw new Error(`tiktok user ${res.status} ${code ?? ""}`);
    const u = body.data?.user;
    if (!u?.open_id) return null;
    const handle = (u.username ?? "").replace(/^@/, "");
    return {
      externalId: u.open_id,
      name: u.display_name ?? null,
      handle: handle || null,
      url: handle ? `https://www.tiktok.com/@${handle}` : "https://www.tiktok.com/",
      followers: typeof u.follower_count === "number" ? u.follower_count : null,
    };
  },

  async revoke(refreshToken) {
    // TikTok revokes with an access token: get one first (a refused refresh means it's already gone).
    try {
      const { accessToken } = await tiktok.refresh(refreshToken);
      const c = client()!;
      await fetch(URLS.revoke, {
        method: "POST", signal: AbortSignal.timeout(TIMEOUT),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_key: c.key, client_secret: c.secret, token: accessToken }),
      });
    } catch {}
  },
};
