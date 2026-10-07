import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { LanguageSwitcherButton } from "./LanguageSwitcherButton";

export async function LanguageSwitcher({ locale }: { locale: Locale }) {
  const t = await getTranslations("LanguageSwitcher");
  const other: Locale = locale === "ar" ? "en" : "ar";

  return (
    <LanguageSwitcherButton
      target={other}
      text={t("switchTo")}
      ariaLabel={`${t("label")}: ${t("switchTo")}`}
    />
  );
}
