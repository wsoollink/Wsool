import { json, preflight, withPage } from "@/lib/mobile/api";
import { homeData } from "@/lib/mobile/home";

/** Dashboard home (link, plan, 30-day stats, completion, verification). */
export const GET = withPage(async ({ user, page }) => json(await homeData(user.id, page)));
export const OPTIONS = preflight;
