"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

/** While managing a creator's page: a section the creator keeps to themself was opened (requireCreator → ?denied=1). */
export function DeniedNotice() {
  const t = useTranslations("Acting");
  if (useSearchParams().get("denied") !== "1") return null;
  return <p role="alert" className="w-full text-sm font-semibold text-warn">{t("denied")}</p>;
}
