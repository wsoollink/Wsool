import { getTranslations } from "next-intl/server";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { PLATFORM_NAMES } from "@/config/platforms";
import { SOCIAL_LINKS } from "@/config/site";

/**
 * "Follow us" row for the marketing footer: one icon per non-empty link in
 * SOCIAL_LINKS, opening in a new tab, each with a descriptive accessible name.
 * Placement and styling follow the owner's approved homepage design.
 */
export async function SocialLinks({ className = "" }: { className?: string }) {
  const t = await getTranslations("Site");
  const links = Object.entries(SOCIAL_LINKS).filter(([, url]) => url) as [keyof typeof SOCIAL_LINKS, string][];
  if (links.length === 0) return null;
  return (
    <nav aria-label={t("followUs")} className={className}>
      <p className="mb-2 text-sm font-bold">{t("followUs")}</p>
      <ul className="flex flex-wrap gap-2">
        {links.map(([platform, url]) => (
          <li key={platform}>
            <a
              href={url} target="_blank" rel="noopener noreferrer"
              aria-label={t("followOn", { platform: PLATFORM_NAMES[platform] })}
              className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-card text-navy transition-colors hover:border-blue hover:text-blue"
            >
              <PlatformIcon platform={platform} size={18} />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
