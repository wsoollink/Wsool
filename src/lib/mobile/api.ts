import "server-only";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isLocale, type Locale } from "@/i18n/config";
import type { CurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { supabaseEnv } from "@/lib/supabase/env";
import { bearerUserFromHeader } from "./bearer";

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
export const bearerUser = (req: Request) => bearerUserFromHeader(req.headers.get("authorization"));

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
  return guarded(false, handler);
}

/** Like authed, but also requires the creator's page (else 409 "no_page" → onboarding in the app). */
export function withPage(handler: (ctx: Ctx & { page: Page }) => Promise<Response>) {
  return guarded(true, (ctx) => (ctx.page ? handler({ ...ctx, page: ctx.page }) : Promise.resolve(apiError("no_page", 409))));
}

type Page = NonNullable<Awaited<ReturnType<typeof db.page.findUnique>>>;

// The suspension check and the page come back in one query (one round trip to the database).
function guarded(withPageRow: boolean, handler: (ctx: Ctx & { page: Page | null }) => Promise<Response>) {
  return async (req: Request) => {
    try {
      const user = await bearerUser(req);
      if (!user) return apiError("unauthorized", 401);
      const row = await db.user.findUnique({ where: { id: user.id }, select: { suspendedAt: true, ...(withPageRow ? { page: true } : {}) } });
      if (row?.suspendedAt) return apiError("suspended", 403);
      const page = withPageRow ? ((row as { page?: Page | null } | null)?.page ?? null) : null;
      return await handler({ user, req, page });
    } catch (err) {
      console.error("[mobile-api]", req.method, new URL(req.url).pathname, err);
      return apiError("server", 500);
    }
  };
}

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
