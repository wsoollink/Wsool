import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { bearerUserFromHeader } from "@/lib/mobile/bearer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string };

/**
 * The signed-in user, verified on the server from the Supabase session.
 * This is the ONLY source of a user id for queries: never trust an id sent
 * by the browser (CLAUDE.md section 12).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Mobile app API calls carry the token in "Authorization: Bearer" (no cookies); the same
  // server actions then work for the app (src/app/api/mobile/v1/rpc). Browsers can't send
  // this header cross-site without CORS approval, so it adds no CSRF risk.
  const auth = (await headers()).get("authorization");
  if (auth?.startsWith("Bearer ")) return bearerUserFromHeader(auth);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
});

/** Like getCurrentUser, but sends signed-out visitors to the login page. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
