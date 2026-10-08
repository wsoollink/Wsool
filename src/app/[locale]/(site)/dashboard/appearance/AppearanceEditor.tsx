"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { pageTheme } from "@/components/creator/theme";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Template } from "@/generated/prisma/enums";
import { ACCENT_PRESETS, TEMPLATES, type AppearanceInput } from "@/lib/validation/appearance";
import { saveAppearance } from "./actions";
import { Preview, type PreviewData } from "./Preview";

type Value = AppearanceInput & { customColors: NonNullable<AppearanceInput["customColors"]> };
const option = "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line px-3 has-[:checked]:border-blue has-[:checked]:bg-blue/5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue";
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Template, colors, number font and Wsool footer, with a live preview. */
export function AppearanceEditor({ initial, isPro, freeTemplates, preview }: { initial: Value; isPro: boolean; freeTemplates: readonly string[]; preview: PreviewData }) {
  const t = useTranslations("AppearancePage");
  const e = useTranslations("EditPage");
  const [value, setValue] = useState<Value>(initial);
  const [status, setStatus] = useState<"" | "saved" | "failed" | "pro_only">("");
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<Value>) => { setValue({ ...value, ...patch }); setStatus(""); };
  const locked = (tpl: string) => !isPro && !freeTemplates.includes(tpl);
  const custom = value.customColors;

  const save = () =>
    startTransition(async () => {
      const res = await saveAppearance({ ...value, customColors: value.template === "custom" ? custom : null });
      setStatus(res.ok ? "saved" : (res.error ?? "failed"));
    });

  const saveRow = (
    <div className="flex items-center justify-between gap-3">
      <p role="status" aria-live="polite" className={`text-sm ${status === "saved" ? "text-good" : "text-bad"}`}>
        {status === "saved" ? e("saved") : status === "pro_only" ? t("proOnly") : status === "failed" ? e("errors.failed") : ""}
      </p>
      <button type="button" onClick={save} disabled={pending || locked(value.template) || (!isPro && value.hideBranding)} aria-busy={pending} className={buttonClasses("primary")}>
        {pending ? e("saving") : e("save")}
      </button>
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <fieldset className="flex min-w-0 flex-col gap-3">
            <legend className="mb-1 font-bold">{t("template")}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TEMPLATES.map((tpl) => {
                const theme = pageTheme(tpl as Template, null, tpl === "custom" ? custom : null);
                return (
                  <label key={tpl} className="relative flex cursor-pointer flex-col gap-2 rounded-2xl border border-line p-2 has-[:checked]:border-blue has-[:checked]:ring-2 has-[:checked]:ring-blue/30 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue">
                    <input type="radio" name="template" value={tpl} checked={value.template === tpl} onChange={() => set({ template: tpl })} className="sr-only" />
                    <span aria-hidden="true" className="flex h-16 flex-col justify-end gap-1 rounded-xl p-2" style={{ backgroundColor: theme.bg, backgroundImage: theme.bgImage }}>
                      <span className="h-1.5 w-2/3 rounded-full" style={{ backgroundColor: theme.text }} />
                      <span className="h-1.5 w-1/3 rounded-full" style={{ backgroundColor: theme.accent }} />
                    </span>
                    <span className="flex items-center justify-between gap-1 text-sm font-medium">
                      {t(`templates.${tpl}`)}
                      {locked(tpl) ? <Lock aria-label={t("proLabel")} size={14} className="text-muted" /> : value.template === tpl ? <Check aria-hidden="true" size={16} className="text-blue" /> : null}
                    </span>
                  </label>
                );
              })}
            </div>
            {locked(value.template) && (
              <p className="rounded-xl bg-warn/10 p-3 text-sm text-warn">
                {t("templateLocked")} <Link href="/dashboard/subscription" className="font-semibold underline">{t("upgrade")}</Link>
              </p>
            )}
          </fieldset>

          {value.template === "custom" && (
            <fieldset className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line p-3">
              <legend className="px-1 text-sm font-bold">{t("customColors")}</legend>
              <ColorField id="custom-1" label={t("mainColor")} value={custom.colors[0]} onChange={(c) => set({ customColors: { ...custom, colors: [c, ...custom.colors.slice(1)] } })} />
              {custom.colors[1] ? (
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <ColorField id="custom-2" label={t("secondColor")} value={custom.colors[1]} onChange={(c) => set({ customColors: { ...custom, colors: [custom.colors[0], c] } })} />
                  </div>
                  <button type="button" onClick={() => set({ customColors: { ...custom, colors: [custom.colors[0]] } })} className={buttonClasses("secondary", "px-4 text-sm")}>{t("removeSecond")}</button>
                </div>
              ) : (
                <button type="button" onClick={() => set({ customColors: { ...custom, colors: [custom.colors[0], "#22b8f0"] } })} className={buttonClasses("secondary", "self-start text-sm")}>{t("addSecond")}</button>
              )}
              <div className="grid grid-cols-2 gap-2">
                {(["light", "dark"] as const).map((m) => (
                  <label key={m} className={option}>
                    <input type="radio" name="mode" checked={custom.mode === m} onChange={() => set({ customColors: { ...custom, mode: m } })} className="size-5 accent-blue" />
                    <span className="text-sm font-medium">{t(m)}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted">{t("customHint")}</p>
            </fieldset>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-bold">{t("accent")}</h2>
          <p className="text-xs text-muted">{t("accentHint")}</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("accent")}>
            <button
              type="button" role="radio" aria-checked={value.accent === null} onClick={() => set({ accent: null })}
              className={`min-h-11 rounded-full border px-4 text-sm font-medium ${value.accent === null ? "border-blue bg-blue/5 text-blue" : "border-line"}`}
            >
              {t("templateAccent")}
            </button>
            {ACCENT_PRESETS.map((c) => (
              <button
                key={c} type="button" role="radio" aria-checked={value.accent === c} aria-label={c} onClick={() => set({ accent: c })}
                className={`size-11 rounded-full border-4 ${value.accent === c ? "border-navy" : "border-white shadow-[0_0_0_1px_var(--color-line)]"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <ColorField id="accent-custom" label={t("anyColor")} value={value.accent ?? "#0060e6"} onChange={(c) => set({ accent: c })} />
        </Card>

        <Card className="flex flex-col gap-3">
          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 font-bold">{t("numberFont")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["wide", "text"] as const).map((f) => (
                <label key={f} className={`${option} flex-col items-start py-3`}>
                  <input type="radio" name="numberFont" checked={value.numberFont === f} onChange={() => set({ numberFont: f })} className="sr-only" />
                  <span className={`${f === "wide" ? "font-numbers" : "font-sans"} text-2xl font-bold`}>1.2M</span>
                  <span className="text-sm">{t(`font.${f}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card className="flex flex-col gap-3">
          <label className={`${option} ${!isPro ? "opacity-60" : ""}`}>
            <input type="checkbox" checked={value.hideBranding} disabled={!isPro && !value.hideBranding} onChange={(ev) => set({ hideBranding: ev.target.checked })} className="size-5 accent-blue" />
            <span className="flex flex-1 flex-col">
              <span className="text-sm font-medium">{t("hideBranding")}</span>
              <span className="text-xs text-muted">{t("hideBrandingHint")}</span>
            </span>
            {!isPro && <Lock aria-label={t("proLabel")} size={14} className="text-muted" />}
          </label>
        </Card>

        <Card className="lg:hidden">{saveRow}</Card>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-20">
        <Preview value={value} data={preview} />
        <Card className="hidden lg:block">{saveRow}</Card>
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
        <input type="color" aria-label={label} value={value} onChange={(ev) => onChange(ev.target.value)} className="size-11 shrink-0 cursor-pointer rounded-xl border border-line bg-card p-1" />
        <input
          id={`${id}-hex`} dir="ltr" value={text} maxLength={7} spellCheck={false} autoComplete="off"
          onChange={(ev) => {
            const v = ev.target.value.startsWith("#") ? ev.target.value : `#${ev.target.value}`;
            setText(v);
            if (HEX.test(v)) onChange(v.toLowerCase());
          }}
          className="min-h-11 w-32 rounded-xl border border-line bg-card px-3 font-mono text-base"
        />
      </div>
    </div>
  );
}
