"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, Check, Unlink, X } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { acceptAgency, declineAgency, unlinkAgency, updateAgencyPerms } from "./actions";

type Perms = { content: boolean; rates: boolean; contact: boolean };
const KEYS = ["content", "rates", "contact"] as const;

function PermRows({ value, onChange, disabled }: { value: Perms; onChange: (p: Perms) => void; disabled?: boolean }) {
  const t = useTranslations("AgencySection");
  return (
    <ul className="flex flex-col divide-y divide-line-soft rounded-xl border border-line">
      {KEYS.map((k) => (
        <li key={k} className="px-4 py-1.5">
          <Switch id={`perm-${k}`} checked={value[k]} disabled={disabled} label={t(`perm.${k}`)} hint={t(`permHelp.${k}`)} onChange={(on) => onChange({ ...value, [k]: on })} />
        </li>
      ))}
    </ul>
  );
}

/** A pending invite: the creator settles the permissions, then accepts or declines. */
export function InviteCard({ linkId, agency, requested }: { linkId: string; agency: string; requested: Perms }) {
  const t = useTranslations("AgencySection");
  const router = useRouter();
  const [perms, setPerms] = useState(requested);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<{ ok?: true }>) => start(async () => { setError(""); const r = await fn(); if (r.ok) router.refresh(); else setError(t("error")); });
  return (
    <section className="flex flex-col gap-4 rounded-card border-2 border-blue/30 bg-card p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue/10 text-blue"><Building2 aria-hidden="true" size={20} /></span>
        <div>
          <h2 className="font-bold">{t("inviteTitle", { agency })}</h2>
          <p className="text-sm leading-6 text-muted">{t("inviteBody", { agency })}</p>
        </div>
      </div>
      <PermRows value={perms} onChange={setPerms} disabled={pending} />
      <p className="text-xs text-good">{t("proNote")}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => act(() => acceptAgency(linkId, perms))} className={buttonClasses("primary")}>
          <Check aria-hidden="true" size={16} /> {pending ? t("accepting") : t("accept")}
        </button>
        <button type="button" disabled={pending} onClick={() => act(() => declineAgency(linkId))} className={buttonClasses("secondary")}>
          <X aria-hidden="true" size={16} /> {t("decline")}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </section>
  );
}

/** The active agency: permissions saved on each switch, and unlinking. */
export function ActiveAgency({ agency, initial, graceDays }: { agency: string; initial: Perms; graceDays: number }) {
  const t = useTranslations("AgencySection");
  const router = useRouter();
  const [perms, setPerms] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const change = (p: Perms) => {
    const before = perms;
    setPerms(p);
    start(async () => {
      const r = await updateAgencyPerms(p);
      if (r.ok) setMsg(t("saved")); else { setPerms(before); setMsg(t("error")); }
    });
  };
  return (
    <div className="flex flex-col gap-4">
      <PermRows value={perms} onChange={change} disabled={pending} />
      {msg && <p role="status" className="text-sm text-good">{msg}</p>}
      <p className="text-xs leading-6 text-muted">{t("never")}</p>
      <div className="flex flex-col items-start gap-1.5 border-t border-line-soft pt-4">
        <button
          type="button" disabled={pending}
          onClick={() => {
            if (!window.confirm(t("confirmUnlink", { agency }))) return;
            start(async () => { const r = await unlinkAgency(); if (r.ok) router.refresh(); else setMsg(t("error")); });
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-bad/30 px-5 text-sm font-bold text-bad hover:bg-bad/5"
        >
          <Unlink aria-hidden="true" size={16} /> {t("unlink")}
        </button>
        <p className="text-xs text-muted">{t("graceNote", { days: graceDays })}</p>
      </div>
    </div>
  );
}
