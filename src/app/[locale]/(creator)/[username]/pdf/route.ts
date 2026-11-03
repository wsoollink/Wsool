import type { NextRequest } from "next/server";
import { isLocale } from "@/i18n/config";
import { loadCreatorPage, withPrivateView } from "@/lib/creator-page";
import { pageLanguages } from "@/lib/page-language";
import { buildMediaKit } from "@/lib/pdf/media-kit";
import { buildAgencyKit } from "@/lib/pdf/agency-kit";
import { getPublicAgency, type PublicAgency } from "@/lib/agency-page";
import type { Locale } from "@/i18n/config";

/** Agency profile PDF (/<slug>/pdf): ?lang= picks Arabic or English (English falls back to Arabic texts it lacks). */
async function agencyPdf(request: NextRequest, agency: PublicAgency, pageLang: Locale, _locale: string, slug: string) {
  const asked = request.nextUrl.searchParams.get("lang");
  const lang = asked && isLocale(asked) ? asked : pageLang;
  const data = lang === pageLang ? agency : (await getPublicAgency(slug, lang)) ?? agency;
  const bytes = await buildAgencyKit(data, lang);
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${request.nextUrl.searchParams.has("download") ? "attachment" : "inline"}; filename="wsool-${agency.slug}-${lang}.pdf"`,
      "cache-control": "no-store",
    },
  });
}

/**
 * PDF media kit at /<username>/pdf (Pro pages only). ?lang=ar|en picks one of
 * the page's languages; otherwise the same language rule as the page.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/[locale]/[username]/pdf">) {
  const { locale, username } = await params;
  const loaded = await loadCreatorPage(locale, username);
  if (loaded.agency) return agencyPdf(request, loaded.agency, loaded.lang, locale, username);
  const defaultLang = loaded.lang;
  // Private sections are in the PDF only for a visitor who unlocked the private view (same cookie as the page).
  const data = await withPrivateView(loaded.data);
  if (data?.status !== "published" || !data.isPro || data.privacy.locked) return new Response("Not found", { status: 404 });

  const asked = request.nextUrl.searchParams.get("lang");
  const lang = asked && isLocale(asked) && pageLanguages(data.primaryLang, data.enEnabled).includes(asked) ? asked : defaultLang;
  const bytes = await buildMediaKit(data, lang);
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${request.nextUrl.searchParams.has("download") ? "attachment" : "inline"}; filename="wsool-${data.username}-${lang}.pdf"`,
      // Always the latest page data (the creator downloads right after editing).
      "cache-control": "no-store",
    },
  });
}
