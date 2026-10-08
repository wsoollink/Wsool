"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "./Modal";

type Share = { label: string; percent: number };
export type Audience = { gender?: Share[]; ages?: Share[]; countries?: Share[]; cities?: Share[] };

type Props = {
  title: string;
  followers: string;
  subtitle: string;
  verified: boolean;
  icon: ReactNode;
  audience: Audience | null;
  numbersClass: string;
};

const card = "rounded-[20px] border border-[var(--page-line)] bg-[var(--page-surface)] [.glass_&]:backdrop-blur-md";

/** Platform card; opens the audience pop-up when the creator added audience data. */
export function PlatformCard({ title, followers, subtitle, verified, icon, audience, numbersClass }: Props) {
  const t = useTranslations("CreatorPage");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const hasAudience = !!audience && Object.values(audience).some((list) => list && list.length > 0);
  const Chevron = locale.startsWith("ar") ? ChevronLeft : ChevronRight;

  const body = (
    <>
      <span className="flex items-center justify-between">
        {icon}
        {verified && <BadgeCheck aria-label={t("verified")} size={18} className="fill-[var(--page-accent)] text-[var(--page-on-accent)]" />}
      </span>
      <span className={`${numbersClass} text-2xl font-bold`}>{followers}</span>
      <span className="truncate text-sm text-[var(--page-muted)]" dir="ltr">{subtitle}</span>
      {hasAudience && (
        <span className="flex items-center gap-1 text-xs font-medium text-[var(--page-accent)]">
          {t("audience")} <Chevron aria-hidden="true" size={14} />
        </span>
      )}
    </>
  );

  if (!hasAudience) return <div className={`${card} flex h-full flex-col gap-2 p-4`}>{body}</div>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={`${card} flex h-full w-full flex-col gap-2 p-4 text-start transition-transform active:scale-[0.98]`}
      >
        {body}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`${t("audience")} · ${title}`} closeLabel={t("close")}>
        <AudienceDetails audience={audience!} />
      </Modal>
    </>
  );
}

function AudienceDetails({ audience }: { audience: Audience }) {
  const t = useTranslations("CreatorPage");
  const locale = useLocale();
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });

  const groups: { key: keyof Audience; title: string; label: (s: string) => string }[] = [
    { key: "gender", title: t("gender"), label: (s) => (s === "female" ? t("female") : s === "male" ? t("male") : s) },
    { key: "ages", title: t("ages"), label: (s) => s },
    { key: "countries", title: t("countries"), label: (s) => (/^[A-Z]{2}$/.test(s) ? (regions.of(s) ?? s) : s) },
    { key: "cities", title: t("cities"), label: (s) => s },
  ];

  return (
    <div className="flex flex-col gap-5">
      {groups.map(({ key, title, label }) => {
        const list = audience[key];
        if (!list?.length) return null;
        return (
          <section key={key} className="flex flex-col gap-2">
            <h3 className="text-sm font-bold">{title}</h3>
            <ul className="flex flex-col gap-2">
              {list.map((share) => (
                <li key={share.label} className="flex flex-col gap-1 text-sm">
                  <span className="flex justify-between">
                    <span>{label(share.label)}</span>
                    <span className="font-medium">{percent.format(share.percent / 100)}</span>
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-[var(--page-surface)]" aria-hidden="true">
                    <span className="block h-full rounded-full bg-[var(--page-accent)]" style={{ width: `${Math.min(100, share.percent)}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
