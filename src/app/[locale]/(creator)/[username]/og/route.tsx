import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchImage } from "@/lib/fetch-capped";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { siteOrigin } from "@/lib/site-url";
import { pageTheme } from "@/components/creator/theme";
import { PLATFORM_ICON_PATHS } from "@/components/creator/PlatformIcon";
import { getDirection, toIntlLocale } from "@/i18n/config";
import { loadCreatorPage } from "@/lib/creator-page";
import { textImage } from "@/lib/og-text";
import { BADGE_CHECK, BADGE_PATH, VERIFIED_BLUE } from "@/lib/verified-badge";
import { agencyTheme } from "@/components/agency-page/theme";
import type { PublicAgency } from "@/lib/agency-page";
import { formatCompact, formatNumber } from "@/lib/format";
import { initials } from "@/lib/initials";
import type { Locale } from "@/i18n/config";

// Link preview image for wsool.link/<username> (1200x630), in the page's
// template colors and language. Served at /<username>/og.

const SIZE = { width: 1200, height: 630 };
const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));
const fontsPromise = Promise.all([
  font("NotoKufiArabic-Regular.ttf"),
  font("NotoKufiArabic-Bold.ttf"),
  font("NotoKufiArabic-Black.ttf"),
]);

const LABELS = {
  ar: { followers: "إجمالي المتابعين" },
  en: { followers: "Total followers" },
} as const;

