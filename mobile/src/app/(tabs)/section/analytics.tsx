import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { View } from "react-native";
import { Lock } from "lucide-react-native";
import { AreaChart } from "../../../components/AreaChart";
import { SectionScreen } from "../../../components/editor";
import { Card, Panel, Row, Segmented, T } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { api } from "../../../lib/api";
import { PLATFORM_NAMES, type Platform } from "../../../lib/platforms";
import { useTheme } from "../../../lib/theme";

type Count = { key: string; count: number };
type Report = {
  views: number; visitors: number; whatsapp: number; email: number; series: { day: string; views: number }[];
  countries: Count[]; referrers: Count[]; devices: Count[];
  topClicks: { kind: string; platform: Platform | null; targetName?: string | null; count: number }[];
};
type Data = { locked: true } | { locked: false; range: number; ranges: number[]; report: Report; prev: { views: number; whatsapp: number; email: number } };

/** Page visits and contact taps for 7 / 30 / 90 days (Pro), like the website's Analytics. */
/** As its own tab (Insights) it gets a large title and no back button. */
export function AnalyticsScreen({ tab }: { tab?: boolean }) {
  const { t, num, date, lang } = useI18n();
  const { colors } = useTheme();
  const [range, setRange] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setError(null); setData(await api<Data>(`/section/analytics?range=${range}`)); } catch { setError(t("common.offline")); }
  }, [range, t]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const region = (c: string) => { try { return new Intl.DisplayNames([lang], { type: "region" }).of(c) ?? c; } catch { return c; } };
  const delta = (cur: number, before: number) => {
    if (!before) return null;
    const pct = Math.round(((cur - before) / before) * 100);
    return { text: `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${num(Math.abs(pct))}%`, good: pct >= 0 };
  };
  const share = (rows: Count[], total: number, label: (k: string) => string) => rows.slice(0, 6).map((r) => {
    const pct = total ? Math.round((r.count / total) * 100) : 0;
    return (
      <View key={r.key} style={{ gap: 4 }}>
        <Row style={{ justifyContent: "space-between" }}><T size={13.5}>{label(r.key)}</T><T size={13} tone="muted">{num(pct)}%</T></Row>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.lineSoft, overflow: "hidden" }}><View style={{ width: `${pct}%`, height: 6, backgroundColor: colors.blue }} /></View>
      </View>
    );
  });
  const clickLabel = (c: Report["topClicks"][number]) =>
    c.kind === "whatsapp" ? "WhatsApp" : c.kind === "email" ? t("analytics.email") : c.kind === "link" ? t("analytics.link", { name: c.targetName ?? "—" })
      : c.kind === "service" ? t("analytics.service", { name: c.targetName ?? "—" })
      : c.kind === "coupon_copy" ? t("analytics.couponCopy", { name: c.targetName ?? "—" })
      : c.kind === "coupon_open" ? t("analytics.couponOpen", { name: c.targetName ?? "—" }) : `${t(`analytics.${c.kind}`)} ${c.platform ? PLATFORM_NAMES[c.platform] : ""}`;

  return (
    <SectionScreen tab={tab} title={t("section.analytics")} subtitle={t("analytics.subtitle")} loading={!data && !error} error={error} onRetry={load}>
      {data && (data.locked ? (
        <Card><Row><Lock size={18} color={colors.muted} /><T tone="muted" style={{ flex: 1 }}>{t("home.statsPro")}</T></Row></Card>
      ) : (
        <>
          <Segmented label={t("section.analytics")} value={range} onChange={setRange} options={data.ranges.map((r) => ({ value: r, label: t("analytics.lastDays", { n: num(r) }) }))} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {[
              { label: t("home.stat.views"), value: data.report.views, d: delta(data.report.views, data.prev.views) },
              { label: t("analytics.visitors"), value: data.report.visitors, d: null },
              { label: t("home.stat.whatsapp"), value: data.report.whatsapp, d: delta(data.report.whatsapp, data.prev.whatsapp) },
              { label: t("home.stat.email"), value: data.report.email, d: delta(data.report.email, data.prev.email) },
            ].map((x) => (
              <Card key={x.label} style={{ flexBasis: "47%", flexGrow: 1, gap: 4, padding: 14 }}>
                <T size={12.5} tone="muted">{x.label}</T>
                <T weight="black" size={24}>{num(x.value)}</T>
                {x.d ? <T size={12} tone={x.d.good ? "good" : "warn"}>{x.d.text}</T> : null}
              </Card>
            ))}
          </View>
          <Panel title={t("home.visits")} aside={t("analytics.lastDays", { n: num(data.range) })}>
            <AreaChart
              values={data.report.series.map((d) => d.views)} labels={data.report.series.map((d) => date(d.day))}
              ticks={[0, Math.floor(data.report.series.length / 3), Math.floor((2 * data.report.series.length) / 3), data.report.series.length - 1].map((i) => (data.report.series[i] ? date(data.report.series[i].day, { day: "numeric", month: "short" }) : ""))}
              valueText={(i) => num(data.report.series[i].views)} accessibilityLabel={`${t("home.visits")}: ${num(data.report.views)}`}
            />
          </Panel>
          {data.report.views === 0 ? <Card><T tone="muted">{t("analytics.empty")}</T></Card> : (
            <>
              <Panel title={t("analytics.countries")}>{share(data.report.countries, data.report.views, region)}</Panel>
              <Panel title={t("analytics.referrers")}>{data.report.referrers.length ? share(data.report.referrers, data.report.views, (k) => k) : <T tone="muted">{t("analytics.direct")}</T>}</Panel>
              <Panel title={t("analytics.devices")}>{share(data.report.devices, data.report.devices.reduce((s, d) => s + d.count, 0), (k) => t(`analytics.device.${k}`))}</Panel>
              <Panel title={t("analytics.topClicks")}>
                {data.report.topClicks.length === 0 ? <T tone="muted">{t("analytics.noClicks")}</T> : data.report.topClicks.map((c, i) => (
                  <Row key={i} style={{ justifyContent: "space-between", minHeight: 36 }}><T size={14} style={{ flex: 1 }}>{clickLabel(c)}</T><T weight="bold">{num(c.count)}</T></Row>
                ))}
              </Panel>
            </>
          )}
          <T size={12} tone="muted">{t("analytics.privacy")}</T>
        </>
      ))}
    </SectionScreen>
  );
}

export default function Analytics() {
  return <AnalyticsScreen />;
}
