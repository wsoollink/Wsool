import { audit, can, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

/** Commas, quotes or line breaks → quoted; a leading = + - @ is neutralised (spreadsheet formulas). */
function cell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

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
  const lines = ["email,lang,source,confirmed_at", ...rows.map((r) => [r.email, r.lang, r.source, r.confirmedAt?.toISOString() ?? ""].map(cell).join(","))];
  const day = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="wsool-newsletter-${day}.csv"`,
      "cache-control": "no-store",
    },
  });
}
