import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Panel } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { CreateAgency, StopAgency } from "./AgencyAdmin";

/** Agencies (owner only, free beta): open one with its owner's email, see its size, stop it. */
async function Agencies({ lang }: { lang: Locale }) {
  await requireAdmin("owner");
  const t = await getTranslations("Admin.agencies");
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium" });
  const rows = await db.agency.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      members: { select: { email: true, role: true, userId: true } },
      _count: { select: { links: { where: { status: "active" } } } },
    },
  });
  return (
    <div className="flex flex-col gap-4">
      <Panel title={t("createTitle")}><CreateAgency /></Panel>
      <Panel title={t("listTitle")} flush>
        {rows.length === 0 ? <p className="p-5 text-sm text-muted">{t("empty")}</p> : (
          <ul className="divide-y divide-line-soft">
            {rows.map((a) => {
              const owner = a.members.find((m) => m.role === "owner");
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{a.name}</p>
                    <p className="text-xs text-muted"><bdi dir="ltr">{owner?.email ?? "—"}</bdi> · {date.format(a.createdAt)}</p>
                  </div>
                  <span className="text-sm text-muted">{t("counts", { creators: formatNumber(a._count.links, lang), team: formatNumber(a.members.length, lang) })}</span>
                  <Pill tone={a.status === "active" ? "good" : "grey"}>{t(`status.${a.status}`)}</Pill>
                  {a.status === "active" && <StopAgency id={a.id} name={a.name} />}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

export default async function AgenciesAdminPage({ params }: PageProps<"/[locale]/admin/agencies">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  return (
    <div className="flex flex-col gap-4">
      <AdminHeader title={nav("agencies")} subtitle={(await getTranslations("Admin.sub"))("agencies")} />
      <Suspense fallback={null}><Agencies lang={locale} /></Suspense>
    </div>
  );
}
