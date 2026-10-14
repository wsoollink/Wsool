import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";

/** Blue strip for Free creators: this section shows on the page with Pro only (+ link to Subscription). */
export async function ProNotice({ text }: { text: string }) {
  const t = await getTranslations("Home");
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card border border-blue/20 bg-blue/5 px-4 py-3 text-[13.5px] text-blue">
      <Sparkles aria-hidden="true" size={16} className="shrink-0" />
      <span className="min-w-0 flex-1">{text}</span>
      <Link href="/dashboard/subscription" className="inline-flex min-h-11 items-center font-bold underline-offset-4 hover:underline md:min-h-0">{t("upgrade")}</Link>
    </div>
  );
}
