import { useEffect, useState } from "react";
import { View } from "react-native";
import { PlatformIcon } from "../../../components/PlatformIcon";
import { AddButton, Chips, ItemTools, move, ProNote, SaveBar, SectionScreen, SwitchRow, useSaver, useSection } from "../../../components/editor";
import { Card, Field, Row, T } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { rpc } from "../../../lib/api";
import { PLATFORM_NAMES, type Platform } from "../../../lib/platforms";
import { useTheme } from "../../../lib/theme";

type Rate = { name: string; nameEn: string; price: string };
type Settings = { showOnPage: boolean; showInPdf: boolean; currency: "SAR" | "USD" | "AED" | "KWD"; vatIncluded: boolean };
type Data = {
  showEnglish: boolean; locked: boolean; settings: Settings;
  accounts: { id: string; platform: Platform; handle: string; rates: { name: string; nameEn: string; price: number }[] }[];
  bundle: { name: string; nameEn: string; accountIds: string[]; rates: { name: string; nameEn: string; price: number }[] } | null;
};
const CURRENCIES = ["SAR", "USD", "AED", "KWD"] as const;
const MAX_RATES = 10;
/** Arabic digits and "٫" typed on the phone become 0-9 and "." (like the website's decimalInput). */
const price = (v: string) => v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[٫,]/g, ".").replace(/[^\d.]/g, "").slice(0, 11);
const toRates = (list: { name: string; nameEn: string; price: number }[]): Rate[] => list.map((r) => ({ name: r.name, nameEn: r.nameEn, price: String(r.price) }));
const fromRates = (list: Rate[]) => list.filter((r) => r.name.trim()).map((r) => ({ name: r.name, nameEn: r.nameEn, price: Number(r.price) || 0 }));

function RateList({ rates, onChange, showEnglish, currency, suggestions }: { rates: Rate[]; onChange: (r: Rate[]) => void; showEnglish: boolean; currency: string; suggestions: string[] }) {
  const { t } = useI18n();
  const set = (i: number, patch: Partial<Rate>) => onChange(rates.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <View style={{ gap: 12 }}>
      {rates.map((r, i) => (
        <View key={i} style={{ gap: 8, paddingBottom: 10, borderBottomWidth: i < rates.length - 1 ? 1 : 0, borderBottomColor: "#0000000D" }}>
          <Row style={{ alignItems: "flex-start" }}>
            <View style={{ flex: 1.4 }}><Field label={t("rates.type")} value={r.name} onChangeText={(v) => set(i, { name: v })} maxLength={40} /></View>
            <View style={{ flex: 1 }}><Field label={t("rates.price", { currency })} value={r.price} onChangeText={(v) => set(i, { price: price(v) })} keyboardType="decimal-pad" style={{ textAlign: "left", writingDirection: "ltr" }} /></View>
          </Row>
          {showEnglish && <Field label={t("rates.typeEn")} value={r.nameEn} onChangeText={(v) => set(i, { nameEn: v })} maxLength={40} style={{ textAlign: "left", writingDirection: "ltr" }} />}
          <ItemTools index={i} count={rates.length} onMove={(a, b) => onChange(move(rates, a, b))} onRemove={() => onChange(rates.filter((_, j) => j !== i))} />
        </View>
      ))}
      {rates.length === 0 && (
        <Chips value={[]} onChange={([v]) => onChange([{ name: v, nameEn: "", price: "" }])} options={suggestions.map((s) => ({ value: s, label: `+ ${s}` }))} />
      )}
      <AddButton label={t("rates.addRate")} disabled={rates.length >= MAX_RATES} onPress={() => onChange([...rates, { name: "", nameEn: "", price: "" }])} />
    </View>
  );
}

