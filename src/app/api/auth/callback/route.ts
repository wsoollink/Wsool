import { NextResponse, type NextRequest } from "next/server";
import { ensureAccount } from "@/lib/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Google sign-in comes back here (through Supabase) with a one-time code.
 * Swap it for a session cookie, create the account on first sign-in (same
 * 14-day trial as email sign-up), then continue to the dashboard, which sends
 * new creators to onboarding. Any failure goes back to /login with a message.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const back = (path: string) => NextResponse.redirect(new URL(path, request.nextUrl.origin));
  if (!code) return back("/login?error=google");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) return back("/login?error=google");

  await ensureAccount({ id: data.user.id, email: data.user.email.toLowerCase() });
  return back("/dashboard");
}
