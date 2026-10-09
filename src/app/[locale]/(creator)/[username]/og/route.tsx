import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { siteOrigin } from "@/lib/site-url";
import { pageTheme } from "@/components/creator/theme";
import { PLATFORM_ICON_PATHS } from "@/components/creator/PlatformIcon";
import { getDirection, toIntlLocale } from "@/i18n/config";
import { loadCreatorPage } from "@/lib/creator-page";
import { textImage } from "@/lib/og-text";

// Link preview image for wsool.link/<username> (1200x630), in the page's
// template colors and language. Served at /<username>/og.

const SIZE = { width: 1200, height: 630 };
const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));
const fontsPromise = Promise.all([
  font("NotoKufiArabic-Regular.ttf"),
  font("NotoKufiArabic-Bold.ttf"),
  font("unbounded-latin-700-normal.woff"),
]);

const LABELS = {
  ar: { followers: "إجمالي المتابعين" },
  en: { followers: "Total followers" },
} as const;

async function imageDataUrl(src: string | null): Promise<string | null> {
  if (!src) return null;
  try {
    const res = await fetch(new URL(src, siteOrigin()));
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/png";
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(_request: NextRequest, { params }: RouteContext<"/[locale]/[username]/og">) {
  const { locale, username } = await params;
  const { data, lang } = await loadCreatorPage(locale, username);
  if (data?.status !== "published") return new Response("Not found", { status: 404 });

  const [kufi400, kufi700, unbounded] = await fontsPromise;
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
    <div style={{ display: "flex", width: 420, height: 420, borderRadius: 40, overflow: "hidden", background: "linear-gradient(135deg, #0A6CFF, #22B8F0)", flexShrink: 0 }}>
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
            <circle cx="12" cy="12" r="11" fill={theme.accent} />
            <path d="M7 12.5l3.2 3.2L17 9" stroke={theme.onAccent} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og */}
      {specialtyImg && <img src={specialtyImg.src} width={specialtyImg.width} height={specialtyImg.height} alt="" />}
      <div style={{ display: "flex", flexDirection: "column", alignItems: rtl ? "flex-end" : "flex-start", marginTop: 26, padding: "22px 30px", borderRadius: 28, background: surface, border: `2px solid ${theme.line}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og */}
        <img src={labelImg.src} width={labelImg.width} height={labelImg.height} alt="" />
        <div style={{ fontFamily: "Unbounded", fontSize: 76, fontWeight: 700, color: theme.text }}>
          {new Intl.NumberFormat(toIntlLocale(lang)).format(total)}
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 8, flexDirection: rtl ? "row-reverse" : "row" }}>
          {data.accounts.slice(0, 6).map((a) => (
            <svg key={a.id} width="34" height="34" viewBox="0 0 24 24" fill={theme.text}>
              <path d={PLATFORM_ICON_PATHS[a.platform]} />
            </svg>
          ))}
        </div>
      </div>
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
        { name: "Unbounded", data: unbounded, weight: 700 },
      ],
    },
  );
  // Let the CDN keep it; it is regenerated after a day or a deploy.
  image.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
  return image;
}