/** Ad rates per platform, one optional bundle, and how prices show on the page / PDF. */
export default function Rates() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { data, error, reload } = useSection<Data>("rates");
  const { status, message, save, touch } = useSaver();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [rates, setRates] = useState<Record<string, Rate[]>>({});
  const [bundle, setBundle] = useState<{ on: boolean; name: string; nameEn: string; accountIds: string[]; rates: Rate[] }>({ on: false, name: "", nameEn: "", accountIds: [], rates: [] });
  useEffect(() => {
    if (!data) return;
    setSettings(data.settings);
    setRates(Object.fromEntries(data.accounts.map((a) => [a.id, toRates(a.rates)])));
    setBundle(data.bundle ? { on: true, ...data.bundle, rates: toRates(data.bundle.rates) } : { on: false, name: "", nameEn: "", accountIds: [], rates: [] });
  }, [data]);
  const suggestions = t("rates.suggestions").split("|");

  const onSave = () => save(async () => {
    if (!settings || !data) return false;
    if (bundle.on && (bundle.accountIds.length < 2 || fromRates(bundle.rates).length === 0)) return t("rates.bundleIncomplete");
    const results = await Promise.all([
      rpc<{ ok?: boolean }>("saveRateSettings", settings),
      ...data.accounts.map((a) => rpc<{ ok?: boolean }>("saveRates", a.id, fromRates(rates[a.id] ?? []))),
      rpc<{ ok?: boolean }>("saveBundles", bundle.on ? [{ name: bundle.name, nameEn: bundle.nameEn, accountIds: bundle.accountIds, rates: fromRates(bundle.rates) }] : []),
    ]);
    return results.every((r) => r.ok);
  });

  return (
    <SectionScreen title={t("section.rates")} subtitle={t("rates.subtitle")} loading={!settings && !error} error={error} onRetry={reload}
      footer={settings && <SaveBar onSave={onSave} status={status} message={message} />}>
      {settings && data && (
        <>
          {data.locked && <ProNote text={t("rates.proOnly")} />}
          <Card style={{ gap: 4 }}>
            <SwitchRow label={t("rates.showOnPage")} hint={t("rates.showOnPageHint")} value={settings.showOnPage} onChange={(v) => { setSettings({ ...settings, showOnPage: v }); touch(); }} />
            <SwitchRow label={t("rates.showInPdf")} value={settings.showInPdf} onChange={(v) => { setSettings({ ...settings, showInPdf: v }); touch(); }} />
            <SwitchRow label={t("rates.vatIncluded")} value={settings.vatIncluded} onChange={(v) => { setSettings({ ...settings, vatIncluded: v }); touch(); }} />
            <T weight="bold" size={14} style={{ marginTop: 6 }}>{t("rates.currency")}</T>
            <Chips value={[settings.currency]} onChange={([c]) => { setSettings({ ...settings, currency: c }); touch(); }} options={CURRENCIES.map((c) => ({ value: c, label: t(`rates.currencies.${c}`) }))} />
          </Card>

          {data.accounts.length === 0 ? <Card><T tone="muted">{t("rates.noAccounts")}</T></Card> : data.accounts.map((a) => (
            <Card key={a.id}>
              <Row><PlatformIcon platform={a.platform} size={20} color={colors.navy} /><T weight="bold">{PLATFORM_NAMES[a.platform]}</T><T size={12.5} tone="muted">@{a.handle}</T></Row>
              <RateList rates={rates[a.id] ?? []} onChange={(r) => { setRates({ ...rates, [a.id]: r }); touch(); }} showEnglish={data.showEnglish} currency={t(`rates.currencies.${settings.currency}`)} suggestions={suggestions} />
            </Card>
          ))}

          {data.accounts.length >= 2 && (
            <Card>
              <SwitchRow label={t("rates.bundle")} hint={t("rates.bundleHint")} value={bundle.on} onChange={(v) => { setBundle({ ...bundle, on: v }); touch(); }} />
              {/* How a bundle works, in plain steps (owner: creators didn't get it). */}
              <View style={{ borderRadius: 14, backgroundColor: colors.bg, padding: 12, gap: 4 }}>
                <T weight="bold" size={13.5}>{t("rates.bundleHowTitle")}</T>
                {(["bundleStep1", "bundleStep2", "bundleStep3"] as const).map((k, i) => (
                  <Row key={k} style={{ alignItems: "flex-start", gap: 6 }}>
                    <T size={13} tone="muted">{i + 1}.</T><T size={13} tone="muted" style={{ flex: 1 }}>{t(`rates.${k}`)}</T>
                  </Row>
                ))}
                <T size={12.5} tone="muted" style={{ marginTop: 2 }}>{t("rates.bundleExample")}</T>
              </View>
              {bundle.on && (
                <>
                  <Field label={t("rates.bundleName")} value={bundle.name} onChangeText={(v) => { setBundle({ ...bundle, name: v }); touch(); }} maxLength={40} />
                  <T weight="bold" size={14}>{t("rates.bundlePlatforms")}</T>
                  <Chips multi value={bundle.accountIds} onChange={(ids) => { setBundle({ ...bundle, accountIds: ids }); touch(); }}
                    options={data.accounts.map((a) => ({ value: a.id, label: PLATFORM_NAMES[a.platform] }))} />
                  <RateList rates={bundle.rates} onChange={(r) => { setBundle({ ...bundle, rates: r }); touch(); }} showEnglish={data.showEnglish} currency={t(`rates.currencies.${settings.currency}`)} suggestions={suggestions} />
                </>
              )}
            </Card>
          )}
        </>
      )}
    </SectionScreen>
  );
}
