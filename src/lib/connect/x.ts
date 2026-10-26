import "server-only";
import { createHash, createHmac } from "node:crypto";
import { rateLimit } from "@/lib/rate-limit";
import { RevokedError } from "./errors";
import type { Provider, ProviderProfile } from "./types";

/**
 * X (owner, Oct 2026): OAuth 2.0 with PKCE (scopes tweet.read users.read offline.access), then `users/me` for the
 * username and follower count, refreshed daily. X's API is paid per call since Feb 2026, so the daily updates are
 * capped (`X_DAILY_SYNC_LIMIT`, default 500/day) and "out of credits" (402/429) is retried later, never treated as a
 * lost link. Access tokens live 2 hours; refresh tokens change on every refresh (saved by syncConnections). The PKCE
 * verifier is derived from the signed state on the server, so it never travels in the URL. Credentials:
 * X_CLIENT_ID / X_CLIENT_SECRET (developer.x.com app, "Web App", redirect https://wsool.link/api/connect/x/callback).
 * Tests: X_API_FAKE.
 */
const fake = process.env.X_API_FAKE?.replace(/\/$/, "");
const URLS = {
  auth: fake ? `${fake}/i/oauth2/authorize` : "https://x.com/i/oauth2/authorize",
  token: fake ? `${fake}/2/oauth2/token` : "https://api.x.com/2/oauth2/token",
  revoke: fake ? `${fake}/2/oauth2/revoke` : "https://api.x.com/2/oauth2/revoke",
  me: fake ? `${fake}/2/users/me` : "https://api.x.com/2/users/me",
};
const SCOPES = ["tweet.read", "users.read", "offline.access"];
const TIMEOUT = 10_000;
const DAILY_LIMIT = Number(process.env.X_DAILY_SYNC_LIMIT) || 500;

const client = () => {
  const id = process.env.X_CLIENT_ID, secret = process.env.X_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
};

/** PKCE verifier for one sign-in: an HMAC of the signed state (server secret), 43 chars of base64url. */
const verifier = (state: string) =>
  createHmac("sha256", `${process.env.TOKEN_ENCRYPTION_KEY}:x-pkce`).update(state).digest("base64url");

type TokenBody = { access_token?: string; refresh_token?: string; scope?: string; error?: string };

async function token(params: Record<string, string>) {
  const c = client()!;
  const res = await fetch(URLS.token, {
    method: "POST", signal: AbortSignal.timeout(TIMEOUT),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${c.id}:${c.secret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ client_id: c.id, ...params }),
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as TokenBody };
}

export const x: Provider = {
  platform: "x",
  configured: () => !!client(),

  authUrl(state, redirectUri) {
    const challenge = createHash("sha256").update(verifier(state)).digest("base64url");
    const q = new URLSearchParams({
      response_type: "code", client_id: client()!.id, redirect_uri: redirectUri, scope: SCOPES.join(" "), state,
      code_challenge: challenge, code_challenge_method: "S256",
    });
    return `${URLS.auth}?${q}`;
  },

  async exchange(code, redirectUri, state) {
    if (!state) return null;
    const { status, body } = await token({ code, grant_type: "authorization_code", redirect_uri: redirectUri, code_verifier: verifier(state) });
    if (status !== 200 || !body.access_token || !body.refresh_token) return null;
    return { accessToken: body.access_token, refreshToken: body.refresh_token, scopes: body.scope ?? "" };
  },

  async refresh(refreshToken) {
    // Each daily update costs a paid call: stop at the daily cap and try again in the next round.
    if (!(await rateLimit("x-sync-day", DAILY_LIMIT, 86_400))) throw new Error("x daily limit");
    const { status, body } = await token({ grant_type: "refresh_token", refresh_token: refreshToken });
    if (status === 400 || status === 401 || body.error === "invalid_grant") throw new RevokedError();
    if (status !== 200 || !body.access_token) throw new Error(`x token ${status}`);
    return { accessToken: body.access_token, refreshToken: body.refresh_token };
  },

  async profile(accessToken): Promise<ProviderProfile | null> {
    const res = await fetch(`${URLS.me}?user.fields=public_metrics,username,name`, {
      headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(TIMEOUT),
    });
    if (res.status === 401) throw new RevokedError();
    // 402 / 429 = out of credits or rate-limited: not the creator's fault, retry later.
    if (!res.ok) throw new Error(`x users/me ${res.status}`);
    type Body = { data?: { id: string; name?: string; username?: string; public_metrics?: { followers_count?: number } } };
    const u = ((await res.json()) as Body).data;
    if (!u?.id || !u.username) return null;
    return {
      externalId: u.id,
      name: u.name ?? u.username,
      handle: u.username,
      url: `https://x.com/${u.username}`,
      followers: typeof u.public_metrics?.followers_count === "number" ? u.public_metrics.followers_count : null,
    };
  },

  async revoke(refreshToken) {
    const c = client()!;
    await fetch(URLS.revoke, {
      method: "POST", signal: AbortSignal.timeout(TIMEOUT),
      headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${Buffer.from(`${c.id}:${c.secret}`).toString("base64")}` },
      body: new URLSearchParams({ token: refreshToken, token_type_hint: "refresh_token", client_id: c.id }),
    }).catch(() => {});
  },
};
