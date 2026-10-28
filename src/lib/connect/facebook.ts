import "server-only";
import { RevokedError } from "./errors";
import type { Provider, ProviderProfile } from "./types";

/**
 * Facebook Pages (owner, Oct 2026) through Facebook Login for Business (same Meta app as Instagram/Threads): the creator
 * signs in with Facebook and picks their Page. Personal profiles can't be read by any app. Permissions pages_show_list +
 * pages_read_engagement (followers) + read_insights (views). We keep the Page's own access token (it doesn't expire when it
 * comes from a long-lived user token), sealed like the other platforms' refresh tokens. Meta removed Page audience
 * demographics from the API, so the creator fills the audience from a screenshot. Monthly views: Meta replaced
 * impressions with "media views" (Nov 2025), so we try the known metric names and log refusals as `[facebook]`.
 * Credentials: FACEBOOK_APP_ID / FACEBOOK_APP_SECRET (App settings → Basic) + FACEBOOK_CONFIG_ID (the Login for Business
 * configuration; without it the classic `scope` is sent). Redirect https://wsool.link/api/connect/facebook/callback.
 * Tests: FACEBOOK_API_FAKE.
 */
const fake = process.env.FACEBOOK_API_FAKE?.replace(/\/$/, "");
const VERSION = "v23.0";
const URLS = {
  auth: fake ? `${fake}/dialog/oauth` : `https://www.facebook.com/${VERSION}/dialog/oauth`,
  graph: fake ? `${fake}/graph` : `https://graph.facebook.com/${VERSION}`,
};
const SCOPES = ["pages_show_list", "pages_read_engagement", "read_insights"];
const TIMEOUT = 10_000;

const client = () => {
  const id = process.env.FACEBOOK_APP_ID, secret = process.env.FACEBOOK_APP_SECRET;
  return id && secret ? { id, secret, config: process.env.FACEBOOK_CONFIG_ID || null } : null;
};

type GraphError = { error?: { code?: number; message?: string } };

async function graph<T>(path: string, params: Record<string, string>, token: string | null): Promise<T> {
  const q = new URLSearchParams(token ? { ...params, access_token: token } : params);
  const res = await fetch(`${URLS.graph}${path}?${q}`, { signal: AbortSignal.timeout(TIMEOUT) });
  const body = (await res.json().catch(() => ({}))) as T & GraphError;
  if (body.error?.code === 190 || res.status === 401) throw new RevokedError();
  if (!res.ok || body.error) throw new Error(`facebook ${path} ${res.status} ${body.error?.code ?? ""} ${body.error?.message ?? ""}`.slice(0, 200));
  return body;
}

const quiet = <T>(p: Promise<T>) =>
  p.catch((err) => {
    if (err instanceof RevokedError) throw err;
    console.warn("[facebook]", (err as Error).message);
    return null;
  });

type PageInfo = { id: string; name?: string; username?: string; link?: string; followers_count?: number; fan_count?: number; access_token?: string };

/** A Page's details. Meta keeps retiring Page fields, so fewer fields are tried after a refusal (logged). */
async function pageDetails(id: string, token: string, strict = false): Promise<PageInfo> {
  const sets = ["id,name,username,link,followers_count", "id,name,link,followers_count", "id,name,followers_count", "id,name"];
  for (const [i, fields] of sets.entries()) {
    try {
      return await graph<PageInfo>(`/${id}`, { fields }, token);
    } catch (err) {
      if (err instanceof RevokedError || (strict && i === sets.length - 1)) throw err;
      console.warn("[facebook]", (err as Error).message);
    }
  }
  return { id };
}

/**
 * The Pages the creator shared, with their own tokens: /me/accounts, else (Pages reached through a business portfolio
 * may be missing there) the Page ids the login granted (debug_token's granular scopes), read one by one.
 */
async function sharedPages(userToken: string): Promise<PageInfo[]> {
  const list = await quiet(graph<{ data?: PageInfo[] }>("/me/accounts", { fields: "id,name,access_token", limit: "100" }, userToken));
  if (list?.data?.length) return list.data;
  const c = client()!;
  type Debug = { data?: { granular_scopes?: { scope?: string; target_ids?: string[] }[] } };
  const debug = await quiet(graph<Debug>("/debug_token", { input_token: userToken }, `${c.id}|${c.secret}`));
  const ids = new Set((debug?.data?.granular_scopes ?? []).filter((g) => g.scope?.startsWith("pages_")).flatMap((g) => g.target_ids ?? []));
  const pages = await Promise.all([...ids].map((id) => quiet(graph<PageInfo>(`/${id}`, { fields: "id,name,access_token" }, userToken))));
  return pages.filter((p): p is PageInfo => !!p?.id);
}

