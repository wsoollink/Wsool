"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { unlockInvestorLink } from "./actions";

export function Unlock({ token }: { token: string }) {
  const t = useTranslations("Finance");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); startTransition(async () => { const res = await unlockInvestorLink(token, password); if (res.ok) router.refresh(); else setError(true); }); }}
      className="flex flex-col gap-3"
    >
      <Lock aria-hidden="true" size={24} className="text-muted" />
      <label htmlFor="inv-password" className="text-sm font-medium">{t("enterPassword")}</label>
      <input id="inv-password" type="password" dir="ltr" value={password} onChange={(e) => { setPassword(e.target.value); setError(false); }} aria-invalid={error} className="min-h-11 rounded-xl border border-line bg-card px-3 text-base aria-[invalid=true]:border-bad" />
      {error && <p role="alert" className="text-sm text-bad">{t("wrongPassword")}</p>}
      <button type="submit" disabled={pending || !password} className={buttonClasses("primary", "self-start")}>{t("open")}</button>
    </form>
  );
}
