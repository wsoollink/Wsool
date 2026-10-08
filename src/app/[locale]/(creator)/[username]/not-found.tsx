"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/Button";

// No creator with this username: invite the visitor to claim it.
export default function CreatorNotFound() {
  const t = useTranslations("CreatorPage");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="brand-gradient bg-clip-text text-3xl font-bold text-transparent">{t("brand")}</p>
      <h1 className="text-2xl font-bold">{t("notFoundTitle")}</h1>
      <p className="text-muted">{t("notFoundBody")}</p>
      <Link href="/login" className={buttonClasses()}>{t("claimCta")}</Link>
    </main>
  );
}
