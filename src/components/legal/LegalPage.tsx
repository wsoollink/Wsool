import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { Fragment } from "react";
import { LEGAL, SUPPORT_WHATSAPP_DISPLAY, supportWhatsappUrl } from "@/config/site";
import { LEGAL_TEXT, type LegalKind } from "@/content/legal";
import { AGENCY_LEGAL_TEXT } from "@/content/agency-legal";
import { SiteFooter } from "@/components/site/SiteFooter";
import { AgenciesFooter, AgenciesHeader } from "@/app/[locale]/(site)/agencies/Header";
import { toIntlLocale, type Locale } from "@/i18n/config";

const BLANKS = {
  ar: { entity: "[اسم الجهة]", registration: "[رقم السجل]", gateway: "[بوابة الدفع]", date: "[تاريخ السريان]" },
  en: { entity: "[Legal entity name]", registration: "[Registration number]", gateway: "[Payment gateway]", date: "[Effective date]" },
};

const UI = {
  ar: { effective: "تاريخ السريان:", home: "الرئيسية", names: { terms: "الشروط", privacy: "الخصوصية", refund: "الاسترجاع" }, contents: "المحتويات" },
  en: { effective: "Effective date:", home: "Home", names: { terms: "Terms", privacy: "Privacy", refund: "Refunds" }, contents: "Contents" },
};

/** Bare (https://…) addresses become links, e.g. the YouTube / Google pages Google requires us to cite. */
const links = (text: string) =>
  text.split(/(https:\/\/[^\s)]+)/).map((part, i) =>
    i % 2 ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" dir="ltr" className="text-blue underline underline-offset-2">{part.replace(/^https:\/\//, "")}</a> : part);

/** Fills {placeholders}; the official email and WhatsApp number become links. */
function fill(text: string, lang: Locale) {
  const b = BLANKS[lang];
  const values: Record<string, string> = {
    entity: (lang === "en" ? LEGAL.entityEn : LEGAL.entity) || b.entity,
    registration: LEGAL.registration ? (lang === "en" ? `CR No. ${LEGAL.registration}` : `سجل تجاري رقم ${LEGAL.registration}`) : b.registration,
    gateway: (lang === "en" ? LEGAL.paymentGatewayEn : LEGAL.paymentGateway) || b.gateway,
    mailer: LEGAL.emailProvider,
    servers: lang === "en" ? LEGAL.serverLocationEn : LEGAL.serverLocation,
  };
  return text.split(/(\{\w+\})/).map((part, i) => {
    const key = part.match(/^\{(\w+)\}$/)?.[1];
    if (!key) return <Fragment key={i}>{links(part)}</Fragment>;
    if (key === "whatsapp") return <a key={i} href={supportWhatsappUrl()} target="_blank" rel="noopener noreferrer" dir="ltr" className="font-semibold text-blue underline underline-offset-2">{SUPPORT_WHATSAPP_DISPLAY}</a>;
    if (key === "email") return <a key={i} href={`mailto:${LEGAL.email}`} dir="ltr" className="font-semibold text-blue underline underline-offset-2">{LEGAL.email}</a>;
    return <Fragment key={i}>{values[key] ?? part}</Fragment>;
  });
}

function effectiveDate(lang: Locale) {
  if (!LEGAL.effectiveDate) return BLANKS[lang].date;
  return new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "long", timeZone: "UTC" }).format(new Date(LEGAL.effectiveDate));
}

/**
 * Terms of Use / Privacy Policy / Refund Policy (content in src/content/legal.ts). `audience="agency"` = the versions for
 * agency and brand accounts (src/content/agency-legal.ts) at /agencies/<kind>, with the agencies header and footer.
 */
export function LegalPage({ lang, kind, audience = "creator" }: { lang: Locale; kind: LegalKind; audience?: "creator" | "agency" }) {
  const agency = audience === "agency";
  const doc = (agency ? AGENCY_LEGAL_TEXT : LEGAL_TEXT)[lang][kind];
  const ui = UI[lang];
  const headings = doc.blocks.flatMap((b, i) => ("h" in b ? [{ id: `s${i}`, text: b.h }] : []));

  return (
    <div className="flex flex-1 flex-col bg-bg-marketing">
      {agency ? <AgenciesHeader lang={lang === "en" ? "en" : "ar"} sections={false} /> : (
      <header className="border-b border-line bg-card/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex min-h-11 items-center" aria-label={ui.home}>
            <BrandLogo lang={lang === "en" ? "en" : "ar"} alt={lang === "en" ? "Wsool" : "وصول"} priority />
          </Link>
          <nav className="flex items-center gap-1">
            {(["terms", "privacy", "refund"] as const).filter((k) => k !== kind).map((k) => (
              <Link key={k} href={`/${k}`} className="min-h-11 content-center rounded-full px-2.5 text-sm font-semibold text-blue">{ui.names[k]}</Link>
            ))}
          </nav>
        </div>
      </header>
      )}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:py-12">
        <h1 className="text-3xl font-black md:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted">{ui.effective} {effectiveDate(lang)}</p>
        {agency && (
          <nav aria-label={ui.contents} className="mt-3 flex flex-wrap gap-1">
            {(["terms", "privacy", "refund"] as const).filter((k) => k !== kind).map((k) => (
              <Link key={k} href={`/agencies/${k}`} className="min-h-11 content-center rounded-full px-2.5 text-sm font-semibold text-blue">{ui.names[k]}</Link>
            ))}
          </nav>
        )}
        <p className="mt-6 leading-8">{fill(doc.intro, lang)}</p>

        <nav aria-label={ui.contents} className="mt-6 rounded-[20px] border border-line bg-card p-5">
          <p className="mb-2 text-sm font-bold">{ui.contents}</p>
          <ol className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            {headings.map((h) => (
              <li key={h.id}><a href={`#${h.id}`} className="inline-block py-1 text-muted hover:text-blue focus-visible:text-blue">{h.text}</a></li>
            ))}
          </ol>
        </nav>

        <article className="mt-8 flex flex-col gap-4 leading-8">
          {doc.blocks.map((b, i) => {
            if ("h" in b) return <h2 key={i} id={`s${i}`} className="mt-6 scroll-mt-6 text-xl font-bold">{b.h}</h2>;
            if ("p" in b) return <p key={i}>{fill(b.p, lang)}</p>;
            if ("ul" in b) {
              return (
                <ul key={i} className="flex list-disc flex-col gap-2 ps-6 marker:text-blue">
                  {b.ul.map((item, j) => <li key={j}>{fill(item, lang)}</li>)}
                </ul>
              );
            }
            const [head, ...rows] = b.table;
            return (
              <div key={i} className="overflow-x-auto rounded-[20px] border border-line bg-card">
                <table className="w-full min-w-[520px] text-start text-sm leading-6">
                  <thead className="bg-navy/5">
                    <tr>{head.map((c) => <th key={c} scope="col" className="p-3 text-start font-bold">{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.map((r, j) => (
                      <tr key={j} className="border-t border-line">
                        {r.map((c, k) => k === 0
                          ? <th key={k} scope="row" className="p-3 text-start align-top font-semibold">{c}</th>
                          : <td key={k} className="p-3 align-top text-muted">{fill(c, lang)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </article>
      </main>
      {agency ? <AgenciesFooter lang={lang === "en" ? "en" : "ar"} /> : (
        <SiteFooter lang={lang === "en" ? "en" : "ar"} />
      )}
    </div>
  );
}
