import { getTranslations } from "next-intl/server";
import { SubmitButton } from "@/components/SubmitButton";
import { appleSignInEnabled, googleSignInEnabled } from "@/lib/google-auth";
import { Suspense } from "react";
import { signInWithApple, signInWithGoogle } from "./actions";
import { NextField } from "./NextField";

/** Google's "G" mark (official colors), for the sign-in button. */
function GoogleMark() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** Apple's logo (one colour, follows the button text), for the sign-in button. */
function AppleMark() {
  return (
    <svg aria-hidden="true" width="18" height="20" viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788 341c-6 4-108 62-108 190 0 149 131 202 135 203-1 3-21 72-69 142-43 62-88 124-156 124s-86-40-164-40c-77 0-104 41-167 41s-106-57-156-128C45 790 0 664 0 545c0-191 124-292 246-292 65 0 119 43 160 43 39 0 100-45 174-45 28 0 129 3 196 99zM558 159c31-37 53-88 53-139 0-7-1-14-2-20-50 2-110 34-146 76-28 32-55 83-55 135 0 8 1 16 2 18 3 1 9 2 14 2 45 0 101-30 134-72z" />
    </svg>
  );
}

/**
 * "Continue with Google" / "Continue with Apple" + an "or" divider. Each button is hidden until its provider is
 * switched on in Supabase, so turning one on needs no code change.
 */
export async function GoogleSignIn() {
  const [google, apple] = await Promise.all([googleSignInEnabled(), appleSignInEnabled()]);
  if (!google && !apple) return null;
  const t = await getTranslations("Login");
  return (
    <>
      {google && (
        <form action={signInWithGoogle}>
          <Suspense fallback={null}><NextField /></Suspense>
          <SubmitButton variant="secondary" className="w-full gap-3" pendingText={t("googleRedirecting")}>
            <GoogleMark /> {t("google")}
          </SubmitButton>
        </form>
      )}
      {apple && (
        <div className="flex flex-col gap-1.5">
          <form action={signInWithApple}>
            <Suspense fallback={null}><NextField /></Suspense>
            {/* Apple's rule: a black button (white in dark mode) with its logo. */}
            <SubmitButton className="w-full gap-3 !border-transparent !bg-black !text-white hover:!bg-black/85 dark:!bg-white dark:!text-black dark:hover:!bg-white/85" pendingText={t("appleRedirecting")}>
              <AppleMark /> {t("apple")}
            </SubmitButton>
          </form>
          {/* "Hide my email" gives a relay address, so an invite sent to the real email wouldn't match it. */}
          <p className="text-xs leading-5 text-muted">{t("appleInviteNote")}</p>
        </div>
      )}
      <div className="flex items-center gap-3 text-xs text-muted" role="separator">
        <span className="h-px flex-1 bg-navy/10" /> {t("or")} <span className="h-px flex-1 bg-navy/10" />
      </div>
    </>
  );
}

/** Message when Google / Apple sign-in came back with an error (/login?error=google|apple). */
export async function OAuthError({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const error = (await searchParams).error;
  if (error !== "google" && error !== "apple") return null;
  const t = await getTranslations("Login");
  return <p role="alert" className="rounded-xl bg-bad/5 p-3 text-sm text-bad">{t(`errors.${error}`)}</p>;
}
