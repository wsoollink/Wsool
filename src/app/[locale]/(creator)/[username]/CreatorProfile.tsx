import Image from "next/image";
import { ArrowUpRight, Link2, MapPin, Play, ShoppingBag } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { CountUp } from "@/components/creator/CountUp";
import { LicenseFile } from "@/components/creator/LicenseFile";
import { Marquee } from "@/components/creator/Marquee";
import { PageActions } from "@/components/creator/PageActions";
import { Check, PlatformCard, type Audience } from "@/components/creator/PlatformCard";
import { glassCard } from "@/components/creator/styles";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { Tracker } from "@/components/creator/Tracker";
import { WorkItem } from "@/components/creator/WorkItem";
import { pageTheme, themeStyle } from "@/components/creator/theme";
import { PLATFORM_NAMES } from "@/config/platforms";
import { toIntlLocale, type Locale } from "@/i18n/config";
import { siteOrigin } from "@/lib/site-url";
import { currencyLabel, formatAmount, formatPercent, formatPhone } from "@/lib/format";
import type { PublishedPage } from "@/lib/public-page";
import { linkKind, type LinkKind } from "@/lib/link-kind";
import { bundleComparison, rateName } from "@/lib/rates";

type Props = { page: PublishedPage; lang: Locale };
type T = Awaited<ReturnType<typeof getTranslations<"CreatorPage">>>;

/** Opaque box from the design (views, contact, logo tiles). */
const solidBox = "border border-[var(--page-line)] bg-[var(--page-solid)]";

