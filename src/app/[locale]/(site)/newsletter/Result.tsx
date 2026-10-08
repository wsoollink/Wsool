import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/** Confirmation / unsubscribe result card. */
export async function Result({ kind }: { kind: "confirmed" | "invalid" | "unsubscribed" }) {
  const t = await getTranslations("Newsletter");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <Card className="flex flex-col items-start gap-3 p-6">
        <h1 className="text-2xl font-bold">{t(`${kind}.title`)}</h1>
        <p className="text-sm text-muted">{t(`${kind}.body`)}</p>
        <Link href="/" className={buttonClasses("secondary")}>{t("home")}</Link>
      </Card>
    </main>
  );
}
