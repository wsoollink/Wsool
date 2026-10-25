import "server-only";
import { RevokedError } from "./errors";
import type { Audience, Provider, ProviderProfile } from "./types";

/**
 * YouTube through Google sign-in (owner, Oct 2026): the creator picks their channel on Google's screen, then
 * we read the channel (subscribers) with the YouTube Data API and the audience (gender, age, top countries,
 * last 90 days) with the YouTube Analytics API. Read-only scopes. Credentials: GOOGLE_OAUTH_CLIENT_ID /
 * GOOGLE_OAUTH_CLIENT_SECRET (a Google Cloud "Web application" client; redirect URI
 * https://wsool.link/api/connect/youtube/callback). Local tests point GOOGLE_API_FAKE at a fake server.
 */
const fake = process.env.GOOGLE_API_FAKE?.replace(/\/$/, "");
const URLS = {
  auth: fake ? `${fake}/o/oauth2/v2/auth` : "https://accounts.google.com/o/oauth2/v2/auth",
  token: fake ? `${fake}/token` : "https://oauth2.googleapis.com/token",
  revoke: fake ? `${fake}/revoke` : "https://oauth2.googleapis.com/revoke",
  data: fake ? `${fake}/youtube/v3` : "https://www.googleapis.com/youtube/v3",
  analytics: fake ? `${fake}/v2` : "https://youtubeanalytics.googleapis.com/v2",
};
const SCOPES = ["https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/yt-analytics.readonly"];
const TIMEOUT = 10_000;

const client = () => {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID, secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
};

async function getJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT) });
  if (res.status === 401) throw new RevokedError();
  if (!res.ok) throw new Error(`youtube ${res.status}`);
  return (await res.json()) as T;
}

/** Whole percents (rounded down so a group never passes 100), biggest first, zeros dropped. */
function shares<L extends string>(parts: [L, number][], total: number, max: number) {
  if (total <= 0) return [];
  return parts
    .map(([label, value]) => ({ label, percent: Math.floor((value / total) * 100) }))
    .filter((s) => s.percent > 0)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, max);
}

const AGE: Record<string, string> = { "age13-17": "13-17", "age18-24": "18-24", "age25-34": "25-34", "age35-44": "35-44" };

async function audience(token: string): Promise<Audience | null> {
  const day = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
  // Analytics data arrives with a delay of a day or two: the last 90 days up to 2 days ago.
  const range = `ids=channel%3D%3DMINE&startDate=${day(91)}&endDate=${day(2)}`;
  type Report = { rows?: (string | number)[][] };
  const [demo, byCountry, total] = await Promise.all([
    getJson<Report>(`${URLS.analytics}/reports?${range}&metrics=viewerPercentage&dimensions=ageGroup,gender`, token),
    getJson<Report>(`${URLS.analytics}/reports?${range}&metrics=views&dimensions=country&sort=-views&maxResults=5`, token),
    getJson<Report>(`${URLS.analytics}/reports?${range}&metrics=views`, token),
  ]);
  const gender: Record<string, number> = {}, ages: Record<string, number> = {};
  for (const [age, g, pct] of demo.rows ?? []) {
    const p = Number(pct) || 0;
    if (g === "female" || g === "male") gender[g] = (gender[g] ?? 0) + p;
    const group = AGE[String(age)] ?? "45+";
    ages[group] = (ages[group] ?? 0) + p;
  }
  const views = Number(total.rows?.[0]?.[0]) || 0;
  const result: Audience = {
    gender: shares(Object.entries(gender) as ["female" | "male", number][], 100, 2),
    ages: shares(Object.entries(ages), 100, 5),
    countries: shares((byCountry.rows ?? []).map(([c, v]) => [String(c).toUpperCase(), Number(v) || 0] as [string, number]), views, 5),
  };
  return result.gender.length || result.ages.length || result.countries.length ? result : null;
}

export const youtube: Provider = {
  platform: "youtube",
  configured: () => !!client(),

  authUrl(state, redirectUri) {
    const c = client()!;
    const q = new URLSearchParams({
      client_id: c.id, redirect_uri: redirectUri, response_type: "code", scope: SCOPES.join(" "), state,
      // A refresh token every time (it's only sent on consent), so the daily update keeps working.
      access_type: "offline", prompt: "consent select_account", include_granted_scopes: "true",
    });
    return `${URLS.auth}?${q}`;
  },

  async exchange(code, redirectUri) {
    const c = client()!;
    const res = await fetch(URLS.token, {
      method: "POST", signal: AbortSignal.timeout(TIMEOUT),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: c.id, client_secret: c.secret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    });
    const body = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; scope?: string };
    if (!res.ok || !body.access_token || !body.refresh_token) return null;
    return { accessToken: body.access_token, refreshToken: body.refresh_token, scopes: body.scope ?? "" };
  },

  async refresh(refreshToken) {
    const c = client()!;
    const res = await fetch(URLS.token, {
      method: "POST", signal: AbortSignal.timeout(TIMEOUT),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ refresh_token: refreshToken, client_id: c.id, client_secret: c.secret, grant_type: "refresh_token" }),
    });
    const body = (await res.json().catch(() => ({}))) as { access_token?: string; error?: string };
    if (body.error === "invalid_grant" || body.error === "unauthorized_client") throw new RevokedError();
    if (!res.ok || !body.access_token) throw new Error(`google token ${res.status}`);
    return { accessToken: body.access_token };
  },

  async profile(token): Promise<ProviderProfile | null> {
    type Channels = { items?: { id: string; snippet?: { title?: string; customUrl?: string }; statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean } }[] };
    const data = await getJson<Channels>(`${URLS.data}/channels?part=snippet,statistics&mine=true`, token);
    const ch = data.items?.[0];
    if (!ch) return null;
    const handle = (ch.snippet?.customUrl ?? "").replace(/^@/, "");
    const hidden = ch.statistics?.hiddenSubscriberCount;
    return {
      externalId: ch.id,
      name: ch.snippet?.title ?? null,
      handle: handle || null,
      url: handle ? `https://www.youtube.com/@${handle}` : `https://www.youtube.com/channel/${ch.id}`,
      followers: hidden ? null : Number(ch.statistics?.subscriberCount ?? 0),
    };
  },

  audience,

  async revoke(refreshToken) {
    await fetch(`${URLS.revoke}?token=${encodeURIComponent(refreshToken)}`, { method: "POST", signal: AbortSignal.timeout(TIMEOUT) }).catch(() => {});
  },
};
