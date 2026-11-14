"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, Mail } from "lucide-react";
import { joinNewsletter } from "@/components/marketing/actions";
import { turnstileToken } from "@/lib/turnstile-client";

/**
 * Newsletter sign-up card above a footer (double opt-in). `list` picks the list, `ns` the texts
 * (title, body, label, cta, done, error); `children` (e.g. "Follow us", "Get the app") sit under a divider.
 */
export function NewsletterCard({ lang, list, source, ns, placeholder, children }: {
  lang: "ar" | "en";
  list: "creators" | "agencies";
  source: string;
  ns: "Agencies.newsletter" | "Site.newsletter";
  placeholder: string;
  children?: ReactNode;
}) {
  const t = useTranslations(ns);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [pending, start] = useTransition();
  const id = `nl-${list}`;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    start(async () => setState((await joinNewsletter(email, lang, source, list, await turnstileToken("newsletter"))).ok ? "done" : "error"));
  };
  return (
    <section className="mx-auto w-full max-w-[1180px] px-4 pb-20">
      <div className="flex flex-col gap-6 rounded-[28px] border border-line bg-card p-6 shadow-card md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex flex-1 items-start gap-4">
            <span aria-hidden="true" className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue/10 text-blue"><Mail size={22} /></span>
            <div>
              <h2 className="text-xl font-black md:text-2xl">{t("title")}</h2>
              <p className="mt-1 text-sm leading-7 text-muted">{t("body")}</p>
            </div>
          </div>
          {state === "done" ? (
            <p role="status" className="flex flex-1 items-center gap-2 rounded-2xl bg-good/10 p-4 text-sm font-bold text-good">
              <CircleCheck aria-hidden="true" size={20} className="shrink-0" /> {t("done")}
            </p>
          ) : (
            <form noValidate onSubmit={submit} className="flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor={id} className="sr-only">{t("label")}</label>
                <input
                  id={id} type="email" required autoComplete="email" dir="ltr" maxLength={254} placeholder={placeholder}
                  value={email} onChange={(e) => { setEmail(e.target.value); setState("idle"); }}
                  aria-invalid={state === "error"} aria-describedby={state === "error" ? `${id}-err` : undefined}
                  className="h-12 min-h-12 min-w-0 flex-1 rounded-full border border-navy/15 bg-card px-5 text-[16px] outline-none focus:border-blue focus:ring-3 focus:ring-blue/15"
                />
                <button type="submit" disabled={pending} className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-blue px-7 text-[15px] font-bold text-on-blue hover:bg-blue/90 disabled:opacity-60">
                  {t("cta")}
                </button>
              </div>
              {state === "error" && <p id={`${id}-err`} role="alert" className="text-sm text-bad">{t("error")}</p>}
            </form>
          )}
        </div>
        {children && <div className="flex flex-col items-stretch gap-6 border-t border-line pt-6 text-center sm:flex-row sm:flex-wrap sm:items-start sm:justify-center sm:gap-12">{children}</div>}
      </div>
    </section>
  );
}
