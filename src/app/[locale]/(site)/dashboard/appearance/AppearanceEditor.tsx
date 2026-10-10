"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Eye, Lock } from "lucide-react";
import { pageTheme } from "@/components/creator/theme";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Template } from "@/generated/prisma/enums";
import { SaveBar } from "@/components/dashboard/SaveBar";
import { Switch } from "@/components/ui/Switch";
import { ACCENT_SWATCHES, TEMPLATES, type AppearanceInput } from "@/lib/validation/appearance";
import { saveAppearance } from "./actions";
import { Preview, type PreviewData } from "./Preview";

type Value = AppearanceInput & { customColors: NonNullable<AppearanceInput["customColors"]> };
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Template, colors, number font and Wsool footer, with a live preview (dashboard design). */
export function AppearanceEditor({ initial, isPro, freeTemplates, preview }: { initial: Value; isPro: boolean; freeTemplates: readonly string[]; preview: PreviewData }) {
  const t = useTranslations("AppearancePage");
  const [value, setValue] = useState<Value>(initial);
  const [status, setStatus] = useState<"" | "saved" | "failed" | "pro_only" | "locked">("");
  const [pending, startTransition] = useTransition();
  const [showPreview, setShowPreview] = useState(false);
  const set = (patch: Partial<Value>) => { setValue({ ...value, ...patch }); setStatus(""); };
  const locked = (tpl: string) => !isPro && !freeTemplates.includes(tpl);
  const custom = value.customColors;
  const current = pageTheme(value.template as Template, null, value.template === "custom" ? custom : null);

  const save = () => {
    if (locked(value.template) || (!isPro && value.hideBranding)) return setStatus("locked");
    startTransition(async () => {
      const res = await saveAppearance({ ...value, customColors: value.template === "custom" ? custom : null });
      setStatus(res.ok ? "saved" : (res.error ?? "failed"));
    });
  };

  return (
    <div className="grid gap-4 pb-20 md:pb-0 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <div>
            <h2 className="font-bold">{t("template")}</h2>
            <p className="text-xs text-muted">{t("templateHint")}</p>
          </div>
          <div role="radiogroup" aria-label={t("template")} className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
            {TEMPLATES.map((tpl) => {
              const theme = pageTheme(tpl as Template, null, tpl === "custom" ? custom : null);
              const checked = value.template === tpl;
              return (
                <button
                  key={tpl} type="button" role="radio" aria-checked={checked} onClick={() => set({ template: tpl })}
                  className={`flex flex-col gap-2 rounded-2xl border bg-white/72 p-2 text-start ${checked ? "border-blue ring-2 ring-blue/25" : "border-navy/8"}`}
                >
                  <span aria-hidden="true" className="relative flex h-[120px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[10px] px-3" style={{ backgroundColor: theme.bg, backgroundImage: theme.bgImage, backgroundSize: "auto, auto, auto, auto, 14px 14px, 14px 14px" }}>
                    <span className="size-10 rounded-full" style={{ backgroundColor: theme.soft, border: `1px solid ${theme.line}` }} />
                    <span className="h-1.5 w-[58%] rounded-full" style={{ backgroundColor: theme.text }} />
                    <span className="h-1 w-[36%] rounded-full" style={{ backgroundColor: theme.accent }} />
                    <span className="mt-1 grid w-full grid-cols-2 gap-1.5">
                      <span className="h-5 rounded-md" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.line}` }} />
                      <span className="h-5 rounded-md" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.line}` }} />
                    </span>
                    {!freeTemplates.includes(tpl) && (
                      <span className="absolute top-2 end-2 inline-flex h-5 items-center gap-1 rounded-full bg-[rgba(10,12,16,0.75)] px-2 text-[10.5px] font-bold text-white">
                        {locked(tpl) && <Lock size={10} />} {t("paid")}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center justify-between gap-2 px-1">
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[13.5px] font-bold">{t(`templates.${tpl}`)}</span>
                      <span className="truncate text-[11px] text-muted">{t(`fits.${tpl}`)}</span>
                    </span>
                    <span aria-hidden="true" className={`inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 ${checked ? "border-blue" : "border-navy/20"}`}>
                      {checked && <span className="size-2 rounded-full bg-blue" />}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {locked(value.template) && (
            <p className="rounded-xl bg-warn/10 p-3 text-sm text-warn">
              {t("templateLocked")} <Link href="/dashboard/subscription" className="font-semibold underline">{t("upgrade")}</Link>
            </p>
          )}
        </Card>

        {value.template === "custom" && (
          <Card className="flex flex-col gap-3">
            <div>
              <h2 className="font-bold">{t("customColors")}</h2>
              <p className="text-xs text-muted">{t("customHint")}</p>
            </div>
            <ColorField id="custom-1" label={t("mainColor")} value={custom.colors[0]} onChange={(c) => set({ customColors: { ...custom, colors: [c, ...custom.colors.slice(1)] } })} />
            <Switch
              checked={!!custom.colors[1]} label={t("useSecond")}
              onChange={(on) => set({ customColors: { ...custom, colors: on ? [custom.colors[0], "#22b8f0"] : [custom.colors[0]] } })}
            />
            {custom.colors[1] && (
              <ColorField id="custom-2" label={t("secondColor")} value={custom.colors[1]} onChange={(c) => set({ customColors: { ...custom, colors: [custom.colors[0], c] } })} />
            )}
            <div role="group" aria-label={t("mode")} className="grid grid-cols-2 gap-1 rounded-[14px] bg-navy/5 p-1">
              {(["light", "dark"] as const).map((m) => (
                <button key={m} type="button" aria-pressed={custom.mode === m} onClick={() => set({ customColors: { ...custom, mode: m } })} className={`h-11 rounded-[10px] text-[13.5px] font-bold ${custom.mode === m ? "bg-white text-navy shadow-card" : "text-muted"}`}>
                  {t(m)}
                </button>
              ))}
            </div>
          </Card>
        )}

        <Card className="flex flex-col gap-3">
          <div>
            <h2 className="font-bold">{t("accent")}</h2>
            <p className="text-xs text-muted">{t("accentHint")}</p>
          </div>
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={t("accent")}>
            {[{ key: "template", color: current.accent, value: null }, ...ACCENT_SWATCHES.map((s) => ({ key: s.key, color: current.dark ? s.dark : s.light, value: s.light }))].map((s) => {
              const checked = value.accent === s.value;
              return (
                <button
                  key={s.key} type="button" role="radio" aria-checked={checked} aria-label={t(`swatch.${s.key}`)} title={t(`swatch.${s.key}`)}
                  onClick={() => set({ accent: s.value })}
                  className={`size-11 rounded-full p-[3px] ${checked ? "ring-2 ring-navy" : "ring-1 ring-navy/10"}`}
                >
                  <span className="block size-full rounded-full" style={{ backgroundColor: s.color }} />
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <Switch
            checked={value.hideBranding} disabled={!isPro && !value.hideBranding}
            onChange={(on) => set({ hideBranding: on })}
            label={t("hideBranding")} hint={isPro ? t("hideBrandingHint") : t("hideBrandingPro")}
          />
        </Card>
      </div>

      <div className="hidden lg:sticky lg:top-6 lg:block">
        <Preview value={value} data={preview} />
      </div>

      {showPreview && (
        <div role="dialog" aria-modal="true" aria-label={t("preview")} className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,12,16,0.5)] p-4 lg:hidden" onClick={(e) => e.target === e.currentTarget && setShowPreview(false)}>
          <div className="flex w-[min(360px,100%)] flex-col gap-3">
            <Preview value={value} data={preview} />
            <button type="button" autoFocus onClick={() => setShowPreview(false)} className={buttonClasses("secondary", "bg-white")}>{t("closePreview")}</button>
          </div>
        </div>
      )}

      <div className="lg:col-span-2">
        <SaveBar
          onSave={save} pending={pending}
          extra={<button type="button" onClick={() => setShowPreview(true)} className="inline-flex h-12 items-center gap-2 rounded-full bg-navy/5 px-5 text-[15px] font-medium lg:hidden"><Eye aria-hidden="true" size={18} />{t("preview")}</button>}
          status={status === "saved" ? { tone: "good", text: "" } : status === "pro_only" || status === "locked" ? { tone: "bad", text: t("proOnly") } : status === "failed" ? { tone: "bad", text: t("failed") } : null}
        />
      </div>
    </div>
  );
}

/** Native color picker + hex text field, kept in sync. */
function ColorField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (hex: string) => void }) {
  const [text, setText] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) { setPrev(value); setText(value); }
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${id}-hex`} className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={label} value={value} onChange={(ev) => onChange(ev.target.value)} className="size-11 shrink-0 cursor-pointer rounded-xl border border-navy/16 bg-white p-1" />
        <input
          id={`${id}-hex`} dir="ltr" value={text} maxLength={7} spellCheck={false} autoComplete="off"
          onChange={(ev) => {
            const v = ev.target.value.startsWith("#") ? ev.target.value : `#${ev.target.value}`;
            setText(v);
            if (HEX.test(v)) onChange(v.toLowerCase());
          }}
          className="h-12 w-32 rounded-xl border border-navy/16 bg-white px-3 font-mono text-base"
        />
      </div>
    </div>
  );
}
