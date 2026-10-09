import { audit, can, getAdmin } from "@/lib/admin";
import { csvResponse } from "@/lib/csv";
import { db } from "@/lib/db";

/** CSV of confirmed newsletter subscribers (staff with users.view). Each export is in the audit log. */
export async function GET() {
  const admin = await getAdmin();
  if (!admin || !can(admin, "users.view")) return new Response("Not found", { status: 404 });
  const rows = await db.newsletterSubscriber.findMany({
    where: { status: "confirmed" },
    orderBy: { confirmedAt: "asc" },
    select: { email: true, lang: true, source: true, confirmedAt: true },
  });
  await audit(admin, "newsletter.export", undefined, { count: rows.length });
  return csvResponse("newsletter", "email,lang,source,confirmed_at", rows.map((r) => [r.email, r.lang, r.source, r.confirmedAt?.toISOString() ?? ""]));
}
