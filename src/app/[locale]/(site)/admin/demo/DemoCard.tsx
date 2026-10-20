"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { refreshDemoPage } from "./actions";

/** Owner card on the admin overview: open / rebuild the demo creator page. */
export function DemoCard() {
  const t = useTranslations("Admin.overview");
  const [status, setStatus] = useState<"" | "done" | "failed">("");
  const [pending, start] = useTransition();
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue/10 text-blue"><Sparkles aria-hidden="true" size={18} /></span>
        <div>
          <p className="text-[14px] font-bold">{t("demoTitle")}</p>
          <p className="text-[13px] text-muted">{t("demoHint")}</p>
          <p role="status" className={`text-[13px] ${status === "failed" ? "text-bad" : "text-good"}`}>{status === "done" ? t("demoDone") : status === "failed" ? t("demoFailed") : ""}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href="/demo" target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary")}><ExternalLink aria-hidden="true" size={15} />{t("demoOpen")}</a>
        <button
          type="button" disabled={pending} aria-busy={pending} className={buttonClasses("primary")}
          onClick={() => start(async () => setStatus((await refreshDemoPage()).ok ? "done" : "failed"))}
        >
          <RefreshCw aria-hidden="true" size={15} className={pending ? "motion-safe:animate-spin" : ""} />{t("demoRefresh")}
        </button>
      </div>
    </Card>
  );
}
