import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth";
import { GoogleSignIn, OAuthError } from "./GoogleSignIn";
import { LoginForm } from "./LoginForm";

async function RedirectIfSignedIn() {
  if (await getCurrentUser()) redirect("/dashboard");
  return null;
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("Login");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <Card className="flex flex-col gap-5 p-6">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <Suspense fallback={null}><OAuthError searchParams={searchParams} /></Suspense>
        <Suspense fallback={null}><GoogleSignIn /></Suspense>
        <LoginForm />
        <p className="text-xs leading-6 text-muted">
          {t.rich("agree", {
            terms: (c) => <Link href="/terms" className="font-semibold text-blue underline underline-offset-2">{c}</Link>,
            privacy: (c) => <Link href="/privacy" className="font-semibold text-blue underline underline-offset-2">{c}</Link>,
          })}
        </p>
      </Card>
    </main>
  );
}
