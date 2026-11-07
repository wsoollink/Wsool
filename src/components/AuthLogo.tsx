import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

/** The Wsool logo above the sign-in and pick-a-name cards, linking back to the home page (owner QA, Nov 2026). */
export function AuthLogo({ lang }: { lang: "ar" | "en" }) {
  return (
    <Link href="/" aria-label={lang === "en" ? "Wsool home" : "الصفحة الرئيسية لوصول"} className="mx-auto mb-6 inline-flex min-h-11 items-center rounded-lg">
      <BrandLogo lang={lang} alt="" className="h-9 w-auto" priority />
    </Link>
  );
}
