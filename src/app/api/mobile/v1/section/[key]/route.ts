import { apiError, json, preflight, withPage } from "@/lib/mobile/api";
import { isSection, loadSection } from "@/lib/mobile/sections";

/** A dashboard section's current data for its editor in the app (edit, accounts, work, rates, links, contact, appearance, verification, analytics, referrals, subscription). */
export const GET = withPage(async ({ req, page }) => {
  const url = new URL(req.url);
  const key = url.pathname.split("/").pop() ?? "";
  if (!isSection(key)) return apiError("unknown_section", 404);
  return json(await loadSection(key, page, url.searchParams));
});
export const OPTIONS = preflight;
