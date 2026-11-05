"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { claimPreparedPage, declinePreparedPage } from "./claim-actions";

type Props = { linkId: string; agency: string; username: string; name: string; days: number };

/** A page an agency prepared for this email: pick what the agency may keep editing, then claim it (or decline). */
export function PreparedPage({ linkId, agency, username, name, days }: Props) {
  const t = useTranslations("AgencyDrafts.claim");
  const ta = useTranslations("AgencySection");
  const router = useRouter();
  const [perms, setPerms] = useState({ content: true, rates: true, contact: false });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const claim = () => start(async () => {
    const r = await claimPreparedPage(linkId, perms);
    if (r.ok) router.push("/dashboard"); else setError(t(`errors.${r.error ?? "invalid"}`));
  });
  const decline = () => {
    if (!window.confirm(t("confirmDecline", { agency }))) return;
    start(async () => { await declinePreparedPage(linkId); router.refresh(); });
  };
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-blue/25 bg-blue/5 p-4">
      <p className="flex items-center gap-2 font-bold"><Building2 aria-hidden="true" size={18} className="text-blue" />{t("title", { agency })}</p>
      <p className="text-sm leading-6 text-muted">{t("body", { agency, name, days })}</p>
      <p className="text-sm font-bold" dir="ltr"><span className="rtl:float-right">wsool.link/{username}</span></p>
      <div className="flex flex-col gap-1 rounded-xl bg-card p-3">
        <p className="text-[13px] font-medium">{t("perms")}</p>
        {(["content", "rates", "contact"] as const).map((k) => (
          <Switch key={k} checked={perms[k]} onChange={(v) => setPerms({ ...perms, [k]: v })} label={ta(`perm.${k}`)} hint={ta(`permHelp.${k}`)} />
        ))}
      </div>
      <p className="text-xs text-muted">{t("note")}</p>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={claim} className={buttonClasses("primary")}>{pending ? t("claiming") : t("claim")}</button>
        <button type="button" disabled={pending} onClick={decline} className={buttonClasses("secondary")}>{t("decline")}</button>
      </div>
    </div>
  );
}
