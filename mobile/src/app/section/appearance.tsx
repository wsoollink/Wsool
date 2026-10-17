import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Check, Lock } from "lucide-react-native";
import { Chips, ProNote, SaveBar, SectionScreen, SwitchRow, useSaver, useSection } from "../../components/editor";
import { Card, Field, T } from "../../components/ui";
import { useI18n } from "../../i18n";
import { rpc } from "../../lib/api";
import { useTheme } from "../../lib/theme";

type Template = "white" | "black" | "sand" | "pink" | "black_gold" | "vivid" | "green" | "custom";
type Data = {
  isPro: boolean; freeTemplates: Template[]; template: Template;
  customColors: { colors: string[]; mode: "light" | "dark" }; accent: string | null;
  accents: { key: string; light: string; dark: string }[]; hideBranding: boolean; iconStyle: "solid" | "color" | "outline";
};
/** Template colours (src/components/creator/theme.ts): background, text, accent. */
const SWATCH: Record<Exclude<Template, "custom">, [string, string, string]> = {
  white: ["#F3F4F6", "#12151A", "#2347D6"], black: ["#07090E", "#F2F4F8", "#6EE7F9"], sand: ["#F4EDE3", "#2B2118", "#A0522D"],
  pink: ["#FBF1F2", "#2A1A20", "#C2577A"], black_gold: ["#0E0C0A", "#F5EEDC", "#D4AF37"], vivid: ["#5B21B6", "#FFFFFF", "#FDE047"], green: ["#EEF2EC", "#1E2A22", "#3F7D58"],
};
const TEMPLATES = Object.keys(SWATCH).concat("custom") as Template[];
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Template, custom colours, accent, account icons style and the Wsool footer. */
export default function Appearance() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { data, error, reload } = useSection<Data>("appearance");
  const { status, message, save, touch } = useSaver();
  const [form, setForm] = useState<Data | null>(null);
  useEffect(() => { if (data) setForm(data); }, [data]);
  const set = (patch: Partial<Data>) => { setForm((f) => (f ? { ...f, ...patch } : f)); touch(); };
  const locked = (tpl: Template) => !form?.isPro && !form?.freeTemplates.includes(tpl);

  const onSave = () => save(async () => {
    if (!form) return false;
    const custom = form.customColors.colors.filter((c) => HEX.test(c));
    const res = await rpc<{ ok?: boolean; error?: string }>("saveAppearance", {
      template: form.template, accent: form.accent, hideBranding: form.hideBranding, iconStyle: form.iconStyle,
      customColors: custom.length ? { colors: custom, mode: form.customColors.mode } : null,
    });
    return res.ok ? true : res.error === "pro_only" ? t("appearance.proOnly") : false;
  });

  return (
    <SectionScreen title={t("section.appearance")} subtitle={t("appearance.subtitle")} loading={!form && !error} error={error} onRetry={reload}
      footer={form && <SaveBar onSave={onSave} status={status} message={message} />}>
      {form && (
        <>
          <Card>
            <T weight="bold">{t("appearance.template")}</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {TEMPLATES.map((tpl) => {
                const [bg, fg, ac] = tpl === "custom" ? [form.customColors.colors[0] ?? "#0060e6", "#fff", form.customColors.colors[1] ?? "#fff"] : SWATCH[tpl];
                const on = form.template === tpl;
                return (
                  <Pressable key={tpl} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: locked(tpl) }} accessibilityLabel={t(`appearance.templates.${tpl}`)}
                    onPress={() => !locked(tpl) && set({ template: tpl })} style={{ width: "30%", flexGrow: 1, gap: 6, opacity: locked(tpl) ? 0.55 : 1 }}>
                    <View style={{ height: 70, borderRadius: 12, backgroundColor: bg, borderWidth: on ? 2.5 : 1, borderColor: on ? colors.blue : colors.line, padding: 10, justifyContent: "space-between" }}>
                      <View style={{ width: "60%", height: 6, borderRadius: 3, backgroundColor: fg, opacity: 0.85 }} />
                      <View style={{ width: 22, height: 10, borderRadius: 5, backgroundColor: ac }} />
                      {locked(tpl) && <View style={{ position: "absolute", top: 6, end: 6 }}><Lock size={14} color={fg} /></View>}
                      {on && <View style={{ position: "absolute", bottom: 6, end: 6, backgroundColor: colors.blue, borderRadius: 9, padding: 2 }}><Check size={12} color="#fff" /></View>}
                    </View>
                    <T size={12.5} weight="bold" style={{ textAlign: "center" }}>{t(`appearance.templates.${tpl}`)}</T>
                  </Pressable>
                );
              })}
            </View>
            {!form.isPro && <ProNote text={t("appearance.templatesPro")} />}
          </Card>

          {form.template === "custom" && (
            <Card>
              <T weight="bold">{t("appearance.customColors")}</T>
              {[0, 1].map((i) => (
                <Field key={i} label={t(i === 0 ? "appearance.color1" : "appearance.color2")} value={form.customColors.colors[i] ?? ""} autoCapitalize="none" maxLength={7}
                  placeholder="#0060E6" style={{ textAlign: "left", writingDirection: "ltr" }}
                  onChangeText={(v) => { const list = [...form.customColors.colors]; list[i] = v.startsWith("#") ? v : `#${v}`; set({ customColors: { ...form.customColors, colors: list.filter((c, j) => j === 0 || c.length > 1) } }); }}
                  error={form.customColors.colors[i] && !HEX.test(form.customColors.colors[i]) ? t("appearance.hexError") : null} />
              ))}
              <Chips value={[form.customColors.mode]} onChange={([m]) => set({ customColors: { ...form.customColors, mode: m } })}
                options={[{ value: "light", label: t("appearance.modeLight") }, { value: "dark", label: t("appearance.modeDark") }]} />
            </Card>
          )}

          <Card>
            <T weight="bold">{t("appearance.accent")}</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {[null, ...form.accents.map((a) => a.light)].map((c) => (
                <Pressable key={c ?? "default"} accessibilityRole="radio" accessibilityState={{ checked: form.accent === c }} accessibilityLabel={c ? form.accents.find((a) => a.light === c)?.key : t("appearance.accentDefault")}
                  onPress={() => set({ accent: c })}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c ?? colors.hover, borderWidth: form.accent === c ? 3 : 1, borderColor: form.accent === c ? colors.navy : colors.line, alignItems: "center", justifyContent: "center" }}>
                  {c === null ? <T size={9.5} weight="bold" tone="muted" style={{ lineHeight: 14 }}>{t("appearance.auto")}</T> : null}
                </Pressable>
              ))}
            </View>
          </Card>

          <Card>
            <T weight="bold">{t("appearance.icons")}</T>
            <Chips value={[form.iconStyle]} onChange={([v]) => set({ iconStyle: v })}
              options={[{ value: "solid", label: t("appearance.iconSolid") }, { value: "color", label: t("appearance.iconColor") }, { value: "outline", label: t("appearance.iconOutline") }]} />
          </Card>

          <Card>
            <SwitchRow label={t("appearance.hideBranding")} hint={form.isPro ? undefined : t("appearance.hideBrandingPro")} value={form.hideBranding} onChange={(v) => set({ hideBranding: v })} disabled={!form.isPro} />
          </Card>
        </>
      )}
    </SectionScreen>
  );
}
