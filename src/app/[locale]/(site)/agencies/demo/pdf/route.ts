import type { NextRequest } from "next/server";
import { isLocale } from "@/i18n/config";
import { buildDemoAgency } from "@/lib/demo-agency";
import { buildAgencyKit } from "@/lib/pdf/agency-kit";

/** PDF of the demo agency page (/agencies/demo/pdf?lang=). */
export async function GET(request: NextRequest, { params }: RouteContext<"/[locale]/agencies/demo/pdf">) {
  const { locale } = await params;
  const asked = request.nextUrl.searchParams.get("lang");
  const lang = asked && isLocale(asked) ? asked : isLocale(locale) ? locale : "ar";
  const bytes = await buildAgencyKit(buildDemoAgency(lang), lang);
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${request.nextUrl.searchParams.has("download") ? "attachment" : "inline"}; filename="wsool-demo-agency-${lang}.pdf"`,
      "cache-control": "public, max-age=3600",
    },
  });
}
