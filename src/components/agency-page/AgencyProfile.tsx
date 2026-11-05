import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowDown, FileText, Globe, Mail, MapPin } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { PLATFORM_NAMES } from "@/config/platforms";
import type { Locale } from "@/i18n/config";
import type { PublicAgency } from "@/lib/agency-page";
import { formatCompact, formatNumber } from "@/lib/format";
import { initials } from "@/lib/initials";
import { siteOrigin } from "@/lib/site-url";
import { agencyTheme, agencyThemeStyle } from "./theme";
import { Roster } from "./Roster";
import { Marquee } from "@/components/creator/Marquee";

const wrap = "mx-auto w-full max-w-[1160px] px-4 sm:px-6";
const eyebrow = "text-[12.5px] font-bold tracking-[0.08em] text-[var(--ag-accent)] uppercase";

/**
 * Public agency page wsool.link/<slug>: editorial layout (hero with a creator mosaic, stats strip, talent roster,
 * about, contact band), coloured by the agency's template. `preview` adds a bar for the agency's own preview.
 */
export async function AgencyProfile({ agency, lang, preview, demo }: { agency: PublicAgency; lang: Locale; preview?: boolean; /** /agencies/demo: fictional data, a bar says so. */ demo?: boolean }) {
  const t = await getTranslations("AgencyPage");
  const theme = agencyTheme(agency.template, agency.accent);
  const link = `${siteOrigin().replace(/^https?:\/\//, "")}/${agency.slug}`;
  const faces = agency.creators.filter((c) => c.photoUrl).slice(0, 6);
  const website = agency.website?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const hasContact = !!(agency.whatsapp || agency.email || agency.website);
  const pdf = `/${agency.slug}/pdf?lang=${lang}`;
  const stats = [
    { k: "creators", v: formatNumber(agency.stats.creators, lang) },
    { k: "followers", v: formatCompact(agency.stats.followers, lang) },
    { k: "verified", v: formatNumber(agency.stats.verified, lang) },
  ] as const;

  return (
    <div style={agencyThemeStyle(theme)} className="ag-page flex min-h-dvh flex-1 flex-col bg-[var(--ag-bg)] text-[var(--ag-ink)]">
      {preview && <p className="bg-[#B45309] px-4 py-2 text-center text-sm font-bold text-white">{t("previewBar")}</p>}
      {demo && (
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#0060E6] px-4 py-2 text-center text-[13.5px] font-semibold text-white">
          {t("demoBar")}
          <Link href="/agencies/apply" className="inline-flex min-h-8 items-center rounded-full bg-white px-3.5 text-[13px] font-bold text-[#0060E6]">{t("demoCta")}</Link>
        </p>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--ag-hero-line)] bg-[var(--ag-hero-bg)]/90 text-[var(--ag-hero-ink)] backdrop-blur-md">
        <div className={`${wrap} flex h-16 items-center justify-between gap-3`}>
          <a href="#top" className="flex min-w-0 items-center gap-2.5">
            {agency.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- agency logo from storage
              <img src={agency.logoUrl} alt="" className="size-9 shrink-0 rounded-lg bg-white object-contain p-0.5" />
            ) : (
              <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ag-hero-accent)] text-sm font-black text-[var(--ag-hero-on-accent)] uppercase">{initials(agency.name)}</span>
            )}
            <span className="truncate text-[15px] font-bold">{agency.name}</span>
          </a>
          <nav className="flex items-center gap-1">
            <div className="hidden items-center gap-1 md:flex">
              {[["creators", t("navCreators")], ["about", t("navAbout")]].map(([id, label]) => (
                <a key={id} href={`#${id}`} className="inline-flex min-h-10 items-center rounded-full px-3.5 text-sm font-semibold text-[var(--ag-hero-muted)] hover:text-[var(--ag-hero-ink)]">{label}</a>
              ))}
            </div>
            {hasContact && (
              <a href="#contact" className="inline-flex min-h-10 items-center rounded-full bg-[var(--ag-hero-accent)] px-4 text-sm font-bold text-[var(--ag-hero-on-accent)]">{t("contactCta")}</a>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden bg-[var(--ag-hero-bg)] text-[var(--ag-hero-ink)]">
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 end-[-10%] size-[620px] rounded-full" style={{ background: "radial-gradient(closest-side, var(--ag-hero-glow), transparent)" }} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(var(--ag-hero-line) 1px, transparent 1px), linear-gradient(90deg, var(--ag-hero-line) 1px, transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(ellipse at 70% 0%, black, transparent 70%)" }} />
        <div className={`${wrap} relative grid grid-cols-1 items-center gap-10 pt-12 pb-24 md:grid-cols-[1.1fr_1fr] md:pt-20 md:pb-32`}>
          <div className="flex flex-col items-start gap-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--ag-hero-line)] px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--ag-hero-muted)]">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--ag-hero-accent)]" />
              {t("kind")}
              {agency.city && <><span aria-hidden="true">·</span><span>{agency.city}</span></>}
            </span>
            <h1 className="text-[2.6rem] leading-[1.15] font-black tracking-tight text-balance sm:text-5xl lg:text-6xl">{agency.name}</h1>
            {agency.tagline && <p className="max-w-xl text-lg leading-relaxed text-pretty text-[var(--ag-hero-muted)] md:text-xl">{agency.tagline}</p>}
            <div className="mt-2 flex flex-wrap gap-3">
              <a href="#creators" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--ag-hero-accent)] px-6 font-bold text-[var(--ag-hero-on-accent)]">
                {t("seeCreators")} <ArrowDown aria-hidden="true" size={17} />
              </a>
              {agency.creators.length > 0 && (
                <a href={pdf} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--ag-hero-line)] px-6 font-bold hover:bg-[var(--ag-hero-line)]">
                  <FileText aria-hidden="true" size={17} /> {t("downloadPdf")}
                </a>
              )}
            </div>
          </div>

          {/* Creator mosaic: three staggered columns of portraits (phones: one overlapping row). */}
          {faces.length >= 3 ? (
            <div aria-hidden="true" className="hidden grid-cols-3 gap-3 md:grid">
              {[0, 1, 2].map((col) => (
                <div key={col} className={`flex flex-col gap-3 ${col === 1 ? "translate-y-10" : col === 2 ? "translate-y-4" : ""}`}>
                  {faces.filter((_, i) => i % 3 === col).map((c) => (
                    // eslint-disable-next-line @next/next/no-img-element -- creator photos from storage
                    <img key={c.pageId} src={c.photoUrl} alt="" className="aspect-[3/4] w-full rounded-2xl object-cover shadow-2xl shadow-black/30 ring-1 ring-[var(--ag-hero-line)]" />
                  ))}
                </div>
              ))}
            </div>
          ) : null}
          {faces.length > 0 && (
            <div aria-hidden="true" className="flex items-center md:hidden">
              {faces.slice(0, 5).map((c) => (
                // eslint-disable-next-line @next/next/no-img-element -- creator photos from storage
                <img key={c.pageId} src={c.photoUrl} alt="" className="-ms-3 size-14 rounded-full object-cover ring-[3px] ring-[var(--ag-hero-bg)] first:ms-0" />
              ))}
              {agency.creators.length > 5 && (
                <span className="-ms-3 flex size-14 items-center justify-center rounded-full bg-[var(--ag-hero-accent)] text-sm font-bold text-[var(--ag-hero-on-accent)] ring-[3px] ring-[var(--ag-hero-bg)]" dir="ltr">+{agency.creators.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Stats strip, overlapping the hero */}
      <div className={`${wrap} relative z-10 -mt-14 md:-mt-16`}>
        <dl className="grid grid-cols-2 overflow-hidden rounded-3xl border border-[var(--ag-line)] bg-[var(--ag-surface)] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.35)] md:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.k} className={`flex flex-col-reverse items-center justify-center gap-1.5 p-5 text-center md:p-6 ${i % 2 === 1 ? "border-s border-[var(--ag-line)]" : ""} ${i >= 2 ? "border-t border-[var(--ag-line)] md:border-t-0" : ""} ${i === 2 ? "md:border-s" : ""}`}>
              <dt className="text-[15px] font-medium text-[var(--ag-muted)] md:text-base">{t(`stat.${s.k}`)}</dt>
              {/* Number first, then "مليون" / "ألف" (natural order, no forced direction). */}
              <dd className="font-numbers text-2xl leading-tight font-black md:text-[1.9rem]">{s.v}</dd>
            </div>
          ))}
          <div className="flex flex-col-reverse items-center justify-center gap-1.5 border-s border-t border-[var(--ag-line)] p-5 text-center md:border-t-0 md:p-6">
            <dt className="text-[15px] font-medium text-[var(--ag-muted)] md:text-base">{t("stat.platforms")}</dt>
            <dd className="flex min-h-9 flex-wrap items-center justify-center gap-2">
              {agency.stats.platforms.length ? agency.stats.platforms.slice(0, 7).map((p) => (
                <span key={p} title={PLATFORM_NAMES[p]} className="text-[var(--ag-ink)]"><PlatformIcon platform={p} size={20} /></span>
              )) : <span className="font-numbers text-2xl font-black">0</span>}
            </dd>
          </div>
        </dl>
      </div>

      <main className="flex flex-1 flex-col">
        {/* Roster */}
        <section id="creators" className={`${wrap} scroll-mt-20 py-16 md:py-24`}>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={eyebrow}>{t("rosterEyebrow")}</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{t("rosterTitle", { name: agency.name })}</h2>
            </div>
            <p className="text-[var(--ag-muted)]">{t("rosterSub", { n: agency.creators.length })}</p>
          </div>
          <Roster creators={agency.creators} lang={lang} />
        </section>

        {/* Brands the agency worked with: scrolling logo strip (px-5 on phones: Marquee's -mx-5 bleeds 20px to the edges). */}
        {agency.brands.length > 0 && (
          <section className="mx-auto w-full max-w-[1160px] px-5 pb-16 sm:px-6 md:pb-24">
            <p className={eyebrow}>{t("brandsEyebrow")}</p>
            <h2 className="mt-2 mb-6 text-2xl font-black tracking-tight md:text-3xl">{t("brandsTitle")}</h2>
            <Marquee ariaLabel={t("brandsTitle")} seconds={Math.max(20, agency.brands.length * 4)}>
              {agency.brands.map((b) => (
                <li key={b.logoUrl} className="flex h-[76px] w-[132px] shrink-0 items-center justify-center rounded-2xl border border-[var(--ag-line)] bg-white px-5 py-4 md:h-[88px] md:w-[160px]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- brand logos from storage */}
                  <img src={b.logoUrl} alt={b.name ?? ""} loading="lazy" className="max-h-full max-w-full object-contain" />
                </li>
              ))}
            </Marquee>
          </section>
        )}

        {/* About */}
        {(agency.bio || agency.city || website || agency.accounts.length > 0) && (
          <section id="about" className="scroll-mt-20 border-t border-[var(--ag-line)] bg-[var(--ag-surface)]">
            <div className={`${wrap} grid grid-cols-1 gap-10 py-16 md:grid-cols-[1.4fr_1fr] md:py-24`}>
              <div>
                <p className={eyebrow}>{t("aboutEyebrow")}</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{t("aboutTitle")}</h2>
                {agency.bio && <p className="mt-5 text-lg leading-[1.9] whitespace-pre-line text-[var(--ag-muted)]">{agency.bio}</p>}
                {/* The agency's own accounts: icons only, each opening the profile. */}
                {agency.accounts.length > 0 && (
                  <ul className="mt-6 flex flex-wrap gap-2.5" aria-label={t("accountsLabel")}>
                    {agency.accounts.map((a) => (
                      <li key={a.url}>
                        <a href={a.url} target="_blank" rel="noopener noreferrer" aria-label={`${PLATFORM_NAMES[a.platform]} @${a.handle}`}
                          className="flex size-11 items-center justify-center rounded-full border border-[var(--ag-line)] bg-[var(--ag-bg)] text-[var(--ag-ink)] transition-colors hover:border-[var(--ag-accent)] hover:text-[var(--ag-accent)]">
                          <PlatformIcon platform={a.platform} size={18} />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <dl className="flex flex-col divide-y divide-[var(--ag-line)] self-start rounded-3xl border border-[var(--ag-line)] bg-[var(--ag-bg)] px-6">
                {agency.city && <Fact icon={<MapPin size={17} />} label={t("facts.city")}>{agency.city}</Fact>}
                <Fact label={t("facts.creators")}><span className="font-numbers font-black">{formatNumber(agency.stats.creators, lang)}</span></Fact>
                {agency.stats.platforms.length > 0 && (
                  <Fact label={t("facts.platforms")}>{agency.stats.platforms.map((p) => PLATFORM_NAMES[p]).join(lang === "ar" ? "، " : ", ")}</Fact>
                )}
                {website && (
                  <Fact icon={<Globe size={17} />} label={t("facts.website")}>
                    <a href={agency.website!} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--ag-accent)] underline-offset-4 hover:underline" dir="ltr">{website}</a>
                  </Fact>
                )}
              </dl>
            </div>
          </section>
        )}

        {/* Contact band */}
        {hasContact && (
          <section id="contact" className={`${wrap} scroll-mt-20 py-16 md:py-24`}>
            <div className="relative overflow-hidden rounded-[2rem] bg-[var(--ag-band-bg)] px-6 py-12 text-center text-[var(--ag-band-ink)] md:px-16 md:py-16">
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 start-1/2 size-[520px] -translate-x-1/2 rounded-full" style={{ background: "radial-gradient(closest-side, var(--ag-hero-glow), transparent)" }} />
              <h2 className="relative text-3xl font-black tracking-tight text-balance md:text-5xl">{t("bandTitle")}</h2>
              <p className="relative mx-auto mt-4 max-w-xl text-lg opacity-80">{t("bandSub", { name: agency.name })}</p>
              <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                {agency.whatsapp && (
                  <a href={`https://wa.me/${agency.whatsapp}?text=${encodeURIComponent(t("whatsappMessage", { link }))}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#25D366] px-6 font-bold text-[#06240F]">
                    <PlatformIcon platform="whatsapp" size={18} /> {t("whatsapp")}
                  </a>
                )}
                {agency.email && (
                  <a href={`mailto:${agency.email}`} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 font-bold text-[#0F0F0F]">
                    <Mail aria-hidden="true" size={18} /> {t("email")}
                  </a>
                )}
                {agency.website && (
                  <a href={agency.website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/30 px-6 font-bold">
                    <Globe aria-hidden="true" size={18} /> {t("website")}
                  </a>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-[var(--ag-line)]">
        <div className={`${wrap} flex flex-col items-center justify-between gap-2 py-6 text-sm text-[var(--ag-muted)] sm:flex-row`}>
          <p>{t("rights", { name: agency.name })}</p>
          <Link href="/" className="inline-flex min-h-10 items-center font-semibold hover:text-[var(--ag-ink)]">{t("madeWith")}</Link>
        </div>
      </footer>
    </div>
  );
}

function Fact({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <dt className="flex items-center gap-2 text-sm text-[var(--ag-muted)]"><span aria-hidden="true">{icon}</span>{label}</dt>
      <dd className="text-end text-[15px]">{children}</dd>
    </div>
  );
}
