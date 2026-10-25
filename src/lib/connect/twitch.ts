import "server-only";
import { RevokedError } from "./errors";
import type { Provider, ProviderProfile } from "./types";

/**
 * Twitch (owner, Oct 2026): the creator signs in on Twitch, then we read their channel (Helix `users`) and its follower
 * total (`channels/followers`, scope moderator:read:followers). No audience data. No app review needed. Refresh tokens
 * change on every refresh (saved by syncConnections). Credentials: TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET (a
 * "Confidential" app at dev.twitch.tv, redirect https://wsool.link/api/connect/twitch/callback). Tests: TWITCH_API_FAKE.
 */
const fake = process.env.TWITCH_API_FAKE?.replace(/\/$/, "");
const URLS = {
  auth: fake ? `${fake}/oauth2/authorize` : "https://id.twitch.tv/oauth2/authorize",
  token: fake ? `${fake}/oauth2/token` : "https://id.twitch.tv/oauth2/token",
  revoke: fake ? `${fake}/oauth2/revoke` : "https://id.twitch.tv/oauth2/revoke",
  helix: fake ? `${fake}/helix` : "https://api.twitch.tv/helix",
};
const SCOPES = ["moderator:read:followers"];
const TIMEOUT = 10_000;

const client = () => {
  const id = process.env.TWITCH_CLIENT_ID, secret = process.env.TWITCH_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
};

type TokenBody = { access_token?: string; refresh_token?: string; scope?: string[] };

async function token(params: Record<string, string>) {
  const c = client()!;
  const res = await fetch(URLS.token, {
    method: "POST", signal: AbortSignal.timeout(TIMEOUT),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: c.id, client_secret: c.secret, ...params }),
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as TokenBody };
}

async function helix<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${URLS.helix}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, "Client-Id": client()!.id }, signal: AbortSignal.timeout(TIMEOUT),
  });
  if (res.status === 401) throw new RevokedError();
  if (!res.ok) throw new Error(`twitch ${res.status}`);
  return (await res.json()) as T;
}

export const twitch: Provider = {
  platform: "twitch",
  configured: () => !!client(),

  authUrl(state, redirectUri) {
    const q = new URLSearchParams({ client_id: client()!.id, redirect_uri: redirectUri, response_type: "code", scope: SCOPES.join(" "), state, force_verify: "true" });
    return `${URLS.auth}?${q}`;
  },

  async exchange(code, redirectUri) {
    const { status, body } = await token({ code, grant_type: "authorization_code", redirect_uri: redirectUri });
    if (status !== 200 || !body.access_token || !body.refresh_token) return null;
    return { accessToken: body.access_token, refreshToken: body.refresh_token, scopes: (body.scope ?? []).join(" ") };
  },

  async refresh(refreshToken) {
    const { status, body } = await token({ grant_type: "refresh_token", refresh_token: refreshToken });
    // Twitch answers 400 "Invalid refresh token" once the creator removed the connection or changed their password.
    if (status === 400 || status === 401) throw new RevokedError();
    if (status !== 200 || !body.access_token) throw new Error(`twitch token ${status}`);
    return { accessToken: body.access_token, refreshToken: body.refresh_token };
  },

  async profile(accessToken): Promise<ProviderProfile | null> {
    const users = await helix<{ data?: { id: string; login: string; display_name?: string }[] }>("/users", accessToken);
    const u = users.data?.[0];
    if (!u) return null;
    const followers = await helix<{ total?: number }>(`/channels/followers?broadcaster_id=${encodeURIComponent(u.id)}&first=1`, accessToken);
    return {
      externalId: u.id,
      name: u.display_name ?? u.login,
      handle: u.login,
      url: `https://www.twitch.tv/${u.login}`,
      followers: typeof followers.total === "number" ? followers.total : null,
    };
  },

  async revoke(refreshToken) {
    // Twitch revokes with an access token: get one first (a refused refresh means it's already gone).
    try {
      const { accessToken } = await twitch.refresh(refreshToken);
      await fetch(URLS.revoke, {
        method: "POST", signal: AbortSignal.timeout(TIMEOUT),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: client()!.id, token: accessToken }),
      });
    } catch {}
  },
};
