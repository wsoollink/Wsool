import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

/** Owner only: the latest admin actions (who, what, when). The log is append-only. */
async function Log({ lang }: { lang: Locale }) {
  await requireAdmin("owner");
  const t = await getTranslations("Admin.audit");
  const u = await getTranslations("Admin.users");
  const entries = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium", timeStyle: "short" });
  if (entries.length === 0) return <Card><p className="text-sm text-muted">{t("empty")}</p></Card>;
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="text-xs text-muted">
          <tr className="border-b border-line">
            {["when", "who", "what", "details"].map((h) => <th key={h} scope="col" className="p-3 text-start font-medium">{t(h)}</th>)}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-line align-top last:border-0">
              <td className="p-3 whitespace-nowrap">{date.format(e.createdAt)}</td>
              <td className="p-3" dir="ltr">{e.actorEmail}</td>
              <td className="p-3 font-medium">{u.has(`log.${e.action}`) ? u(`log.${e.action}`) : e.action}</td>
              <td className="p-3"><code dir="ltr" className="block max-w-md text-xs break-all text-muted">{e.details ? JSON.stringify(e.details) : "—"}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default async function AuditPage({ params }: PageProps<"/[locale]/admin/audit">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{nav("audit")}</h1>
      <Suspense fallback={null}><Log lang={locale} /></Suspense>
    </div>
  );
}
