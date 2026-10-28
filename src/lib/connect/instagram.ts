import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { RevokedError } from "./errors";
import type { Audience, Provider, ProviderProfile } from "./types";

/**
 * Instagram (owner, Oct 2026) through "Instagram API with Instagram Login": the creator signs in with their Instagram
 * professional account (creator or business; no Facebook Page needed). Scopes instagram_business_basic (profile,
 * followers) + instagram_business_manage_insights (follower demographics, views). Until Meta's app review passes, only
 * Instagram testers of the app can link. Tokens: the code gives a 1-hour token, swapped for a 60-day token; that
 * long-lived token is what we store ("refresh token") and renew on every daily update (`refresh_access_token`, which
 * hands back a new one). Credentials: INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET (Meta app → Instagram API → API setup with
 * Instagram login; redirect https://wsool.link/api/connect/instagram/callback). Meta's insights rules change often, so
 * each read tries the known request shapes and logs refusals as `[instagram]`. Tests: INSTAGRAM_API_FAKE.
 */
const fake = process.env.INSTAGRAM_API_FAKE?.replace(/\/$/, "");
const URLS = {
  auth: fake ? `${fake}/oauth/authorize` : "https://www.instagram.com/oauth/authorize",
  token: fake ? `${fake}/oauth/access_token` : "https://api.instagram.com/oauth/access_token",
  graph: fake ? `${fake}/graph` : "https://graph.instagram.com",
};
const VERSION = "v23.0";
const SCOPES = ["instagram_business_basic", "instagram_business_manage_insights"];
const TIMEOUT = 10_000;

const client = () => {
  const id = process.env.INSTAGRAM_APP_ID, secret = process.env.INSTAGRAM_APP_SECRET;
  return id && secret ? { id, secret } : null;
};

type GraphError = { error?: { code?: number; message?: string; type?: string } };

/** GET on graph.instagram.com. Code 190 = the token is no longer valid (unlinked, password changed, expired). */
async function graph<T>(path: string, params: Record<string, string>, token: string): Promise<T> {
  const q = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`${URLS.graph}${path}?${q}`, { signal: AbortSignal.timeout(TIMEOUT) });
  const body = (await res.json().catch(() => ({}))) as T & GraphError;
  if (body.error?.code === 190 || res.status === 401) throw new RevokedError();
  if (!res.ok || body.error) throw new Error(`instagram ${path} ${res.status} ${body.error?.code ?? ""} ${body.error?.message ?? ""}`.slice(0, 200));
  return body;
}

/** Tries each request until one works (Meta changes which parameters an insight accepts); logs the refusals. */
async function firstOk<T>(tries: (() => Promise<T>)[]): Promise<T | null> {
  for (const run of tries) {
    try {
      return await run();
    } catch (err) {
      if (err instanceof RevokedError) throw err;
      console.warn("[instagram]", (err as Error).message);
    }
  }
  return null;
}

/** Whole percents (rounded down so a group never passes 100), biggest first, zeros dropped. */
function shares(parts: [string, number][], max: number) {
  const total = parts.reduce((s, [, v]) => s + v, 0);
  if (total <= 0) return [];
  return parts
    .map(([label, value]) => ({ label, percent: Math.floor((value / total) * 100) }))
    .filter((s) => s.percent > 0)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, max);
}

/** Instagram's own age groups, youngest first. */
const AGES = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

type Breakdown = { data?: { total_value?: { breakdowns?: { results?: { dimension_values?: string[]; value?: number }[] }[] } }[] };

/** Follower counts per value of one breakdown (age, gender, country or city). */
async function demographics(token: string, breakdown: string): Promise<[string, number][]> {
  const base = { metric: "follower_demographics", period: "lifetime", metric_type: "total_value", breakdown };
  const body = await firstOk<Breakdown>([
    () => graph("/" + VERSION + "/me/insights", base, token),
    () => graph("/" + VERSION + "/me/insights", { ...base, timeframe: "this_month" }, token),
    () => graph("/" + VERSION + "/me/insights", { ...base, timeframe: "last_90_days" }, token),
  ]);
  const results = body?.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
  return results
    .map((r) => [String(r.dimension_values?.[0] ?? "").trim(), Number(r.value) || 0] as [string, number])
    .filter(([label, v]) => label && v > 0);
}

/** "Riyadh, Riyadh Region" → "Riyadh". */
const cityName = (v: string) => {
  const s = v.split(",")[0].trim();
  return s && s.length <= 40 && /\p{L}/u.test(s) ? s : null;
};

async function audience(token: string): Promise<Audience | null> {
  // Meta returns follower demographics only for accounts with at least 100 followers.
  const [gender, ages, countries, cities] = await Promise.all(["gender", "age", "country", "city"].map((b) => demographics(token, b)));
  const g = shares(
    gender.map(([k, v]) => [k.toUpperCase() === "F" ? "female" : k.toUpperCase() === "M" ? "male" : "", v] as [string, number]).filter(([k]) => k),
    2,
  ) as Audience["gender"];
  const result: Audience = {
    gender: g,
    ages: shares(ages.filter(([k]) => AGES.includes(k)), AGES.length).sort((a, b) => AGES.indexOf(a.label) - AGES.indexOf(b.label)),
    countries: shares(countries.map(([k, v]) => [k.toUpperCase(), v] as [string, number]).filter(([k]) => /^[A-Z]{2}$/.test(k)), 5),
  };
  const named = cities.map(([k, v]) => [cityName(k), v] as const).filter((r): r is [string, number] => !!r[0]);
  // Shares of all followers Instagram placed in a city (its top cities only).
  const c = shares(named, 5);
  if (c.length) result.cities = c;
  return result.gender.length || result.ages.length || result.countries.length ? result : null;
}

