import "server-only";
import { RevokedError } from "./errors";
import type { Audience, Provider, ProviderProfile } from "./types";

/**
 * Threads (owner, Oct 2026) through the Threads API (same Meta app as Instagram, "Access the Threads API" use case): the
 * creator signs in with Threads. Scopes threads_basic (profile) + threads_manage_insights (followers, follower
 * demographics, views). Until Meta's app review passes, only Threads testers of the app can link. Tokens work like
 * Instagram's: a 1-hour token swapped for a 60-day one, stored as the "refresh token" and renewed on every daily update.
 * Demographics need 100+ followers and take one breakdown per call. Credentials: THREADS_APP_ID / THREADS_APP_SECRET
 * (Threads use case → Settings; redirect https://wsool.link/api/connect/threads/callback). Refusals are logged as
 * `[threads]`. Tests: THREADS_API_FAKE.
 */
const fake = process.env.THREADS_API_FAKE?.replace(/\/$/, "");
const URLS = {
  auth: fake ? `${fake}/oauth/authorize` : "https://threads.net/oauth/authorize",
  graph: fake ? `${fake}/graph` : "https://graph.threads.net",
};
const VERSION = "v1.0";
const SCOPES = ["threads_basic", "threads_manage_insights"];
const TIMEOUT = 10_000;

const client = () => {
  const id = process.env.THREADS_APP_ID, secret = process.env.THREADS_APP_SECRET;
  return id && secret ? { id, secret } : null;
};

type GraphError = { error?: { code?: number; message?: string } };

/** Call graph.threads.net. Code 190 = the token is no longer valid. */
async function graph<T>(path: string, params: Record<string, string>, token: string | null, method: "GET" | "POST" = "GET"): Promise<T> {
  const q = new URLSearchParams(token ? { ...params, access_token: token } : params);
  const res = method === "GET"
    ? await fetch(`${URLS.graph}${path}?${q}`, { signal: AbortSignal.timeout(TIMEOUT) })
    : await fetch(`${URLS.graph}${path}`, { method, body: q, headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: AbortSignal.timeout(TIMEOUT) });
  const body = (await res.json().catch(() => ({}))) as T & GraphError;
  if (body.error?.code === 190 || res.status === 401) throw new RevokedError();
  if (!res.ok || body.error) throw new Error(`threads ${path} ${res.status} ${body.error?.code ?? ""} ${body.error?.message ?? ""}`.slice(0, 200));
  return body;
}

const quiet = <T>(p: Promise<T>) =>
  p.catch((err) => {
    if (err instanceof RevokedError) throw err;
    console.warn("[threads]", (err as Error).message);
    return null;
  });

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

const AGES = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

type Insights = { data?: { name?: string; total_value?: { value?: number; breakdowns?: { results?: { dimension_values?: string[]; value?: number }[] }[] }; values?: { value?: number }[] }[] };

async function demographics(token: string, breakdown: string): Promise<[string, number][]> {
  const body = await quiet(graph<Insights>(`/${VERSION}/me/threads_insights`, { metric: "follower_demographics", breakdown }, token));
  const results = body?.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
  return results
    .map((r) => [String(r.dimension_values?.[0] ?? "").trim(), Number(r.value) || 0] as [string, number])
    .filter(([label, v]) => label && v > 0);
}

const cityName = (v: string) => {
  const s = v.split(",")[0].trim();
  return s && s.length <= 40 && /\p{L}/u.test(s) ? s : null;
};

async function audience(token: string): Promise<Audience | null> {
  const [gender, ages, countries, cities] = await Promise.all(["gender", "age", "country", "city"].map((b) => demographics(token, b)));
  const sex = (k: string) => (/^f(emale)?$/i.test(k) ? "female" : /^m(ale)?$/i.test(k) ? "male" : "");
  const result: Audience = {
    gender: shares(gender.map(([k, v]) => [sex(k), v] as [string, number]).filter(([k]) => k), 2) as Audience["gender"],
    ages: shares(ages.filter(([k]) => AGES.includes(k)), AGES.length).sort((a, b) => AGES.indexOf(a.label) - AGES.indexOf(b.label)),
    countries: shares(countries.map(([k, v]) => [k.toUpperCase(), v] as [string, number]).filter(([k]) => /^[A-Z]{2}$/.test(k)), 5),
  };
  const c = shares(cities.map(([k, v]) => [cityName(k), v] as const).filter((r): r is [string, number] => !!r[0]), 5);
  if (c.length) result.cities = c;
  return result.gender.length || result.ages.length || result.countries.length ? result : null;
}

export const threads: Provider = {
  platform: "threads",
  configured: () => !!client(),

  authUrl(state, redirectUri) {
    const q = new URLSearchParams({ client_id: client()!.id, redirect_uri: redirectUri, response_type: "code", scope: SCOPES.join(","), state });
    return `${URLS.auth}?${q}`;
  },

  async exchange(code, redirectUri) {
    const c = client()!;
    const short = await graph<{ access_token?: string }>("/oauth/access_token", {
      client_id: c.id, client_secret: c.secret, grant_type: "authorization_code", redirect_uri: redirectUri, code: code.replace(/#_$/, ""),
    }, null, "POST").catch(() => null);
    if (!short?.access_token) return null;
    // Swap the 1-hour token for a 60-day one (the one we keep and renew daily).
    const long = await graph<{ access_token?: string }>("/access_token", { grant_type: "th_exchange_token", client_secret: c.secret }, short.access_token).catch(() => null);
    if (!long?.access_token) return null;
    return { accessToken: long.access_token, refreshToken: long.access_token, scopes: SCOPES.join(",") };
  },

  async refresh(longToken) {
    // Renews the 60-day token (allowed once it is a day old; until then the current one still works).
    const body = await quiet(graph<{ access_token?: string }>("/refresh_access_token", { grant_type: "th_refresh_token" }, longToken));
    return body?.access_token ? { accessToken: body.access_token, refreshToken: body.access_token } : { accessToken: longToken };
  },

  async profile(token): Promise<ProviderProfile | null> {
    const me = await graph<{ id?: string; username?: string; name?: string }>(`/${VERSION}/me`, { fields: "id,username,name" }, token);
    if (!me.id || !me.username) return null;
    const stats = await quiet(graph<Insights>(`/${VERSION}/me/threads_insights`, { metric: "followers_count" }, token));
    const followers = stats?.data?.[0]?.total_value?.value;
    return {
      externalId: me.id,
      name: me.name || me.username,
      handle: me.username,
      url: `https://www.threads.net/@${me.username}`,
      followers: typeof followers === "number" ? followers : null,
    };
  },

  audience,

  async monthlyViews(token) {
    // From the 3rd, the month before is complete. Views come per day: their sum is the month.
    const now = new Date();
    if (now.getUTCDate() < 3) return null;
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const body = await quiet(graph<Insights>(`/${VERSION}/me/threads_insights`, {
      metric: "views", since: String(start.getTime() / 1000), until: String(end.getTime() / 1000 - 1),
    }, token));
    const row = body?.data?.[0];
    if (!row) return null;
    const views = typeof row.total_value?.value === "number" ? row.total_value.value : (row.values ?? []).reduce((s, v) => s + (Number(v.value) || 0), 0);
    return { month: start, views: Math.round(views) };
  },

  // Threads has no token revoke endpoint: removing the app happens in the creator's Threads settings.
  async revoke() {},
};
