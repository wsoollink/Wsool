import { audit, can, getAdmin } from "@/lib/admin";
import { csvResponse } from "@/lib/csv";
import { db } from "@/lib/db";
import { syncLists } from "@/lib/newsletter";
import { audienceWhere } from "@/lib/newsletter-campaign";

/** CSV of one newsletter list, ?list=creators|agencies (staff with users.view). Each export is in the audit log. */
export async function GET(req: Request) {
  const admin = await getAdmin();
  if (!admin || !can(admin, "users.view")) return new Response("Not found", { status: 404 });
  const list = new URL(req.url).searchParams.get("list") === "agencies" ? "agencies" : "creators";
  await syncLists();
  const rows = await db.newsletterSubscriber.findMany({
    where: audienceWhere(list),
    orderBy: { confirmedAt: "asc" },
    select: { email: true, lang: true, source: true, confirmedAt: true },
  });
  await audit(admin, "newsletter.export", undefined, { count: rows.length, list });
  return csvResponse(`newsletter-${list}`, "email,lang,source,confirmed_at", rows.map((r) => [r.email, r.lang, r.source, r.confirmedAt?.toISOString() ?? ""]));
}
