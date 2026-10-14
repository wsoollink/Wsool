import type { IconStyle, Platform } from "@/generated/prisma/enums";
import { BRAND_COLORS, OUTLINE_ICON_PATHS } from "./icon-styles";
import { PlatformIcon } from "./PlatformIcon";

/**
 * One icon of the social icons row in the creator's chosen style (Appearance):
 * - color: brand-colour rounded square, white glyph (Instagram gradient);
 * - solid: circle in the template's text colour, glyph in its background colour;
 * - outline: outline glyph in the text colour, no background.
 * 44px box (touch target). Decorative: the surrounding link has the name.
 */
export function SocialIcon({ platform, iconStyle, small }: { platform: Platform | "whatsapp"; iconStyle: IconStyle; /** 32px (Appearance previews). */ small?: boolean }) {
  const box = small ? "size-8" : "size-11";
  if (iconStyle === "color") {
    const brand = BRAND_COLORS[platform];
    return (
      <span
        aria-hidden="true"
        className={`inline-flex ${box} items-center justify-center ${small ? "rounded-[10px]" : "rounded-[13px]"} ring-1 ring-[var(--page-line)]`}
        style={{ background: brand.bg, color: brand.fg ?? "#ffffff" }}
      >
        <PlatformIcon platform={platform} size={small ? 16 : 22} />
      </span>
    );
  }
  if (iconStyle === "outline") {
    return (
      <span aria-hidden="true" className={`inline-flex ${box} items-center justify-center text-[var(--page-text)]`}>
        <svg viewBox="0 0 24 24" width={small ? 22 : 28} height={small ? 22 : 28} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          {OUTLINE_ICON_PATHS[platform].map((d) => <path key={d} d={d} />)}
        </svg>
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={`inline-flex ${box} items-center justify-center rounded-full bg-[var(--page-text)] text-[var(--page-bg)]`}>
      <PlatformIcon platform={platform} size={small ? 14 : 19} />
    </span>
  );
}
