import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { BadgeCheck, Eye, FileText, Mail, MapPin } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { pageTheme, themeStyle } from "@/components/creator/theme";
import { PLATFORM_NAMES } from "@/config/platforms";
import type { Locale } from "@/i18n/config";
import { formatCompact, formatNumber, formatPercent, formatPrice } from "@/lib/format";
import type { PublishedPage } from "@/lib/public-page";
import { bundleComparison, rateName } from "@/lib/rates";

type Props = { page: PublishedPage; lang: Locale };
type T = Awaited<ReturnType<typeof getTranslations<"CreatorPage">>>;

// Cards use the theme surface; the Black template frosts them (glass).
const card = "rounded-[20px] border border-[var(--page-line)] bg-[var(--page-surface)] [.glass_&]:backdrop-blur-md";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

/** Mobile order follows CLAUDE.md section 5; on desktop the identity column is a sticky sidebar. */
export async function CreatorProfile({ page, lang }: Props) {
  const t = await getTranslations("CreatorPage");
  const tr = page.translations.find((x) => x.lang === lang) ?? page.translations[0];
  const name = tr?.fullName || page.username;
  const verified = page.accounts.some((a) => a.verified);
  const totalFollowers = page.accounts.reduce((sum, a) => sum + a.followers, 0);
  const numbersFont = page.numberFont === "wide" ? "font-numbers" : "font-sans";
  const location = [tr?.city, tr?.country].filter(Boolean).join(lang === "ar" ? "، " : ", ");
  const tags = page.tags.filter((tag) => tag.lang === lang);

  const contact = <Contact page={page} t={t} />;
  const theme = pageTheme(page.template, page.accent, page.customColors);

  return (
    <div style={themeStyle(theme)} className={`flex-1 text-[var(--page-text)] ${theme.glass ? "glass" : ""}`}>
      <div className="mx-auto w-full max-w-5xl md:grid md:grid-cols-[320px_1fr] md:items-start md:gap-10 md:px-6 md:py-10">
        {/* Identity: hero, name, bio, location, licenses (+ contact on desktop) */}
        <aside className="flex flex-col gap-4 md:sticky md:top-10">
          <div className="relative aspect-square w-full overflow-hidden md:rounded-[24px]">
            {page.photoUrl ? (
              <Image src={page.photoUrl} alt={name} fill priority unoptimized sizes="(min-width: 768px) 320px, 100vw" className="object-cover" />
            ) : (
              <div className="brand-gradient size-full" aria-hidden="true" />
            )}
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[var(--page-bg)] to-transparent md:hidden" />
          </div>

          <div className="-mt-10 flex flex-col gap-2 px-4 md:mt-0 md:px-0 relative">
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              {name}
              {verified && <BadgeCheck aria-label={t("verified")} className="size-7 shrink-0 fill-[var(--page-accent)] text-[var(--page-on-accent)]" />}
            </h1>
            {tr?.specialty && <p className="font-medium text-[var(--page-accent)]">{tr.specialty}</p>}
            {tr?.bio && <p className="leading-relaxed text-[var(--page-muted)]">{tr.bio}</p>}
            {location && (
              <p className="flex items-center gap-1 text-sm text-[var(--page-muted)]">
                <MapPin aria-hidden="true" size={16} /> {location}
              </p>
            )}
          </div>

          {page.licenses.length > 0 && (
            <ul className="flex flex-col gap-2 px-4 md:px-0" aria-label={t("licenses")}>
              {page.licenses.map((license) => (
                <li key={license.id} className={`${card} flex items-center justify-between gap-3 px-4 py-3 text-sm`}>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium">{lang === "en" && license.nameEn ? license.nameEn : license.name}</span>
                    <bdi dir="ltr" className="text-[var(--page-muted)]">{license.number}</bdi>
                  </span>
                  {license.fileUrl && (
                    <a href={license.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 font-medium text-[var(--page-accent)]">
                      <FileText aria-hidden="true" size={16} /> {t("viewFile")}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="hidden md:block">{contact}</div>
        </aside>

        <main className="flex flex-col gap-8 px-4 pt-6 pb-10 md:p-0">
          {/* Total followers + social row */}
          <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-start">
            <p className="text-sm text-[var(--page-muted)]">{t("followersTotal")}</p>
            <p className={`${numbersFont} text-5xl font-bold tabular-nums`}>{formatNumber(totalFollowers, lang)}</p>
            <ul className="flex flex-wrap justify-center gap-2 md:justify-start">
              {page.accounts.map((a) => (
                <li key={a.id}>
                  <a
                    href={a.url} target="_blank" rel="noopener noreferrer"
                    aria-label={`${PLATFORM_NAMES[a.platform]} @${a.handle}`}
                    className={`${card} inline-flex size-11 items-center justify-center`}
                  >
                    <PlatformIcon platform={a.platform} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {tags.length > 0 && (
            <ul className="grid grid-cols-3 gap-2">
              {tags.map((tag) => (
                <li key={tag.id} className={`${card} truncate whitespace-nowrap px-3 py-2 text-center text-sm`}>
                  {tag.label}
                </li>
              ))}
            </ul>
          )}

          {page.monthlyViews !== null && (
            <div className={`${card} flex items-center gap-4 p-5`}>
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--page-bg)] text-[var(--page-accent)]">
                <Eye aria-hidden="true" />
              </span>
              <div>
                <p className={`${numbersFont} text-2xl font-bold`}>{formatCompact(page.monthlyViews, lang)}</p>
                <p className="text-sm text-[var(--page-muted)]">{t("monthlyViews")}</p>
              </div>
            </div>
          )}

          {page.accounts.length > 0 && (
            <Section title={t("platforms")}>
              <ul className="grid grid-cols-2 gap-3">
                {page.accounts.map((a) => (
                  <li key={a.id} className={`${card} flex flex-col gap-2 p-4`}>
                    <div className="flex items-center justify-between">
                      <PlatformIcon platform={a.platform} size={22} />
                      {a.verified && <BadgeCheck aria-label={t("verified")} size={18} className="fill-[var(--page-accent)] text-[var(--page-on-accent)]" />}
                    </div>
                    <p className={`${numbersFont} text-2xl font-bold`}>{formatCompact(a.followers, lang)}</p>
                    <p className="truncate text-sm text-[var(--page-muted)]" dir="ltr">
                      {PLATFORM_NAMES[a.platform]} · @{a.handle}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {page.brandLogos.length > 0 && (
            <Section title={t("brands")}>
              <ul className="flex gap-3 overflow-x-auto pb-1">
                {page.brandLogos.map((logo) => (
                  <li key={logo.id} className={`${card} relative h-16 w-32 shrink-0 overflow-hidden`}>
                    <Image src={logo.logoUrl} alt={logo.name} fill unoptimized sizes="128px" className="object-contain p-2" />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {page.portfolio.length > 0 && (
            <Section title={t("work")}>
              <ul className="flex gap-3 overflow-x-auto pb-1">
                {page.portfolio.map((item) => {
                  const itemTr = item.translations.find((x) => x.lang === lang) ?? item.translations[0];
                  return (
                    <li key={item.id} className="flex w-36 shrink-0 flex-col gap-2">
                      <div className={`${card} relative aspect-[9/16] overflow-hidden`}>
                        {item.thumbUrl && <Image src={item.thumbUrl} alt="" fill unoptimized sizes="144px" className="object-cover" />}
                      </div>
                      <p className="truncate text-sm font-medium">{itemTr?.brand}</p>
                      <p className="truncate text-xs text-[var(--page-muted)]">{itemTr?.type}</p>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          <Rates page={page} lang={lang} t={t} />

          <div className="md:hidden">{contact}</div>

          {page.showBranding && (
            <p className="text-center text-sm text-[var(--page-muted)]">
              <Link href="/" className="inline-flex min-h-11 items-center">{t("madeWith")}</Link>
            </p>
          )}
        </main>
      </div>
    </div>
  );
}

function Rates({ page, lang, t }: Props & { t: T }) {
  const settings = page.rateSettings;
  const withRates = page.accounts.filter((a) => a.rates.length > 0);
  if (!settings || (withRates.length === 0 && page.bundles.length === 0)) return null;

  if (!settings.showOnPage) {
    return (
      <Section title={t("rates")}>
        <p className={`${card} p-5 text-center text-[var(--page-muted)]`}>{t("ratesOnRequest")}</p>
      </Section>
    );
  }

  const price = (value: number) => formatPrice(value, settings.currency, lang);

  return (
    <Section title={t("rates")}>
      <div className="flex flex-col gap-3">
        {withRates.map((a) => (
          <div key={a.id} className={`${card} p-4`}>
            <p className="mb-2 flex items-center gap-2 font-medium">
              <PlatformIcon platform={a.platform} size={18} /> {PLATFORM_NAMES[a.platform]}
            </p>
            <ul className="flex flex-col divide-y divide-[var(--page-line)]">
              {a.rates.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{rateName(r, lang)}</span>
                  <span className="font-bold">{price(r.price)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {page.bundles.map((b) => {
          const platforms = b.accountIds.map((id) => page.accounts.find((a) => a.id === id)).filter((a) => !!a);
          return (
            <div key={b.id} className={`${card} border-[var(--page-accent)] p-4`}>
              <p className="mb-2 flex flex-wrap items-center gap-2 font-medium">
                <span className="rounded-full bg-[var(--page-accent)] px-2 py-0.5 text-xs text-[var(--page-on-accent)]">{t("bundle")}</span>
                {rateName({ name: b.name ?? "", nameEn: b.nameEn }, lang) || platforms.map((a) => PLATFORM_NAMES[a.platform]).join(" + ")}
              </p>
              <p className="mb-2 flex gap-2 text-[var(--page-muted)]" aria-label={platforms.map((a) => PLATFORM_NAMES[a.platform]).join(", ")}>
                {platforms.map((a) => <PlatformIcon key={a.id} platform={a.platform} size={16} />)}
              </p>
              <ul className="flex flex-col divide-y divide-[var(--page-line)]">
                {b.rates.map((r) => {
                  const compare = bundleComparison(r, b.accountIds, page.accounts);
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span>{rateName(r, lang)}</span>
                      <span className="flex flex-col items-end">
                        <span className="font-bold">{price(r.price)}</span>
                        {compare && (
                          <span className="text-xs text-[var(--page-muted)]">
                            <s>{t("insteadOf", { price: price(compare.separate) })}</s>{" "}
                            <span className="font-medium text-[var(--page-accent)]">{t("save", { percent: formatPercent(compare.savingsPercent, lang) })}</span>
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        <p className="text-xs text-[var(--page-muted)]">{settings.vatIncluded ? t("vatIncluded") : t("vatExcluded")}</p>
      </div>
    </Section>
  );
}

function Contact({ page, t }: { page: PublishedPage; t: T }) {
  if (!page.whatsapp && !page.contactEmail) return null;
  return (
    <Section title={t("contact")}>
      <div className="flex flex-col gap-2">
        {page.whatsapp && (
          <a
            href={`https://wa.me/${page.whatsapp}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--page-accent)] px-5 font-semibold text-[var(--page-on-accent)]"
          >
            <PlatformIcon platform="whatsapp" size={18} /> {t("whatsapp")}
          </a>
        )}
        {page.contactEmail && (
          <a
            href={`mailto:${page.contactEmail}`}
            className={`${card} inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 font-semibold`}
          >
            <Mail aria-hidden="true" size={18} /> {t("email")}
          </a>
        )}
      </div>
    </Section>
  );
}
