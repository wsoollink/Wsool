"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { createAgency, declineRequest, openFromRequest, stopAgency, deleteAgency, setAgencyPlan } from "./actions";

const field = "h-11 w-full min-w-0 rounded-[10px] border border-navy/15 bg-card px-3 text-[15px] outline-none shadow-card focus:border-blue focus:ring-3 focus:ring-blue/15";

export function CreateAgency() {
  const t = useTranslations("Admin.agencies");
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<"agency" | "brand">("agency");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createAgency(name, email, kind);
          if (r.ok) { setMsg({ ok: true, text: t("created") }); setName(""); setEmail(""); router.refresh(); }
          else setMsg({ ok: false, text: t(`errors.${r.error ?? "invalid"}`) });
        });
      }}
      className="flex flex-col gap-3"
    >
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1.5 text-[13px] font-medium">{t("kind")}</legend>
        {(["agency", "brand"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
            className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold ${kind === k ? "bg-blue/10 text-blue ring-1 ring-blue/30" : "bg-card text-muted ring-1 ring-line"}`}>
            {t(`kinds.${k}`)}
          </button>
        ))}
      </fieldset>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium">{t("name")}
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium">{t("ownerEmail")}
          <input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required className={`${field} rtl:text-end`} />
        </label>
      </div>
      <p className="text-xs text-muted">{t("hint")}</p>
      <button type="submit" disabled={pending} className={buttonClasses("primary", "self-start")}><Plus aria-hidden="true" size={16} /> {t("create")}</button>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-good" : "text-bad"}`}>{msg.text}</p>}
    </form>
  );
}

export function StopAgency({ id, name }: { id: string; name: string }) {
  const t = useTranslations("Admin.agencies");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button" disabled={pending}
      onClick={() => { if (window.confirm(t("confirmStop", { name }))) start(async () => { await stopAgency(id); router.refresh(); }); }}
      className="inline-flex min-h-10 items-center rounded-full px-3 text-[13px] font-bold text-bad hover:bg-bad/5"
    >
      {t("stop")}
    </button>
  );
}

/** Open the account from a request (as an agency or a brand) or close the request. */
export function RequestActions({ id, agency }: { id: string; agency: string }) {
  const t = useTranslations("Admin.agencies");
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const open = (kind: "agency" | "brand") => start(async () => {
    setError("");
    const r = await openFromRequest(id, kind);
    if (r.ok) router.refresh(); else setError(t(`errors.${r.error ?? "invalid"}`));
  });
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" disabled={pending} onClick={() => open("agency")} className={buttonClasses("primary")}>{t("openAgency")}</button>
      <button type="button" disabled={pending} onClick={() => open("brand")} className={buttonClasses("secondary")}>{t("openBrand")}</button>
      <button
        type="button" disabled={pending}
        onClick={() => { if (window.confirm(t("confirmDecline", { name: agency }))) start(async () => { await declineRequest(id); router.refresh(); }); }}
        className="inline-flex min-h-10 items-center rounded-full px-3 text-[13px] font-bold text-bad hover:bg-bad/5"
      >
        {t("decline")}
      </button>
      {error && <p role="alert" className="w-full text-sm text-bad">{error}</p>}
    </div>
  );
}

/** The agency's plan (set by the owner after the agency pays): plan, cycle and end date. */
export function AgencyPlanEditor({ id, plan, cycle, until }: { id: string; plan: string; cycle: string | null; until: string }) {
  const t = useTranslations("Admin.agencies");
  const tb = useTranslations("AgencyBilling");
  const router = useRouter();
  const [v, setV] = useState({ plan, cycle: cycle ?? "monthly", until });
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const field = "h-10 rounded-[10px] border border-navy/15 bg-card px-2.5 text-[15px]";
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-muted">{t("plan")}
        <select className={field} value={v.plan} onChange={(e) => setV({ ...v, plan: e.target.value })}>
          {(["trial", "starter", "growth", "custom"] as const).map((p) => <option key={p} value={p}>{tb(`plan.${p}`)}</option>)}
        </select>
      </label>
      {v.plan !== "trial" && (
        <label className="flex flex-col gap-1 text-xs text-muted">{t("cycle")}
          <select className={field} value={v.cycle} onChange={(e) => setV({ ...v, cycle: e.target.value })}>
            {(["monthly", "yearly"] as const).map((c) => <option key={c} value={c}>{tb(`cycle.${c}`)}</option>)}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1 text-xs text-muted">{t("until")}
        <input type="date" className={field} value={v.until} onChange={(e) => setV({ ...v, until: e.target.value })} />
      </label>
      <button type="button" disabled={pending}
        onClick={() => start(async () => { setMsg(""); const r = await setAgencyPlan(id, v.plan, v.plan === "trial" ? null : v.cycle, v.until); setMsg(r.ok ? t("planSaved") : t("errors.invalid")); router.refresh(); })}
        className="inline-flex h-10 items-center rounded-full bg-navy px-4 text-[13px] font-bold text-on-navy disabled:opacity-60">{t("savePlan")}</button>
      {msg && <span role="status" className="text-xs text-muted">{msg}</span>}
    </div>
  );
}

/** Permanently delete a stopped agency (its emails can then open a new account). */
export function DeleteAgency({ id, name }: { id: string; name: string }) {
  const t = useTranslations("Admin.agencies");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button" disabled={pending}
      onClick={() => { if (window.confirm(t("confirmDelete", { name }))) start(async () => { await deleteAgency(id); router.refresh(); }); }}
      className="inline-flex min-h-10 items-center rounded-full px-3 text-[13px] font-bold text-bad hover:bg-bad/5"
    >
      {t("delete")}
    </button>
  );
}
