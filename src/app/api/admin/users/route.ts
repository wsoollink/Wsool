import type { NextRequest } from "next/server";
import { audit, can, getAdmin } from "@/lib/admin";
import { listCategories } from "@/lib/categories";
import { creatorRows, matchesFilters, readFilters, type CreatorRow } from "@/lib/creator-insights";
import { csvResponse } from "@/lib/csv";

const PLAN_FILTER: Record<string, CreatorRow["plan"]> = { paid: "pro", trial: "trial", free: "free" };

/**
 * CSV of creators with the same filters as the Users page (?q= ?f= and the
 * insight filters). Staff with users.view; every export is in the audit log.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin || !can(admin, "users.view")) return new Response("Not found", { status: 404 });
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const q = String(sp.q ?? "").trim().toLowerCase().replace(/^@|^\//, "").slice(0, 100);
  const plan = PLAN_FILTER[sp.f ?? ""];
  const filters = readFilters(sp);

  const [rows, categories] = await Promise.all([creatorRows(), listCategories()]);
  const catName = new Map(categories.map((c) => [c.id, c.nameAr]));
  const country = new Intl.DisplayNames(["ar"], { type: "region" });
  const shown = rows.filter(
    (r) =>
      matchesFilters(r, filters) &&
      (!plan || r.plan === plan) &&
      (!q || r.email.toLowerCase().includes(q) || r.username?.includes(q) || r.name.toLowerCase().includes(q)),
  );

  await audit(admin, "creators.export", undefined, { count: shown.length });
  return csvResponse(
    "creators",
    "username,name,email,categories,specialty,country_code,country,city,platforms,followers,size,verified_accounts,plan,page_status,views_30d,joined",
    shown.map((r) => [
      r.username ?? "", r.name, r.email,
      r.categories.map((id) => catName.get(id)).filter(Boolean).join(" | "),
      r.specialty, r.countryCode ?? "", r.countryCode ? country.of(r.countryCode) ?? r.country : r.country,
      r.city_?.ar ?? r.city, r.platforms.join(" | "), String(r.followers), r.size, String(r.verified),
      r.plan, r.status, String(r.views30), r.createdAt.toISOString().slice(0, 10),
    ]),
  );
}
