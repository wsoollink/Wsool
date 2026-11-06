import Link from "next/link";
import { Clock } from "lucide-react";
import type { ArticleCard as Card } from "@/lib/academy";

type Labels = { category: string; minutes: string; date: string };

/** One article in a list: cover (or a coloured block with the category), category, title, summary, time to read. */
export function ArticleCard({ a, labels, big = false }: { a: Card; labels: Labels; big?: boolean }) {
  return (
    <article className={`group flex flex-col overflow-hidden rounded-card border border-line bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-lg ${big ? "md:flex-row" : ""}`}>
      <Link href={`/academy/${a.slug}`} className={`relative block shrink-0 overflow-hidden bg-blue/10 ${big ? "aspect-[16/9] md:aspect-auto md:w-1/2" : "aspect-[16/9]"}`} tabIndex={-1} aria-hidden="true">
        {a.coverUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={a.coverUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" />
          : <span className="ac-cover-fallback flex size-full items-center justify-center p-6 text-center text-lg font-black text-white">{labels.category}</span>}
      </Link>
      <div className={`flex flex-1 flex-col gap-2 p-5 ${big ? "md:justify-center md:p-8" : ""}`}>
        <span className="w-fit rounded-full bg-blue/10 px-2.5 py-1 text-xs font-bold text-blue">{labels.category}</span>
        <h3 className={`font-black leading-snug ${big ? "text-xl md:text-3xl" : "text-lg"}`}>
          <Link href={`/academy/${a.slug}`} className="hover:text-blue">{a.title}</Link>
        </h3>
        {a.summary && <p className={`text-sm leading-7 text-muted ${big ? "md:text-base" : "line-clamp-3"}`}>{a.summary}</p>}
        <p className="mt-auto flex items-center gap-1.5 pt-2 text-xs text-muted">
          <Clock aria-hidden="true" size={13} /> {labels.minutes} · <time dateTime={a.publishedAt?.toISOString()}>{labels.date}</time>
        </p>
      </div>
    </article>
  );
}