/** "wsool.link", "https://facebook.com/wsool.link" or "@Wsool.Link" → "wsool.link". */
const slug = (v: string | null | undefined) => String(v ?? "").trim().toLowerCase().replace(/^@/, "").replace(/^https?:\/\/(www\.|m\.)?facebook\.com\//, "").split(/[/?#]/)[0];

/** The Page the creator picked: the one whose username or link matches the saved account, else the only one shared. */
function pickPage(pages: PageInfo[], url: string) {
  const want = slug(url);
  const match = pages.find((p) => want && (slug(p.username) === want || slug(p.link) === want || p.id === want));
  return match ?? (pages.length === 1 ? pages[0] : null);
}

export const facebook: Provider = {
  platform: "facebook",
  configured: () => !!client(),
  notFound: "no_page",

  authUrl(state, redirectUri) {
    const c = client()!;
    const q = new URLSearchParams({ client_id: c.id, redirect_uri: redirectUri, state, response_type: "code" });
    if (c.config) q.set("config_id", c.config);
    else q.set("scope", SCOPES.join(","));
    return `${URLS.auth}?${q}`;
  },

  async exchange(code, redirectUri) {
    const c = client()!;
    const short = await graph<{ access_token?: string }>("/oauth/access_token", { client_id: c.id, client_secret: c.secret, redirect_uri: redirectUri, code }, null).catch(() => null);
    if (!short?.access_token) return null;
    // A long-lived user token gives Page tokens that don't expire.
    const long = await graph<{ access_token?: string }>("/oauth/access_token", {
      grant_type: "fb_exchange_token", client_id: c.id, client_secret: c.secret, fb_exchange_token: short.access_token,
    }, null).catch(() => null);
    if (!long?.access_token) return null;
    // Until profile() picks the Page, the "refresh token" is the user token; profile() swaps it for the Page token.
    return { accessToken: long.access_token, refreshToken: long.access_token, scopes: SCOPES.join(",") };
  },

  async refresh(pageToken) {
    // Page tokens don't expire; a call that fails with 190 means the creator removed the app or lost the Page.
    await graph("/me", { fields: "id" }, pageToken);
    return { accessToken: pageToken };
  },

  async profile(token, account): Promise<ProviderProfile | null> {
    if (account.externalId) {
      // Daily update: the token is already the Page's own.
      return toProfile(await pageDetails(account.externalId, token, true));
    }
    // Linking: the Pages the creator shared, each with its own token.
    const pages = await sharedPages(token);
    if (!pages.length) {
      console.warn("[facebook] no Pages shared with the app");
      return null;
    }
    const detailed = await Promise.all(pages.map(async (p) => ({ ...p, ...(await pageDetails(p.id, p.access_token ?? token).catch(() => ({}))) })));
    const page = pickPage(detailed, account.url);
    if (!page?.access_token) {
      console.warn("[facebook] no Page matches", slug(account.url), "among", detailed.map((p) => slug(p.username) || p.id).join(","));
      return null;
    }
    return { ...toProfile(page), refreshToken: page.access_token };
  },

  async monthlyViews(pageToken) {
    const now = new Date();
    if (now.getUTCDate() < 3) return null;
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    type Insights = { data?: { values?: { value?: number }[] }[] };
    for (const metric of ["page_media_view", "page_views_total"]) {
      const body = await quiet(graph<Insights>("/me/insights", { metric, period: "day", since: String(start.getTime() / 1000), until: String(end.getTime() / 1000) }, pageToken));
      const values = body?.data?.[0]?.values;
      if (values) return { month: start, views: Math.round(values.reduce((s, v) => s + (Number(v.value) || 0), 0)) };
    }
    return null;
  },

  // Removing the app happens in the creator's Facebook settings; the Page token stops working then.
  async revoke() {},
};

function toProfile(page: PageInfo): ProviderProfile {
  const followers = typeof page.followers_count === "number" ? page.followers_count : typeof page.fan_count === "number" ? page.fan_count : null;
  const handle = page.username ?? null;
  return {
    externalId: page.id,
    name: page.name ?? handle,
    handle,
    url: handle ? `https://www.facebook.com/${handle}` : page.link ?? `https://www.facebook.com/${page.id}`,
    followers,
  };
}
