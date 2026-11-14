import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Quote } from "lucide-react";
import { Marquee } from "@/components/creator/Marquee";
import { toIntlLocale, type Locale } from "@/i18n/config";
import { getTestimonials, type TestimonialAudience } from "@/lib/testimonials";

/**
 * "What they say about Wsool" (owner, Nov 2026): a moving strip of testimonial cards (photo, name, small line, quote)
 * under the FAQ of the home page (creators) and /agencies (agencies). Hidden while there are none.
 */
export async function Testimonials({ audience, lang, className = "pt-20 md:pt-28" }: { audience: TestimonialAudience; lang: Locale; className?: string }) {
  // Read at request time (cached for hours), never during the build: the home page shell stays static.
  await connection();
  const items = await getTestimonials(audience, lang).catch((err) => { console.error("[testimonials]", err); return []; });
  if (items.length === 0) return null;
  const t = await getTranslations({ locale: toIntlLocale(lang), namespace: "Testimonials" });
  const title = t(audience);
  return (
    <section aria-labelledby={`testimonials-${audience}`} className={`mx-auto w-full max-w-[1180px] px-4 ${className}`}>
      <div className="mb-8 flex flex-col items-center gap-3 text-center md:mb-10">
        <p className="text-sm font-bold text-blue">{t("eyebrow")}</p>
        <h2 id={`testimonials-${audience}`} className="text-3xl leading-tight font-black text-balance md:text-5xl md:leading-tight">{title}</h2>
      </div>
      <Marquee ariaLabel={title} seconds={Math.max(24, items.length * 9)}>
        {items.map((i) => (
          <li key={i.id} className="flex w-[280px] shrink-0 flex-col items-center gap-3 rounded-[24px] border border-line bg-card p-6 text-center shadow-card md:w-[340px]">
            {i.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={i.photoUrl} alt="" loading="lazy" className="size-16 rounded-full object-cover ring-4 ring-blue/10" />
            ) : (
              <span aria-hidden="true" className="inline-flex size-16 items-center justify-center rounded-full bg-blue/10 text-xl font-black text-blue">{i.name.trim().charAt(0)}</span>
            )}
            <div>
              <p className="font-black">{i.name}</p>
              {i.role && <p className="text-xs text-muted">{i.role}</p>}
            </div>
            <Quote aria-hidden="true" size={20} className="text-blue/40" />
            <blockquote className="text-[15px] leading-8 text-muted">{i.quote}</blockquote>
          </li>
        ))}
      </Marquee>
    </section>
  );
}
