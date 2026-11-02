"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Circle, Search } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { saveDirectory } from "./actions";

type Ready = { published: boolean; photo: boolean; category: boolean };

/** Opt-in to the creator directory companies search (owner, Nov 2026). Off by default. */
export function DirectoryCard({ initial, ready, stats }: { initial: boolean; ready: Ready; stats: { impressions: number; opens: number } }) {
  const t = useTranslations("PrivatePage.directory");
  const [on, setOn] = useState(initial);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const allReady = ready.published && ready.photo && ready.category;
  const fix = { published: "/dashboard/edit", photo: "/dashboard/edit", category: "/dashboard/edit" } as const;
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 font-bold"><Search aria-hidden="true" size={18} className="text-blue" />{t("title")}</h2>
      <p className="text-sm text-muted">{t("hint")}</p>
      <Switch
        checked={on} disabled={pending}
        onChange={(v) => { setOn(v); setError(false); start(async () => { const r = await saveDirectory(v); if (!r.ok) { setOn(!v); setError(true); } }); }}
        label={t("switch")} hint={t("switchHint")}
      />
      {error && <p role="alert" className="text-sm text-bad">{t("failed")}</p>}
      {on && !allReady && (
        <div className="flex flex-col gap-1.5 rounded-[12px] border border-warn/30 bg-warn/5 p-3">
          <p className="text-sm font-semibold text-warn">{t("notYet")}</p>
          <ul className="flex flex-col gap-1">
            {(["published", "photo", "category"] as const).map((k) => (
              <li key={k} className="flex items-center gap-2 text-sm">
                {ready[k] ? <Check aria-hidden="true" size={15} className="text-good" /> : <Circle aria-hidden="true" size={15} className="text-muted" />}
                {ready[k] ? t(`need.${k}`) : <Link href={fix[k]} className="font-semibold text-blue">{t(`need.${k}`)}</Link>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {on && allReady && <p className="text-sm font-semibold text-good">{t("listed")}</p>}
      {(stats.impressions > 0 || stats.opens > 0) && (
        <p className="text-xs text-muted">{t("stats", { shown: stats.impressions, opened: stats.opens })}</p>
      )}
    </Card>
  );
}
