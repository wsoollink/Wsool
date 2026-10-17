import "server-only";
import type { Session } from "@supabase/supabase-js";

/** What the app stores in its secure storage after signing in or refreshing. */
export const sessionPayload = (s: Session) => ({
  accessToken: s.access_token,
  refreshToken: s.refresh_token,
  expiresAt: s.expires_at ?? Math.floor(Date.now() / 1000) + (s.expires_in ?? 3600),
  user: { id: s.user.id, email: (s.user.email ?? "").toLowerCase() },
});
