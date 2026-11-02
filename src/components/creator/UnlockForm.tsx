"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { unlockPage } from "@/app/[locale]/(creator)/[username]/actions";

/** Password field on the private-view card; a correct password sets the unlock cookie and reloads the page. */
export function UnlockForm({ username }: { username: string }) {
  const t = useTranslations("CreatorPage");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        start(async () => {
          const r = await unlockPage(username, password);
          if (r.ok) window.location.reload();
          else setError(t(r.error === "limit" ? "privateLimit" : "privateWrong"));
        });
      }}
    >
      <label htmlFor="page-password" className="text-[13px] font-medium">{t("privatePassword")}</label>
      <div className="flex gap-2">
        <input
          id="page-password" type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={64} required
          aria-invalid={!!error} aria-describedby={error ? "page-password-error" : undefined}
          className="h-11 min-w-0 flex-1 rounded-[12px] border border-[var(--page-line)] bg-[var(--page-solid)] px-3 text-base text-[var(--page-text)] outline-none focus:ring-2 focus:ring-[var(--page-accent)]"
        />
        <button type="submit" disabled={pending || !password} className="inline-flex h-11 shrink-0 items-center rounded-full bg-[var(--page-accent)] px-5 text-sm font-bold text-[var(--page-on-accent)] disabled:opacity-60">
          {pending ? t("privateOpening") : t("privateOpen")}
        </button>
      </div>
      {error && <p id="page-password-error" role="alert" className="text-[13px] font-medium text-[#C0362C]">{error}</p>}
    </form>
  );
}
