import { normalizeUsername } from "@/config/usernames";
import { authed, json, preflight } from "@/lib/mobile/api";
import { usernameError } from "@/lib/username";

/** Live availability check while the creator types a username (?name=). */
export const GET = authed(async ({ user, req }) => {
  const name = normalizeUsername((new URL(req.url).searchParams.get("name") ?? "").slice(0, 40));
  return json({ name, error: await usernameError(name, user.id) });
});
export const OPTIONS = preflight;
