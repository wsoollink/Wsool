import type { NextRequest } from "next/server";
import { isLocale } from "@/i18n/config";
import { loadCreatorPage } from "@/lib/creator-page";
import { pageLanguages } from "@/lib/page-language";
import { buildMediaKit } from "@/lib/pdf/media-kit";

/**
 * PDF media kit at /<username>/pdf (Pro pages only). ?lang=ar|en picks one of
 * the page's languages; otherwise the same language rule as the page.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/[locale]/[username]/pdf">) {
  const { locale, username } = await params;
  const { data, lang: defaultLang } = await loadCreatorPage(locale, username);
  if (data?.status !== "published" || !data.isPro) return new Response("Not found", { status: 404 });

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