async function imageDataUrl(src: string | null): Promise<string | null> {
  if (!src) return null;
  try {
    // Images only, size-capped (the route is public).
    const img = await fetchImage(new URL(src, siteOrigin()));
    return img ? `data:${img.type};base64,${img.bytes.toString("base64")}` : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, { params }: RouteContext<"/[locale]/[username]/og">) {
  const { locale, username } = await params;
  // ?lang= from the page's metadata (crawlers send no language); falls back to the page's own rule.
  const asked = request.nextUrl.searchParams.get("lang");
  const { data, lang, agency } = await loadCreatorPage(asked === "ar" || asked === "en" ? asked : locale, username);
  if (agency) return agencyImage(agency, lang);
  if (data?.status !== "published") return new Response("Not found", { status: 404 });

  const [kufi400, kufi700, kufiBlack] = await fontsPromise;
  const theme = pageTheme(data.template, data.accent, data.customColors);
  const rtl = getDirection(lang) === "rtl";
  const tr = data.translations.find((x) => x.lang === lang) ?? data.translations[0];
  const name = tr?.fullName || data.username;
  const total = data.accounts.reduce((sum, a) => sum + a.followers, 0);
  const verified = data.accounts.some((a) => a.verified);
  const photo = await imageDataUrl(data.photoUrl);
  const surface = theme.solid;
  // Text column width: 1200 - padding (2 x 60) - photo (420) - gap (56).
  const textWidth = 604;
  const nameImg = textImage({ text: name, size: 66, color: theme.text, weight: 700, rtl, maxWidth: verified ? textWidth - 68 : textWidth });
  const specialtyImg = tr?.specialty ? textImage({ text: tr.specialty, size: 34, color: theme.accent, rtl, maxWidth: textWidth }) : null;
  const labelImg = textImage({ text: LABELS[lang].followers, size: 26, color: theme.muted, rtl, maxWidth: textWidth, maxLines: 1 });

  const photoBox = (
    <div style={{ display: "flex", width: 420, height: 420, borderRadius: data.photoShape === "circle" ? 210 : 40, overflow: "hidden", background: "linear-gradient(135deg, #0A6CFF, #22B8F0)", flexShrink: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og, not the browser */}
      {photo && <img src={photo} width={420} height={420} alt="" style={{ objectFit: "cover" }} />}
    </div>
  );

  const textColumn = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: rtl ? "flex-end" : "flex-start", flex: 1, gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", flexDirection: rtl ? "row-reverse" : "row", gap: 16, maxWidth: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og */}
        <img src={nameImg.src} width={nameImg.width} height={nameImg.height} alt="" />
        {verified && (
          <svg width="52" height="52" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path d={BADGE_PATH} fill={VERIFIED_BLUE} />
            <path d={BADGE_CHECK} stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og */}
      {specialtyImg && <img src={specialtyImg.src} width={specialtyImg.width} height={specialtyImg.height} alt="" />}
      {data.accounts.length > 0 && <div style={{ display: "flex", flexDirection: "column", alignItems: rtl ? "flex-end" : "flex-start", marginTop: 26, padding: "22px 30px", borderRadius: 28, background: surface, border: `2px solid ${theme.line}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og */}
        {data.showNumbers && total > 0 && <img src={labelImg.src} width={labelImg.width} height={labelImg.height} alt="" />}
        {data.showNumbers && total > 0 && (
          <div style={{ fontFamily: "KufiNumbers", fontSize: 76, fontWeight: 900, color: theme.text }}>
            {new Intl.NumberFormat(toIntlLocale(lang)).format(total)}
          </div>
        )}
        <div style={{ display: "flex", gap: 14, marginTop: data.showNumbers && total > 0 ? 8 : 0, flexDirection: rtl ? "row-reverse" : "row" }}>
          {data.accounts.slice(0, 6).map((a) => (
            <svg key={a.id} width="34" height="34" viewBox="0 0 24 24" fill={theme.text}>
              <path d={PLATFORM_ICON_PATHS[a.platform]} />
            </svg>
          ))}
        </div>
      </div>}
      <div style={{ display: "flex", marginTop: "auto", fontSize: 26, color: theme.muted }}>wsool.link/{data.username}</div>
    </div>
  );

  const image = new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: 60,
          gap: 56,
          alignItems: "center",
          flexDirection: rtl ? "row-reverse" : "row",
          backgroundColor: theme.bg,
          // The renderer crashes on an undefined backgroundImage, so only set it when present.
          ...(theme.bgImage ? { backgroundImage: theme.bgImage } : {}),
          fontFamily: "KufiText",
        }}
      >
        {photoBox}
        {textColumn}
      </div>
    ),
    {
      ...SIZE,
      fonts: [
        { name: "KufiText", data: kufi400, weight: 400 },
        { name: "KufiText", data: kufi700, weight: 700 },
        { name: "KufiNumbers", data: kufiBlack, weight: 900 },
      ],
    },
  );
  // Let the CDN keep it; it is regenerated after a day or a deploy.
  image.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
  return image;
}

const AGENCY_LABELS = {
  ar: { creators: "مؤثر", followers: "متابع", kind: "وكالة تسويق مؤثرين" },
  en: { creators: "creators", followers: "followers", kind: "Influencer marketing agency" },
} as const;

/** Agency page preview: name, tagline and numbers on the hero colour, a 2 × 2 mosaic of creator photos. */
async function agencyImage(agency: PublicAgency, lang: Locale) {
  const [kufi400, kufi700, kufiBlack] = await fontsPromise;
  const theme = agencyTheme(agency.template, agency.accent);
  const rtl = getDirection(lang) === "rtl";
  const L = AGENCY_LABELS[lang];
  const [logo, ...faces] = await Promise.all([imageDataUrl(agency.logoUrl), ...agency.creators.filter((c) => c.photoUrl).slice(0, 4).map((c) => imageDataUrl(c.photoUrl))]);
  const photos = faces.filter((f): f is string => !!f);
  const textWidth = photos.length ? 600 : 1080;
  const initialsImg = textImage({ text: initials(agency.name), size: 26, color: theme.heroOnAccent, weight: 700, rtl, maxWidth: 60, maxLines: 1 });
  const kindImg = textImage({ text: L.kind, size: 24, color: theme.heroAccent, weight: 700, rtl, maxWidth: textWidth, maxLines: 1 });
  const nameImg = textImage({ text: agency.name, size: 68, color: theme.heroInk, weight: 700, rtl, maxWidth: textWidth });
  const taglineImg = agency.tagline ? textImage({ text: agency.tagline, size: 30, color: theme.heroMuted, rtl, maxWidth: textWidth }) : null;
  const statImg = (n: string, label: string) => ({ n: textImage({ text: n, size: 50, color: theme.heroInk, weight: 700, rtl, maxWidth: 360, maxLines: 1, numbers: true }), label: textImage({ text: label, size: 28, color: theme.heroMuted, rtl, maxWidth: 260, maxLines: 1 }) });
  const stats = [
    statImg(formatNumber(agency.stats.creators, lang), L.creators),
    ...(agency.stats.followers ? [statImg(formatCompact(agency.stats.followers, lang), L.followers)] : []),
  ];
  const align = rtl ? "flex-end" : "flex-start";
  const image = new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", padding: 64, gap: 56, alignItems: "center", flexDirection: rtl ? "row-reverse" : "row", backgroundColor: theme.heroBg, backgroundImage: `radial-gradient(circle at ${rtl ? "0%" : "100%"} 0%, ${theme.heroAccent}55, transparent 55%)`, fontFamily: "KufiText" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: align, flex: 1, gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexDirection: rtl ? "row-reverse" : "row" }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- rendered by next/og
              <img src={logo} width={64} height={64} alt="" style={{ borderRadius: 14, background: "#fff", objectFit: "contain" }} />
            ) : (
              <div style={{ display: "flex", width: 64, height: 64, borderRadius: 14, background: theme.heroAccent, alignItems: "center", justifyContent: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og; Arabic text is drawn as outlines */}
                <img src={initialsImg.src} width={initialsImg.width} height={initialsImg.height} alt="" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og */}
            <img src={kindImg.src} width={kindImg.width} height={kindImg.height} alt="" />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og */}
          <img src={nameImg.src} width={nameImg.width} height={nameImg.height} alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og */}
          {taglineImg && <img src={taglineImg.src} width={taglineImg.width} height={taglineImg.height} alt="" />}
          <div style={{ display: "flex", gap: 48, marginTop: 18, flexDirection: rtl ? "row-reverse" : "row" }}>
            {stats.map((s, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: align }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og; "مليون" needs outlines */}
                <img src={s.n.src} width={s.n.width} height={s.n.height} alt="" />
                {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og */}
                <img src={s.label.src} width={s.label.width} height={s.label.height} alt="" />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: "auto", fontSize: 26, color: theme.heroMuted }}>wsool.link/{agency.slug}</div>
        </div>
        {photos.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", width: 420, gap: 16 }}>
            {photos.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- rendered by next/og
              <img key={i} src={p} width={202} height={photos.length > 2 ? 240 : 486} alt="" style={{ borderRadius: 24, objectFit: "cover" }} />
            ))}
          </div>
        )}
      </div>
    ),
    {
      ...SIZE,
      fonts: [
        { name: "KufiText", data: kufi400, weight: 400 },
        { name: "KufiText", data: kufi700, weight: 700 },
        { name: "KufiNumbers", data: kufiBlack, weight: 900 },
      ],
    },
  );
  image.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
  return image;
}
