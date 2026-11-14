import { getTranslations } from "next-intl/server";
import { APP_LINKS } from "@/config/site";

/** "Get the app": the store badges (same images as the home page); a badge without a store link is a plain image. */
export async function AppBadges() {
  const t = await getTranslations("Site");
  const badges = [
    { href: APP_LINKS.ios, src: "/marketing/app-store-badge.png", alt: "Download on the App Store" },
    { href: APP_LINKS.android, src: "/marketing/google-play-badge.png", alt: "Get it on Google Play" },
  ];
  return (
    <div>
      <p className="mb-2 text-sm font-bold">{t("getApp")}</p>
      <div className="flex justify-center gap-2" dir="ltr">
        {badges.map((b) => {
          // eslint-disable-next-line @next/next/no-img-element
          const img = <img src={b.src} alt={b.alt} className="block h-10 w-auto rounded-md ring-1 ring-navy/15" />;
          return b.href
            ? <a key={b.src} href={b.href} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-md">{img}</a>
            : <span key={b.src}>{img}</span>;
        })}
      </div>
    </div>
  );
}
