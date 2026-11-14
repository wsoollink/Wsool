import { SocialLinks } from "@/components/site/SocialLinks";
import { NewsletterCard } from "@/components/site/NewsletterCard";

/** Agencies newsletter sign-up above the agencies footer (the agencies list, double opt-in) + "Follow us". */
export function AgenciesNewsletter({ lang }: { lang: "ar" | "en" }) {
  return (
    <NewsletterCard lang={lang} list="agencies" source="agencies" ns="Agencies.newsletter" placeholder="name@agency.com">
      <SocialLinks className="[&_ul]:justify-center [&_ul]:flex-nowrap [&_ul]:gap-1.5 [&_li]:min-w-0 [&_li]:flex-[0_1_44px] [&_a]:size-auto [&_a]:aspect-square [&_a]:w-full" />
    </NewsletterCard>
  );
}