type Totals = { data?: { name?: string; total_value?: { value?: number } }[] };

/** Account views between two dates (Meta caps a range at 30 days, so a month is read in two halves). */
async function viewsBetween(token: string, since: Date, until: Date) {
  const s = String(Math.floor(since.getTime() / 1000)), u = String(Math.floor(until.getTime() / 1000));
  const body = await firstOk<Totals>([
    () => graph("/" + VERSION + "/me/insights", { metric: "views", period: "day", metric_type: "total_value", since: s, until: u }, token),
  ]);
  const v = body?.data?.[0]?.total_value?.value;
  return typeof v === "number" ? v : null;
}

export const instagram: Provider = {
  platform: "instagram",
  configured: () => !!client(),

  authUrl(state, redirectUri) {
    const q = new URLSearchParams({
      client_id: client()!.id, redirect_uri: redirectUri, response_type: "code", scope: SCOPES.join(","), state,
      // Lets the creator pick another account instead of the one already signed in.
      force_reauth: "true",
    });
    return `${URLS.auth}?${q}`;
  },

  async exchange(code, redirectUri) {
    const c = client()!;
    // Instagram may append "#_" to the code in the redirect.
    const res = await fetch(URLS.token, {
      method: "POST", signal: AbortSignal.timeout(TIMEOUT),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: c.id, client_secret: c.secret, grant_type: "authorization_code", redirect_uri: redirectUri, code: code.replace(/#_$/, "") }),
    });
    type Short = { access_token?: string; permissions?: string[] | string; data?: { access_token?: string; permissions?: string }[] };
    const body = (await res.json().catch(() => ({}))) as Short;
    const short = body.access_token ?? body.data?.[0]?.access_token;
    if (!res.ok || !short) return null;
    // Swap the 1-hour token for a 60-day one (the one we keep and renew daily).
    const long = await graph<{ access_token?: string }>("/access_token", { grant_type: "ig_exchange_token", client_secret: c.secret }, short).catch(() => null);
    if (!long?.access_token) return null;
    const perms = body.permissions ?? body.data?.[0]?.permissions ?? "";
    return { accessToken: long.access_token, refreshToken: long.access_token, scopes: Array.isArray(perms) ? perms.join(",") : perms };
  },

  async refresh(longToken) {
    // Renews the 60-day token (only allowed once it is a day old; until then the current one still works).
    try {
      const body = await graph<{ access_token?: string }>("/refresh_access_token", { grant_type: "ig_refresh_token" }, longToken);
      if (body.access_token) return { accessToken: body.access_token, refreshToken: body.access_token };
    } catch (err) {
      if (err instanceof RevokedError) throw err;
      console.warn("[instagram]", (err as Error).message);
    }
    return { accessToken: longToken };
  },

  async profile(token): Promise<ProviderProfile | null> {
    type Me = { id?: string; user_id?: string; username?: string; name?: string; account_type?: string; followers_count?: number };
    const me = await graph<Me>("/" + VERSION + "/me", { fields: "id,user_id,username,name,account_type,followers_count" }, token);
    if (!me.id || !me.username) return null;
    return {
      externalId: me.id,
      name: me.name || me.username,
      handle: me.username,
      url: `https://www.instagram.com/${me.username}`,
      followers: typeof me.followers_count === "number" ? me.followers_count : null,
    };
  },

  audience,

  async monthlyViews(token) {
    // Insights settle within a day or two: from the 3rd, the month before is complete.
    const now = new Date();
    if (now.getUTCDate() < 3) return null;
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const mid = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 16));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [a, b] = await Promise.all([viewsBetween(token, start, mid), viewsBetween(token, mid, end)]);
    return a === null || b === null ? null : { month: start, views: Math.round(a + b) };
  },

  // Instagram Login has no token revoke endpoint: removing the app happens in the creator's Instagram settings.
  async revoke() {},
};

/**
 * Meta's signed_request (deauthorize and data deletion callbacks): "<sig>.<payload>", both base64url, signed with
 * HMAC-SHA256 by the Instagram app secret. Returns the Instagram user id, or null when the signature is wrong.
 */
export function readSignedRequest(signed: string | null | undefined): { userId: string } | null {
  const secret = client()?.secret;
  const [sig, payload] = String(signed ?? "").split(".");
  if (!secret || !sig || !payload) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { user_id?: string | number; algorithm?: string };
    if (String(data.algorithm ?? "").toUpperCase() !== "HMAC-SHA256" || !data.user_id) return null;
    return { userId: String(data.user_id) };
  } catch {
    return null;
  }
}
