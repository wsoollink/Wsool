"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Landmark, Repeat } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { savePayoutSettings } from "./actions";

type Props = { method: "credit" | "bank"; maskedIban: string | null; holderName: string; minBank: string };

/** "How do you want your commission?" credit on renewals, or bank transfer (IBAN + name). */
export function PayoutForm({ method: initialMethod, maskedIban: initialMasked, holderName: initialName, minBank }: Props) {
  const t = useTranslations("Referrals");
  const [method, setMethod] = useState(initialMethod);
  const [masked, setMasked] = useState(initialMasked);
  const [iban, setIban] = useState("");
  const [holderName, setHolderName] = useState(initialName);
  const [errors, setErrors] = useState<{ iban?: boolean; holderName?: boolean }>({});
  const [status, setStatus] = useState<"" | "saved" | "failed">("");
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await savePayoutSettings({ method, iban, holderName });
      if (res.errors) {
        setErrors(res.errors);
        return setStatus("failed");
      }
      setErrors({});
      setMasked(res.maskedIban ?? null);
      setIban("");
      setStatus("saved");
    });

  const options = [
    { key: "credit" as const, icon: Repeat, title: t("method.credit"), body: t("creditHint") },
    { key: "bank" as const, icon: Landmark, title: t("method.bank"), body: t("bankHint", { min: minBank }) },
  ];

  return (
    <Panel title={t("payoutTitle")} bodyClassName="flex flex-col gap-4">
      <div role="radiogroup" aria-label={t("payoutTitle")} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.key} type="button" role="radio" aria-checked={method === o.key}
            onClick={() => { setMethod(o.key); setStatus(""); }}
            className={`flex min-h-11 flex-col items-start gap-1 rounded-xl border p-3 text-start ${method === o.key ? "border-blue bg-blue/5 ring-1 ring-blue/30" : "border-line hover:bg-hover"}`}
          >
            <span className="flex items-center gap-2 text-sm font-bold"><o.icon aria-hidden="true" size={16} />{o.title}</span>
            <span className="text-xs text-muted">{o.body}</span>
          </button>
        ))}
      </div>

      {method === "bank" && (
        <div className="flex flex-col gap-3">
          <TextField
            id="ref-iban" label={t("iban")} dir="ltr" autoComplete="off" inputMode="text" maxLength={42}
            placeholder={masked ?? "SA00 0000 0000 0000 0000 0000"} value={iban}
            onChange={(e) => { setIban(e.target.value.toUpperCase()); setStatus(""); }}
            hint={masked ? t("ibanSaved", { iban: masked }) : t("ibanHint")}
            error={errors.iban ? t("ibanError") : undefined}
          />
          <TextField
            id="ref-holder" label={t("holderName")} autoComplete="name" maxLength={100} value={holderName}
            onChange={(e) => { setHolderName(e.target.value); setStatus(""); }}
            error={errors.holderName ? t("holderError") : undefined}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={pending}>{pending ? t("saving") : t("save")}</Button>
        <span aria-live="polite" className={`text-sm ${status === "failed" ? "text-bad" : "text-good"}`}>
          {status === "saved" ? t("saved") : status === "failed" ? t("saveFailed") : ""}
        </span>
      </div>
    </Panel>
  );
}
