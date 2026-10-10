"use client";

import { useTranslations } from "next-intl";
import { BadgeCheck, Mail } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { pageTheme, themeStyle } from "@/components/creator/theme";
import type { Platform, Template } from "@/generated/prisma/enums";
import type { Locale } from "@/i18n/config";
import { formatCompact } from "@/lib/format";
import type { AppearanceInput } from "@/lib/validation/appearance";

export type PreviewData = {
  name: string;
  specialty: string;
  photoUrl: string | null;
  followers: number;
  accounts: { platform: Platform; followers: number }[];
  lang: Locale;
};

const card = "rounded-[16px] border border-[var(--page-line)] bg-[var(--page-surface)] [.glass_&]:backdrop-blur-md";

/** Small live mock of the public page with the chosen look (not the real page). */
export function Preview({ value, data }: { value: AppearanceInput; data: PreviewData }) {
  const t = useTranslations("AppearancePage");
  const theme = pageTheme(value.template as Template, value.accent, value.customColors);
  const numbers = "font-numbers";
  const accounts = data.accounts.length ? data.accounts.slice(0, 2) : [{ platform: "tiktok" as const, followers: 125000 }, { platform: "instagram" as const, followers: 48000 }];
  const total = data.followers || accounts.reduce((s, a) => s + a.followers, 0);

  return (
    <figure className="flex flex-col gap-2">
      <div
        lang={data.lang} dir={data.lang === "ar" ? "rtl" : "ltr"} style={themeStyle(theme)}
        className={`overflow-hidden rounded-[24px] border border-line text-[var(--page-text)] shadow-card ${theme.glass ? "glass" : ""}`}
      >
        <div className="flex flex-col items-center gap-2 px-4 pt-6 pb-4 text-center">
          <div className={`size-20 overflow-hidden bg-[var(--page-surface)] ${value.photoShape === "circle" ? "rounded-full" : "rounded-[20px]"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- creator photo from storage */}
            {data.photoUrl && <img src={data.photoUrl} alt="" className="size-full object-cover" />}
          </div>
          <p className="flex items-center gap-1 text-lg font-bold">
            {data.name || t("sampleName")} <BadgeCheck aria-hidden="true" size={18} className="text-[var(--page-accent)]" />
          </p>
          <p className="text-sm font-medium text-[var(--page-accent)]">{data.specialty || t("sampleSpecialty")}</p>
          <p className={`${numbers} mt-1 text-4xl font-bold tabular-nums`}>{formatCompact(total, data.lang)}</p>
          <p className="text-xs text-[var(--page-muted)]">{t("followers")}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 px-4">
          {accounts.map((a, i) => (
            <div key={i} className={`${card} flex flex-col gap-1 p-3`}>
              <PlatformIcon platform={a.platform} size={18} />
              <span className={`${numbers} text-lg font-bold`}>{formatCompact(a.followers, data.lang)}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 p-4">
          <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[var(--page-accent)] text-sm font-semibold text-[var(--page-on-accent)]">
            <PlatformIcon platform="whatsapp" size={16} /> {t("whatsapp")}
          </span>
          <span className={`${card} inline-flex min-h-10 items-center justify-center gap-2 rounded-full text-sm font-semibold`}>
            <Mail aria-hidden="true" size={16} /> {t("email")}
          </span>
          {!value.hideBranding && <p className="pt-1 text-center text-xs text-[var(--page-muted)]">{t("footer")}</p>}
        </div>
      </div>
      <figcaption className="text-center text-xs text-muted">{t("previewCaption")}</figcaption>
    </figure>
  );
}
