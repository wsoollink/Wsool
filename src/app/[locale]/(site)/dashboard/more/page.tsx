import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogOut } from "lucide-react";
import { SectionIcon } from "@/components/dashboard/SectionIcon";
import { SubmitButton } from "@/components/SubmitButton";
import { Card } from "@/components/ui/Card";
import { MORE_SECTIONS } from "@/config/dashboard";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { signOut } from "../../login/actions";
import { PageHeader } from "@/components/dashboard/PageHeader";

async function Guard() {
  await requireCreator();
  return null;
}

// Mobile "More" tab: the sections that don't fit in the tab bar, and sign out.
export default async function MorePage({ params }: PageProps<"/[locale]/dashboard/more">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("DashboardNav");

  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={null}>
        <Guard />
      </Suspense>
      <PageHeader title={t("more")} section="more" />
      <Card className="p-2">
        <ul className="flex flex-col">
          {MORE_SECTIONS.map((s) => (
            <li key={s.key}>
              <Link href={s.href} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-navy/5">
                <SectionIcon section={s.key} className="text-blue" />
                {t(s.key)}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <form action={signOut}>
        <SubmitButton variant="secondary" className="w-full" pendingText={t("signingOut")}>
          <LogOut aria-hidden="true" size={18} />
          {t("signOut")}
        </SubmitButton>
      </form>
    </div>
  );
}
