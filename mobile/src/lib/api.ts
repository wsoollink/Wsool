import { API_URL } from "./config";
import { storage } from "./storage";

/**
 * Talks to the website's app API (/api/mobile/v1). The session (Supabase
 * tokens) is kept in secure storage and refreshed shortly before it expires;
 * a refused refresh signs the app out.
 */
export type Session = { accessToken: string; refreshToken: string; expiresAt: number; user: { id: string; email: string } };

const KEY = "wsool.session";
let session: Session | null = null;
let refreshing: Promise<Session | null> | null = null;
const listeners = new Set<(s: Session | null) => void>();
let lang = "ar";

export class ApiError extends Error {
  constructor(public code: string, public status: number, public data: Record<string, unknown> = {}) {
    super(code);
  }
}

export const setApiLang = (l: string) => { lang = l; };
export const onSessionChange = (fn: (s: Session | null) => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

export async function loadSession() {
  try {
    const raw = await storage.get(KEY);
    session = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    session = null;
  }
  return session;
}

export async function setSession(s: Session | null) {
  if (s?.user.id !== session?.user.id) memory.clear(); // signed out or another account: forget its screens
  session = s;
  if (s) await storage.set(KEY, JSON.stringify(s));
  else await storage.remove(KEY);
  listeners.forEach((fn) => fn(s));
}

async function request(path: string, init: RequestInit & { token?: string } = {}) {
  const res = await fetch(`${API_URL}/api/mobile/v1${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Accept-Language": lang,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      ...init.headers,
    },
  });
  let data: Record<string, unknown> = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new ApiError(String(data.error ?? "network"), res.status, data);
  return data;
}

async function refresh(): Promise<Session | null> {
  if (!session) return null;
  refreshing ??= (async () => {
    try {
      const next = (await request("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: session!.refreshToken }) })) as unknown as Session;
      await setSession(next);
      return next;
    } catch (err) {
      // Only a refused token signs out; a network error keeps the session for later.
      if (err instanceof ApiError && err.status === 401) await setSession(null);
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/**
 * The last answer of every GET, kept in memory so a screen opens at once with what it showed
 * before and refreshes in the background (useCached). Any write (POST) clears it, so a screen
 * never opens with data from before a save.
 */
const memory = new Map<string, unknown>();
export const peek = <T>(path: string) => memory.get(path) as T | undefined;

/** Signed-in call: adds the token, refreshes it when needed (and once after a 401). */
export async function api<T = Record<string, unknown>>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!session) throw new ApiError("unauthorized", 401);
  if (session.expiresAt * 1000 - Date.now() < 60_000) await refresh();
  const init = { method: opts.method ?? "GET", body: opts.body === undefined ? undefined : JSON.stringify(opts.body) };
  const send = async () => {
    const data = (await request(path, { ...init, token: session?.accessToken })) as T;
    if (init.method === "GET") memory.set(path, data);
    else memory.clear();
    return data;
  };
  try {
    return await send();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && (await refresh())) return await send();
    throw err;
  }
}

/** Calls that don't need a session (sign-in). */
export const publicApi = <T = Record<string, unknown>>(path: string, body: unknown) =>
  request(path, { method: "POST", body: JSON.stringify(body) }) as Promise<T>;

/**
 * Calls one of the website's dashboard actions (same validation and rules as
 * the website) through /api/mobile/v1/rpc/<name>, and returns its result.
 */
export async function rpc<T = Record<string, unknown>>(name: string, ...args: unknown[]): Promise<T> {
  const res = await api<{ result: T }>(`/rpc/${name}`, { method: "POST", body: { args } });
  return res.result;
}
