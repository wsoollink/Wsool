import Image from "next/image";

/**
 * The Wsool logo for the site, dashboard and admin: the dark-mode file has the
 * word in white (public/brand/logo-*-dark.png), the mark is unchanged.
 */
export function BrandLogo({ lang, alt, className = "h-8 w-auto", priority }: { lang: "ar" | "en"; alt: string; className?: string; priority?: boolean }) {
  const base = `/brand/logo-${lang === "en" ? "en" : "ar"}`;
  return (
    <>
      <Image src={`${base}.png`} alt={alt} width={96} height={32} className={`${className} dark:hidden`} priority={priority} />
      <Image src={`${base}-dark.png`} alt={alt} width={96} height={32} className={`${className} hidden dark:block`} priority={priority} />
    </>
  );
}