function Section({ title, aside, children, className = "" }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-3.5 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-xl font-semibold md:text-[22px]">{title}</h2>
        {aside && <span className="text-[13px] text-[var(--page-muted)]">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Icon({ d, size = 16 }: { d: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
  );
}
const PIN = <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>;
const SHIELD = <><path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>;
const MAIL = <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>;

/**
 * Creator page from the owner's design ("وصول — صفحة الصانع"). Mobile order
 * follows CLAUDE.md section 5; on desktop the identity sits in a white card
 * on the start side (sticky) and the numbers, brands, work and rates in the
 * main column.
 */
export async function CreatorProfile({ page, lang }: Props) {
  const t = await getTranslations("CreatorPage");
  const locale = toIntlLocale(lang);
  const tr = page.translations.find((x) => x.lang === lang) ?? page.translations[0];
  const name = tr?.fullName || page.username;
  const verified = page.accounts.some((a) => a.verified);
  const totalFollowers = page.accounts.reduce((sum, a) => sum + a.followers, 0);
  const numbersFont = page.numberFont === "wide" ? "font-numbers" : "font-sans";
  const location = [tr?.city, tr?.country].filter(Boolean).join(lang === "ar" ? "، " : ", ");
  const tags = page.tags.filter((tag) => tag.lang === lang);
  const theme = pageTheme(page.template, page.accent, page.customColors);
  const pageUrl = `${siteOrigin()}/${page.username}`;
  const shortUrl = `${siteOrigin().replace(/^https?:\/\//, "")}/${page.username}`;
  const otherLang: Locale | null = page.enEnabled ? (lang === "ar" ? "en" : "ar") : null;
  const monthName = (iso: string) => new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(new Date(iso));
  const dayFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  const updates = page.accounts.map((a) => a.followersUpdatedAt).filter((d): d is string => !!d).sort();
  const lastUpdate = updates.length ? dayFormat.format(new Date(updates[updates.length - 1])) : null;
  const allVerified = page.accounts.length > 0 && page.accounts.every((a) => a.verified);
  const numbersNote = [allVerified ? t("numbersVerified") : null, lastUpdate ? t("lastUpdate", { date: lastUpdate }) : null].filter(Boolean).join(" · ");

  const contact = (desktop: boolean) => <Contact page={page} lang={lang} t={t} desktop={desktop} />;

  return (
    <div style={themeStyle(theme)} className={`flex flex-1 flex-col text-[var(--page-text)] ${theme.glass ? "glass" : ""}`}>
      <Tracker username={page.username} lang={lang} />

      {/* Desktop header bar */}
      <header className="hidden border-b border-[var(--page-line)] bg-[var(--page-solid)] md:block">
        <div className="mx-auto flex max-w-[1160px] items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" className="text-[22px] font-bold">{t("brand")}</Link>
          <div className="flex items-center gap-2.5">
            <span dir="ltr" className="text-sm text-[var(--page-muted)]">{shortUrl}</span>
            <PageActions otherLang={otherLang} url={pageUrl} title={name} variant="header" />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1160px] flex-1 flex-col md:flex-row md:items-start md:gap-7 md:px-6 md:pt-9">
        {/* Identity: hero, name, bio, location, licenses, total, icons, tags (+ contact on desktop) */}
        <aside className="flex flex-col pb-7 md:sticky md:top-6 md:w-[420px] md:shrink-0 md:overflow-hidden md:rounded-[20px] md:border md:border-[var(--page-line)] md:bg-[var(--page-solid)]">
          <div className="relative aspect-square w-full overflow-hidden">
            {page.photoUrl ? (
              <Image
                src={page.photoUrl} alt={name} fill priority unoptimized sizes="(min-width: 768px) 420px, 100vw"
                className="object-cover [mask-image:linear-gradient(to_bottom,#000_45%,transparent_100%)]"
              />
            ) : (
              <div className="brand-gradient size-full [mask-image:linear-gradient(to_bottom,#000_45%,transparent_100%)]" aria-hidden="true" />
            )}
            <div className="md:hidden">
              <PageActions otherLang={otherLang} url={pageUrl} title={name} variant="photo" />
            </div>
          </div>

          <div className="relative -mt-16 flex flex-col items-center gap-1.5 px-5 text-center">
            <h1 className="flex flex-wrap items-center justify-center gap-2 text-[30px] leading-tight font-bold">
              {name}
              {verified && (
                <span role="img" aria-label={t("verified")} className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--page-accent)] text-[var(--page-on-accent)]">
                  <Check size={14} />
                </span>
              )}
            </h1>
            {tr?.specialty && <p className="text-[17px] font-medium text-[var(--page-accent)]">{tr.specialty}</p>}
          </div>

          <div className="flex flex-col gap-4 px-5 pt-4 md:px-6">
            {tr?.bio && <p className="text-center leading-[1.75]">{tr.bio}</p>}
            {location && (
              <p className="flex items-center justify-center gap-1.5 text-sm text-[var(--page-muted)]">
                <Icon d={PIN} /> {location}
              </p>
            )}

            {page.licenses.length > 0 && (
              <ul className="flex flex-col items-center" aria-label={t("licenses")}>
                {page.licenses.map((license) => {
                  const licenseName = lang === "en" && license.nameEn ? license.nameEn : license.name;
                  return (
                    <li key={license.id} className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-[var(--page-muted)]">
                      <span className="text-[var(--page-text)]"><Icon d={SHIELD} /></span>
                      <span className="font-medium text-[var(--page-text)]">{licenseName}</span>
                      {license.verified && (
                        <span role="img" aria-label={t("licenseVerified")} className="inline-flex size-4 items-center justify-center rounded-full bg-[var(--page-accent)] text-[var(--page-on-accent)]">
                          <Check size={10} />
                        </span>
                      )}
                      {(license.number || license.fileUrl) && <span aria-hidden="true">·</span>}
                      {license.fileUrl ? (
                        <LicenseFile url={license.fileUrl} name={licenseName} number={license.number ?? ""} />
                      ) : (
                        license.number && <bdi dir="ltr" className="inline-flex min-h-11 items-center text-[var(--page-text)]">{license.number}</bdi>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex flex-col items-center gap-0.5 py-1 text-center">
              <p className="text-sm text-[var(--page-muted)]">{t("followersTotal")}</p>
              <CountUp value={totalFollowers} locale={locale} className={`${numbersFont} grad-num text-[44px] leading-[1.15] font-black tabular-nums`} />
            </div>

            {page.accounts.length > 0 && (
              <ul className="flex flex-wrap justify-center gap-2" aria-label={t("accountsOf", { name })}>
                {page.accounts.map((a) => (
                  <li key={a.id}>
                    <a
                      href={a.url} target="_blank" rel="noopener noreferrer" data-track={`social:${a.platform}`}
                      aria-label={`${PLATFORM_NAMES[a.platform]} @${a.handle}`}
                      className={`${solidBox} inline-flex size-11 items-center justify-center rounded-full`}
                    >
                      <PlatformIcon platform={a.platform} size={18} />
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {tags.length > 0 && (
              <ul className="grid grid-cols-3 gap-2">
                {tags.map((tag) => (
                  <li key={tag.id} className={`${glassCard} flex min-h-8 items-center justify-center truncate rounded-[12px] px-1 py-1.5 text-center text-[11.5px] leading-[1.35] font-medium whitespace-nowrap`}>
                    <span className="truncate">{tag.label}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="hidden border-t border-[var(--page-line)] pt-5 md:block">{contact(true)}</div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-8 px-5 md:gap-9 md:px-0">
          {(page.monthlyViews !== null || page.accounts.length > 0) && (
            <Section title={t("numbers")} aside={numbersNote || undefined}>
              {/* Owner decision: monthly views stay before the platform cards (CLAUDE.md section 5). */}
              {page.monthlyViews !== null && (
                <div className={`${solidBox} flex flex-col items-center gap-1 rounded-[18px] px-4 py-[22px] text-center`}>
                  <p className="text-sm text-[var(--page-muted)]">
                    {page.monthlyViewsMonth ? t("monthlyViewsOf", { month: monthName(page.monthlyViewsMonth) }) : t("monthlyViews")}
                  </p>
                  <CountUp value={page.monthlyViews} locale={locale} className={`${numbersFont} grad-num text-[40px] leading-[1.15] font-black tabular-nums md:text-5xl`} />
                </div>
              )}
              {page.accounts.length > 0 && (
                <ul className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fit,minmax(170px,1fr))] md:gap-3.5">
                  {page.accounts.map((a) => (
                    <li key={a.id} className="min-w-0">
                      <PlatformCard
                        name={PLATFORM_NAMES[a.platform]}
                        followers={a.followers}
                        handle={a.handle}
                        verified={a.verified}
                        icon={<PlatformIcon platform={a.platform} size={20} />}
                        audience={a.audience as Audience | null}
                        numbersClass={numbersFont}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {page.brandLogos.length > 0 && (
            <Section title={t("brands")}>
              <Marquee ariaLabel={t("brands")} seconds={Math.max(20, page.brandLogos.length * 4)}>
                {page.brandLogos.map((logo) => (
                  <li key={logo.id} className={`${solidBox} relative h-[72px] w-[120px] shrink-0 overflow-hidden rounded-[14px] md:h-[84px] md:w-[150px]`}>
                    <Image src={logo.logoUrl} alt={logo.name} fill unoptimized sizes="150px" className="object-contain px-5 py-[18px]" />
                  </li>
                ))}
              </Marquee>
            </Section>
          )}

          {page.portfolio.length > 0 && (
            <Section title={t("work")}>
              <Marquee ariaLabel={t("work")} seconds={Math.max(24, page.portfolio.length * 7)}>
                {page.portfolio.map((item) => {
                  const itemTr = item.translations.find((x) => x.lang === lang) ?? item.translations[0];
                  return (
                    <WorkItem
                      key={item.id}
                      brand={itemTr?.brand ?? ""}
                      type={itemTr?.type ?? ""}
                      videoUrl={item.videoUrl}
                      thumbUrl={item.thumbUrl}
                      platform={item.platform}
                    />
                  );
                })}
              </Marquee>
            </Section>
          )}

          <Rates page={page} lang={lang} t={t} numbersFont={numbersFont} />
          <Services page={page} lang={lang} t={t} numbersFont={numbersFont} />
          <Links page={page} lang={lang} t={t} />

          <div className="md:hidden">{contact(false)}</div>

          {page.showBranding && (
            <footer className="mt-auto flex justify-center pb-8">
              <Link href="/" className="inline-flex min-h-11 items-center text-[13px] text-[var(--page-muted)]">
                {t.rich("madeWith", { b: (c) => <b className="ms-1 font-bold text-[var(--page-text)]">{c}</b> })}
              </Link>
            </footer>
          )}
        </main>
      </div>
    </div>
  );
}

function Rates({ page, lang, t, numbersFont }: Props & { t: T; numbersFont: string }) {
  const settings = page.rateSettings;
  const withRates = page.accounts.filter((a) => a.rates.length > 0);
  if (!settings || (withRates.length === 0 && page.bundles.length === 0)) return null;

  if (!settings.showOnPage) {
    return (
      <Section title={t("rates")}>
        <p className={`${glassCard} rounded-[16px] p-5 text-center text-[var(--page-muted)]`}>{t("ratesOnRequest")}</p>
      </Section>
    );
  }

  const unit = <span className="text-xs text-[var(--page-muted)]">{currencyLabel(settings.currency, lang)}</span>;
  const price = (value: number, size: string) => (
    <span className="flex items-baseline gap-1.5">
      <span dir="ltr" className={`${numbersFont} grad-num font-black ${size}`}>{formatAmount(value, lang)}</span>
      {unit}
    </span>
  );

  return (
    <Section title={t("rates")} aside={settings.vatIncluded ? t("vatIncluded") : t("vatExcluded")}>
      {/* The bundle comes first, as in the design. */}
      {page.bundles.map((b) => {
        const platforms = b.accountIds.map((id) => page.accounts.find((a) => a.id === id)).filter((a) => !!a);
        const rows = b.rates.map((r) => ({ r, compare: bundleComparison(r, b.accountIds, page.accounts) }));
        const best = Math.max(0, ...rows.map((x) => x.compare?.savingsPercent ?? 0));
        return (
          <div key={b.id} className={`${glassCard} flex flex-col gap-3 rounded-[18px] border-2 !border-[var(--page-accent)] p-4`}>
            <div className="flex items-center justify-between gap-2.5">
              <h3 className="font-bold">{rateName({ name: b.name ?? "", nameEn: b.nameEn }, lang) || t("bundle")}</h3>
              {best > 0 && (
                <span className="inline-flex h-[26px] items-center rounded-full bg-[var(--page-soft)] px-2.5 text-xs font-bold text-[var(--page-accent)]">
                  {t("saveUpTo", { percent: formatPercent(best, lang) })}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--page-muted)]">
              <span>{t("bundleIncludes")}</span>
              {platforms.map((a) => (
                <span key={a.id} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[var(--page-soft)] px-2.5 text-[12.5px] font-medium text-[var(--page-text)]">
                  <PlatformIcon platform={a.platform} size={14} /> {PLATFORM_NAMES[a.platform]}
                </span>
              ))}
            </div>
            <ul className="flex flex-col">
              {rows.map(({ r, compare }) => (
                <li key={r.id} className="flex items-center justify-between gap-2.5 border-t border-[var(--page-line)] pt-2.5 pb-0.5 [&+li]:mt-2.5">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[14.5px] font-bold">{rateName(r, lang)}</span>
                    {compare && (
                      <span className="text-xs text-[var(--page-muted)]">
                        {t.rich("insteadOfSave", {
                          price: formatAmount(compare.separate, lang),
                          currency: currencyLabel(settings.currency, lang),
                          percent: formatPercent(compare.savingsPercent, lang),
                          s: (c) => <s dir="ltr">{c}</s>,
                        })}
                      </span>
                    )}
                  </span>
                  {price(r.price, "text-2xl")}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[repeat(auto-fill,minmax(230px,1fr))]">
        {withRates.map((a) => (
          <div key={a.id} className={`${glassCard} flex min-w-0 flex-col gap-2 rounded-[16px] px-4 py-3.5`}>
            <p className="flex items-center gap-2 text-sm font-bold">
              <PlatformIcon platform={a.platform} size={18} /> {PLATFORM_NAMES[a.platform]}
            </p>
            <ul className="flex flex-col gap-2">
              {a.rates.map((r) => (
                <li key={r.id} className="flex items-baseline justify-between gap-2.5 border-t border-[var(--page-line)] pt-2">
                  <span className="text-[13.5px] text-[var(--page-muted)]">{rateName(r, lang)}</span>
                  {price(r.price, "text-lg")}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

const LINK_ICONS: Record<LinkKind, typeof Link2> = { map: MapPin, store: ShoppingBag, video: Play, link: Link2 };

/** "My services": name, unit, description, price (or "on request") and a request button. */
function Services({ page, lang, t, numbersFont }: Props & { t: T; numbersFont: string }) {
  if (page.services.length === 0) return null;
  const currency = currencyLabel(page.rateSettings.currency, lang);
  const link = `${siteOrigin().replace(/^https?:\/\//, "")}/${page.username}`;
  const pick = (ar: string, en: string | null) => (lang === "en" && en ? en : ar);
  const request = (service: string) =>
    page.whatsapp
      ? `https://wa.me/${page.whatsapp}?text=${encodeURIComponent(t("serviceMessage", { service, link }))}`
      : page.contactEmail
        ? `mailto:${page.contactEmail}?subject=${encodeURIComponent(t("serviceSubject", { service }))}&body=${encodeURIComponent(t("serviceMessage", { service, link }))}`
        : null;
  return (
    <Section title={t("services")}>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {page.services.map((s) => {
          const name = pick(s.name, s.nameEn);
          const unit = pick(s.unit, s.unitEn);
          const description = pick(s.description, s.descriptionEn);
          const href = request(name);
          return (
            <li key={s.id} className={`${glassCard} flex min-w-0 flex-col gap-2.5 rounded-[18px] p-4`}>
              <h3 dir="auto" className="text-[16px] font-bold">{name}</h3>
              {description && <p dir="auto" className="text-[13.5px] leading-6 text-[var(--page-muted)]">{description}</p>}
              <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 border-t border-[var(--page-line)] pt-3">
                {s.price === null ? (
                  <span className="text-[14px] font-bold">{t("onRequest")}</span>
                ) : (
                  <span className="flex items-baseline gap-1.5">
                    <span dir="ltr" className={`${numbersFont} grad-num text-xl font-black`}>{formatAmount(s.price, lang)}</span>
                    <span className="text-xs text-[var(--page-muted)]">{currency}{unit && <> · <bdi>{unit}</bdi></>}</span>
                  </span>
                )}
                {href && (
                  <a
                    href={href} target="_blank" rel="noopener noreferrer" data-track={`service:${s.id}`}
                    className="inline-flex min-h-11 items-center rounded-full bg-[var(--page-accent)] px-4 text-[13.5px] font-bold text-[var(--page-on-accent)]"
                  >
                    {t("requestService")}
                  </a>
                )}
              </div>
              {s.price === null && unit && <span dir="auto" className="-mt-1 text-xs text-[var(--page-muted)]">{unit}</span>}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/** "My links": image (or an icon from the link) + title, opening in a new tab. */
function Links({ page, lang, t }: Props & { t: T }) {
  if (page.links.length === 0) return null;
  return (
    <Section title={t("links")}>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {page.links.map((l) => {
          const Kind = LINK_ICONS[linkKind(l.url)];
          const title = lang === "en" && l.titleEn ? l.titleEn : l.title;
          return (
            <li key={l.id}>
              <a
                href={l.url} target="_blank" rel="noopener noreferrer nofollow ugc" data-track={`link:${l.id}`}
                className={`${glassCard} flex min-h-[72px] items-center gap-3.5 rounded-[18px] p-3 transition-transform hover:-translate-y-0.5`}
              >
                <span className="relative inline-flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[var(--page-soft)] text-[var(--page-accent)]">
                  {l.imageUrl ? <Image src={l.imageUrl} alt="" fill unoptimized sizes="56px" className="object-cover" /> : <Kind aria-hidden="true" size={24} />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span dir="auto" className="truncate text-[15px] font-bold">{title}</span>
                  <span dir="ltr" className="truncate text-xs text-[var(--page-muted)] rtl:text-end">{l.url.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
                </span>
                <ArrowUpRight aria-hidden="true" size={18} className="shrink-0 text-[var(--page-muted)] rtl:-scale-x-100" />
                <span className="sr-only">{t("opensNewTab")}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function Contact({ page, lang, t, desktop }: { page: PublishedPage; lang: Locale; t: T; desktop: boolean }) {
  if (!page.whatsapp && !page.contactEmail) return null;
  const link = `${siteOrigin().replace(/^https?:\/\//, "")}/${page.username}`;
  const row = `${solidBox} flex min-h-12 items-center gap-3.5 rounded-[16px] p-4`;
  const tile = "inline-flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-[var(--page-soft)]";
  return (
    <section className="flex flex-col gap-3">
      <h2 className={desktop ? "text-lg font-semibold" : "text-xl font-semibold"}>{t("contact")}</h2>
      <div className="flex flex-col gap-3">
        {page.whatsapp && (
          <a
            href={`https://wa.me/${page.whatsapp}?text=${encodeURIComponent(t("whatsappMessage", { link }))}`}
            target="_blank" rel="noopener noreferrer" data-track="whatsapp" className={row}
          >
            <span className={tile}><PlatformIcon platform="whatsapp" size={22} /></span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[13px] text-[var(--page-muted)]">{t("whatsapp")}</span>
              <span dir="ltr" className="font-medium">{formatPhone(page.whatsapp)}</span>
            </span>
          </a>
        )}
        {page.contactEmail && (
          <a href={`mailto:${page.contactEmail}`} data-track="email" className={row} lang={lang}>
            <span className={tile}><Icon d={MAIL} size={22} /></span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[13px] text-[var(--page-muted)]">{t("email")}</span>
              <span dir="ltr" className="text-[15px] font-medium [overflow-wrap:anywhere]">{page.contactEmail}</span>
            </span>
          </a>
        )}
      </div>
    </section>
  );
}
