"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, Mail } from "lucide-react";
import { joinNewsletter } from "@/components/marketing/actions";

/** Agencies newsletter sign-up above the agencies footer (the agencies list, double opt-in). */
export function AgenciesNewsletter({ lang }: { lang: "ar" | "en" }) {
  const t = useTranslations("Agencies.newsletter");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [pending, start] = useTransition();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    start(async () => setState((await joinNewsletter(email, lang, "agencies", "agencies")).ok ? "done" : "error"));
  };
  return (
    <section className="mx-auto max-w-[1180px] px-4 pb-20">
      <div className="flex flex-col gap-6 rounded-[28px] border border-line bg-card p-6 shadow-card md:flex-row md:items-center md:p-10">
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
              <label htmlFor="ag-nl" className="sr-only">{t("label")}</label>
              <input
                id="ag-nl" type="email" required autoComplete="email" dir="ltr" maxLength={254} placeholder="name@agency.com"
                value={email} onChange={(e) => { setEmail(e.target.value); setState("idle"); }}
                aria-invalid={state === "error"} aria-describedby={state === "error" ? "ag-nl-err" : undefined}
                className="h-12 min-h-12 min-w-0 flex-1 rounded-full border border-navy/15 bg-card px-5 text-[16px] outline-none focus:border-blue focus:ring-3 focus:ring-blue/15"
              />
              <button type="submit" disabled={pending} className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-blue px-7 text-[15px] font-bold text-on-blue hover:bg-blue/90 disabled:opacity-60">
                {t("cta")}
              </button>
            </div>
            {state === "error" && <p id="ag-nl-err" role="alert" className="text-sm text-bad">{t("error")}</p>}
          </form>
        )}
      </div>
    </section>
  );
}
