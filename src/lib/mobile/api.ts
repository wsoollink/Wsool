import "server-only";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isLocale, type Locale } from "@/i18n/config";
import type { CurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Helpers for the mobile app API (/api/mobile/v1, docs/mobile-app-plan.md).
 * The app sends the Supabase access token as "Authorization: Bearer"; the user
 * id comes only from that verified token (CLAUDE.md section 12). No cookies
 * are used, so any origin may call it (CORS only matters for the web preview).
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type,Accept-Language",
  "Access-Control-Max-Age": "86400",
};

export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { ...CORS, "Cache-Control": "no-store" } });

export const apiError = (code: string, status = 400, extra: Record<string, unknown> = {}) => json({ error: code, ...extra }, status);

export const preflight = () => new NextResponse(null, { status: 204, headers: CORS });

/** Supabase client without cookies (sessions live in the app's secure storage). */
export function supabaseForApi() {
  const { url, key } = supabaseEnv();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

/** The user behind the Bearer token, verified with Supabase (signature + expiry). */
export async function bearerUser(req: Request): Promise<CurrentUser | null> {
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || token.length > 4096) return null;
  try {
    const { data, error } = await supabaseForApi().auth.getClaims(token);
    const claims = data?.claims;
    if (error || !claims?.sub) return null;
    return { id: claims.sub, email: typeof claims.email === "string" ? claims.email.toLowerCase() : "" };
  } catch {
    // A malformed token makes the decoder throw: same as no token.
    return null;
  }
}

/** Response language: ?lang=, then Accept-Language, else Arabic. */
export function apiLang(req: Request): Locale {
  const q = new URL(req.url).searchParams.get("lang");
  if (q && isLocale(q)) return q;
  return /^en\b/i.test(req.headers.get("accept-language") ?? "") ? "en" : "ar";
}

/** JSON body checked with zod; null when missing or invalid. */
export async function readBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T> | null> {
  try {
    const parsed = schema.safeParse(await req.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

type Ctx = { user: CurrentUser; req: Request };

/**
 * Wraps a signed-in endpoint: 401 without a valid token, 403 for suspended
 * accounts, 500 (logged) on unexpected errors.
 */
export function authed(handler: (ctx: Ctx) => Promise<Response>) {
  return async (req: Request) => {
    try {
      const user = await bearerUser(req);
      if (!user) return apiError("unauthorized", 401);
      const row = await db.user.findUnique({ where: { id: user.id }, select: { suspendedAt: true } });
      if (row?.suspendedAt) return apiError("suspended", 403);
      return await handler({ user, req });
    } catch (err) {
      console.error("[mobile-api]", req.method, new URL(req.url).pathname, err);
      return apiError("server", 500);
    }
  };
}

/** Like authed, but also requires the creator's page (else 409 "no_page" → onboarding in the app). */
export function withPage(handler: (ctx: Ctx & { page: NonNullable<Awaited<ReturnType<typeof findPage>>> }) => Promise<Response>) {
  return authed(async (ctx) => {
    const page = await findPage(ctx.user.id);
    if (!page) return apiError("no_page", 409);
    return handler({ ...ctx, page });
  });
}

const findPage = (userId: string) => db.page.findUnique({ where: { userId } });

/** Wraps a public endpoint (sign-in): only error handling. */
export function open(handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (err) {
      console.error("[mobile-api]", req.method, new URL(req.url).pathname, err);
      return apiError("server", 500);
    }
  };
}
