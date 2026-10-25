import "server-only";
import { RevokedError } from "./errors";
import type { Provider, ProviderProfile } from "./types";

/**
 * Discord (owner, Oct 2026): on Wsool a Discord account is a server (the creator's invite link; followers = members).
 * The creator signs in with Discord (scopes identify + guilds); we turn their saved invite link into the server id and
 * link only when they own or manage that server (owner, Administrator or Manage Server). Members = the server's
 * approximate_member_count, refreshed daily. No audience data, no app review. Refresh tokens rotate. Credentials:
 * DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET (discord.com/developers app, redirect
 * https://wsool.link/api/connect/discord/callback). Tests: DISCORD_API_FAKE.
 */
const fake = process.env.DISCORD_API_FAKE?.replace(/\/$/, "");
const URLS = {
  auth: fake ? `${fake}/oauth2/authorize` : "https://discord.com/oauth2/authorize",
  token: fake ? `${fake}/api/oauth2/token` : "https://discord.com/api/oauth2/token",
  revoke: fake ? `${fake}/api/oauth2/token/revoke` : "https://discord.com/api/oauth2/token/revoke",
  api: fake ? `${fake}/api/v10` : "https://discord.com/api/v10",
};
const SCOPES = ["identify", "guilds"];
const TIMEOUT = 10_000;
// Permission bits that count as running the server.
const ADMINISTRATOR = BigInt(0x8), MANAGE_GUILD = BigInt(0x20);

const client = () => {
  const id = process.env.DISCORD_CLIENT_ID, secret = process.env.DISCORD_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
};

type TokenBody = { access_token?: string; refresh_token?: string; scope?: string; error?: string };
type Guild = { id: string; name: string; owner?: boolean; permissions?: string; approximate_member_count?: number };

async function token(params: Record<string, string>) {
  const c = client()!;
  const res = await fetch(URLS.token, {
    method: "POST", signal: AbortSignal.timeout(TIMEOUT),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: c.id, client_secret: c.secret, ...params }),
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as TokenBody };
}

/** Server id behind an invite link (public endpoint, no sign-in needed). */
async function inviteGuildId(url: string): Promise<string | null> {
  const code = url.match(/discord\.gg\/([A-Za-z0-9-]+)/)?.[1];
  if (!code) return null;
  const res = await fetch(`${URLS.api}/invites/${encodeURIComponent(code)}`, { signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => ({}))) as { guild?: { id?: string } };
  return body.guild?.id ?? null;
}

const runs = (g: Guild) => {
  if (g.owner) return true;
  try {
    const p = BigInt(g.permissions ?? "0");
    return (p & ADMINISTRATOR) !== BigInt(0) || (p & MANAGE_GUILD) !== BigInt(0);
  } catch {
    return false;
  }
};

export const discord: Provider = {
  platform: "discord",
  configured: () => !!client(),
  notFound: "no_server",

  authUrl(state, redirectUri) {
    const q = new URLSearchParams({ client_id: client()!.id, redirect_uri: redirectUri, response_type: "code", scope: SCOPES.join(" "), state, prompt: "consent" });
    return `${URLS.auth}?${q}`;
  },

  async exchange(code, redirectUri) {
    const { status, body } = await token({ code, grant_type: "authorization_code", redirect_uri: redirectUri });
    if (status !== 200 || !body.access_token || !body.refresh_token) return null;
    return { accessToken: body.access_token, refreshToken: body.refresh_token, scopes: body.scope ?? "" };
  },

  async refresh(refreshToken) {
    const { status, body } = await token({ grant_type: "refresh_token", refresh_token: refreshToken });
    if (body.error === "invalid_grant" || status === 401) throw new RevokedError();
    if (status !== 200 || !body.access_token) throw new Error(`discord token ${status}`);
    return { accessToken: body.access_token, refreshToken: body.refresh_token };
  },

  async profile(accessToken, account): Promise<ProviderProfile | null> {
    // First link: the server behind the saved invite. Daily update: the server we linked.
    const guildId = account.externalId ?? (await inviteGuildId(account.url));
    if (!guildId) return null;
    const res = await fetch(`${URLS.api}/users/@me/guilds?with_counts=true&limit=200`, {
      headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(TIMEOUT),
    });
    if (res.status === 401) throw new RevokedError();
    if (!res.ok) throw new Error(`discord guilds ${res.status}`);
    const guild = ((await res.json()) as Guild[]).find((g) => g.id === guildId);
    // Left the server or lost the right to run it: not theirs to show.
    if (!guild || !runs(guild)) return null;
    return {
      externalId: guild.id,
      name: guild.name,
      handle: null,
      url: account.url,
      followers: typeof guild.approximate_member_count === "number" ? guild.approximate_member_count : null,
    };
  },

  async revoke(refreshToken) {
    const c = client()!;
    await fetch(URLS.revoke, {
      method: "POST", signal: AbortSignal.timeout(TIMEOUT),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: c.id, client_secret: c.secret, token: refreshToken, token_type_hint: "refresh_token" }),
    }).catch(() => {});
  },
};
