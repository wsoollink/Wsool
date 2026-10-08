import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { LEGAL } from "@/config/site";
import { LEGAL_TEXT, type LegalKind } from "@/content/legal";
import { toIntlLocale, type Locale } from "@/i18n/config";

const BLANKS = {
  ar: { entity: "[اسم الجهة]", registration: "[رقم السجل]", gateway: "[بوابة الدفع]", date: "[تاريخ السريان]" },
  en: { entity: "[Legal entity name]", registration: "[Registration number]", gateway: "[Payment gateway]", date: "[Effective date]" },
};

const UI = {
  ar: { effective: "تاريخ السريان:", home: "الرئيسية", other: { terms: "سياسة الخصوصية", privacy: "شروط الاستخدام" }, contents: "المحتويات" },
  en: { effective: "Effective date:", home: "Home", other: { terms: "Privacy Policy", privacy: "Terms of Use" }, contents: "Contents" },
};

/** Fills {placeholders}; the official email becomes a mailto link. */
function fill(text: string, lang: Locale) {
  const b = BLANKS[lang];
  const values: Record<string, string> = {
    entity: (lang === "en" ? LEGAL.entityEn : LEGAL.entity) || b.entity,
    registration: LEGAL.registration ? (lang === "en" ? `CR ${LEGAL.registration}` : `سجل رقم ${LEGAL.registration}`) : b.registration,
    gateway: LEGAL.paymentGateway || b.gateway,
    mailer: LEGAL.emailProvider,
    servers: lang === "en" ? LEGAL.serverLocationEn : LEGAL.serverLocation,
  };
  return text.split(/(\{\w+\})/).map((part, i) => {
    const key = part.match(/^\{(\w+)\}$/)?.[1];
    if (!key) return <Fragment key={i}>{part}</Fragment>;
    if (key === "email") return <a key={i} href={`mailto:${LEGAL.email}`} dir="ltr" className="font-semibold text-blue underline underline-offset-2">{LEGAL.email}</a>;
    return <Fragment key={i}>{values[key] ?? part}</Fragment>;
  });
}

function effectiveDate(lang: Locale) {
  if (!LEGAL.effectiveDate) return BLANKS[lang].date;
  return new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "long", timeZone: "UTC" }).format(new Date(LEGAL.effectiveDate));
}

/** Terms of Use / Privacy Policy (content in src/content/legal.ts). */
export function LegalPage({ lang, kind }: { lang: Locale; kind: LegalKind }) {
  const doc = LEGAL_TEXT[lang][kind];
  const ui = UI[lang];
  const headings = doc.blocks.flatMap((b, i) => ("h" in b ? [{ id: `s${i}`, text: b.h }] : []));

  return (
    <div className="flex flex-1 flex-col bg-[#F6F8FC]">
      <header className="border-b border-line bg-white/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex min-h-11 items-center" aria-label={ui.home}>
            <Image src={lang === "en" ? "/brand/logo-en.png" : "/brand/logo-ar.png"} alt={lang === "en" ? "Wsool" : "وصول"} width={96} height={32} priority />
          </Link>
          <Link href={kind === "terms" ? "/privacy" : "/terms"} className="min-h-11 content-center text-sm font-semibold text-blue">
            {ui.other[kind]}
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:py-12">
        <h1 className="text-3xl font-black md:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted">{ui.effective} {effectiveDate(lang)}</p>
        <p className="mt-6 leading-8">{fill(doc.intro, lang)}</p>

        <nav aria-label={ui.contents} className="mt-6 rounded-[20px] border border-line bg-white p-5">
          <p className="mb-2 text-sm font-bold">{ui.contents}</p>
          <ol className="grid gap-1 text-sm sm:grid-cols-2">
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
              <div key={i} className="overflow-x-auto rounded-[20px] border border-line bg-white">
                <table className="w-full min-w-[520px] text-start text-sm leading-6">
                  <thead className="bg-[#F4F6FA]">
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
      <footer className="border-t border-line py-6 text-center text-sm text-muted">
        © wsool.link
      </footer>
    </div>
  );
}
