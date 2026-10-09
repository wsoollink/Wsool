import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";
import { auditSentences } from "@/lib/audit-text";
import { db } from "@/lib/db";
import { AdminHeader } from "@/components/admin/AdminHeader";

/** Owner only: the latest admin actions as readable sentences, grouped by day. The log is append-only. */
async function Log({ lang }: { lang: Locale }) {
  await requireAdmin("owner");
  const t = await getTranslations("Admin.audit");
  const entries = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  if (entries.length === 0) return <Card><p className="text-sm text-muted">{t("empty")}</p></Card>;
  const sentences = await auditSentences(entries);
  const dayFmt = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "full" });
  const time = new Intl.DateTimeFormat(toIntlLocale(lang), { timeStyle: "short" });
  const days: { label: string; items: { e: (typeof entries)[number]; text: string }[] }[] = [];
  entries.forEach((e, i) => {
    const label = dayFmt.format(e.createdAt);
    if (days.at(-1)?.label !== label) days.push({ label, items: [] });
    days.at(-1)!.items.push({ e, text: sentences[i] });
  });

  return (
    <div className="flex flex-col gap-4">
      {days.map((d) => (
        <section key={d.label} className="flex flex-col gap-2">
          <h2 className="text-[13px] font-bold text-muted">{d.label}</h2>
          <Card className="p-2">
            <ul className="flex flex-col divide-y divide-navy/6">
              {d.items.map(({ e, text }) => (
                <li key={e.id} className="flex items-start gap-3 px-2 py-3">
                  <span aria-hidden="true" className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-navy/5 text-xs font-bold uppercase">{e.actorEmail[0]}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium">{text}</span>
                    <span className="text-xs text-muted"><bdi dir="ltr">{e.actorEmail}</bdi></span>
                  </span>
                  <time dateTime={e.createdAt.toISOString()} className="shrink-0 text-xs text-muted">{time.format(e.createdAt)}</time>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
      {entries.length === 200 && <p className="text-xs text-muted">{t("latest200")}</p>}
    </div>
  );
}

export default async function AuditPage({ params }: PageProps<"/[locale]/admin/audit">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  return (
    <div className="flex flex-col gap-4">
      <AdminHeader title={nav("audit")} subtitle={(await getTranslations("Admin.sub"))("audit")} search={false} />
      <Suspense fallback={null}><Log lang={locale} /></Suspense>
    </div>
  );
}
