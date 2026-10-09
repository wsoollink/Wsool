"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CountUp } from "./CountUp";
import { Modal } from "./Modal";
import { glassCard } from "./styles";

type Share = { label: string; percent: number };
export type Audience = { gender?: Share[]; ages?: Share[]; countries?: Share[]; cities?: Share[]; updatedAt?: Date | string };

type Props = {
  name: string;
  followers: number;
  handle: string;
  verified: boolean;
  icon: ReactNode;
  audience: Audience | null;
  numbersClass: string;
};


/** Platform card; opens the audience pop-up when the creator added audience data. */
export function PlatformCard({ name, followers, handle, verified, icon, audience, numbersClass }: Props) {
  const t = useTranslations("CreatorPage");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const hasAudience = !!audience && (["gender", "ages", "countries", "cities"] as const).some((k) => audience[k]?.length);

  const body = (
    <>
      <span className="flex items-center justify-center gap-2 text-sm font-semibold">
        {icon}
        {name}
        {verified && (
          <span role="img" aria-label={t("verified")} className="inline-flex size-4 items-center justify-center rounded-full bg-[var(--page-accent)] text-[var(--page-on-accent)]">
            <Check size={10} />
          </span>
        )}
      </span>
      <CountUp value={followers} locale={locale} className={`${numbersClass} grad-num text-2xl font-black tabular-nums`} />
      <span dir="ltr" className="max-w-full truncate text-[13px] text-[var(--page-muted)]">@{handle}</span>
      {hasAudience && <span className="text-xs font-medium text-[var(--page-accent)]">{t("showAudience")}</span>}
    </>
  );

  const cls = `${glassCard} flex h-full w-full min-w-0 flex-col items-center gap-1.5 rounded-[16px] px-4 py-[18px] text-center`;
  if (!hasAudience) return <div className={cls}>{body}</div>;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={`${cls} transition-transform active:scale-[0.98]`}>
        {body}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("audienceOf", { platform: name })} closeLabel={t("close")} variant="panel">
        <AudiencePanel name={name} icon={icon} followers={followers} audience={audience!} numbersClass={numbersClass} />
      </Modal>
    </>
  );
}

/** White check for the small verified circle. */
export function Check({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

const flag = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

function AudiencePanel({ name, icon, followers, audience, numbersClass }: { name: string; icon: ReactNode; followers: number; audience: Audience; numbersClass: string }) {
  const t = useTranslations("CreatorPage");
  const locale = useLocale();
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  const number = new Intl.NumberFormat(locale);
  const updated = audience.updatedAt ? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(audience.updatedAt)) : null;
  const pct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  const male = audience.gender?.find((s) => s.label === "male")?.percent ?? 0;
  const female = audience.gender?.find((s) => s.label === "female")?.percent ?? 0;

  const groups: { key: "ages" | "countries" | "cities"; title: string; label: (s: string) => string }[] = [
    { key: "ages", title: t("ages"), label: (s) => s },
    { key: "countries", title: t("countries"), label: (s) => (/^[A-Z]{2}$/.test(s) ? `${flag(s)} ${regions.of(s) ?? s}` : s) },
    { key: "cities", title: t("cities"), label: (s) => s },
  ];

  return (
    <div className="flex max-h-[calc(100dvh-110px)] w-full max-w-[420px] flex-col gap-5 overflow-y-auto rounded-[22px] border border-[var(--page-line)] bg-[var(--page-panel)] px-5 py-[22px] shadow-[0_24px_60px_rgba(10,12,16,0.25)] backdrop-blur-[24px]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {icon}
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[17px] font-bold">{t("audienceOf", { platform: name })}</h2>
            {updated && <span className="text-xs text-[var(--page-muted)]">{t("lastUpdate", { date: updated })}</span>}
          </div>
        </div>
        <span dir="ltr" className={`${numbersClass} text-xl font-black`}>{number.format(followers)}</span>
      </div>

      {(male > 0 || female > 0) && (
        <section className="flex flex-col gap-2.5">
          <h3 className="text-[13px] font-medium text-[var(--page-muted)]">{t("gender")}</h3>
          <div className="flex h-3 overflow-hidden rounded-full bg-[var(--page-soft)]" aria-hidden="true">
            <div className="bg-[var(--page-accent)]" style={{ width: `${pct(male)}%` }} />
            <div className="bg-[#A78BFA]" style={{ width: `${pct(female)}%` }} />
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[var(--page-accent)]" />{t("male")} <b dir="ltr">{pct(male)}%</b></span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#A78BFA]" />{t("female")} <b dir="ltr">{pct(female)}%</b></span>
          </div>
        </section>
      )}

      {groups.map(({ key, title, label }) => {
        const list = audience[key];
        if (!list?.length) return null;
        return (
          <section key={key} className="flex flex-col gap-2.5">
            <h3 className="text-[13px] font-medium text-[var(--page-muted)]">{title}</h3>
            <ul className="flex flex-col gap-2.5">
              {list.map((share) => (
                <li key={share.label} className="grid grid-cols-[128px_1fr_40px] items-center gap-2.5 text-[13px]">
                  <span className="truncate">{label(share.label)}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-[var(--page-soft)]" aria-hidden="true">
                    <span className="block h-full rounded-full bg-[var(--page-accent)]" style={{ width: `${pct(share.percent)}%` }} />
                  </span>
                  <span dir="ltr" className="text-end tabular-nums text-[var(--page-muted)] rtl:text-start">{pct(share.percent)}%</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="text-center text-xs text-[var(--page-muted)]">{t("audienceNote")}</p>
    </div>
  );
}
