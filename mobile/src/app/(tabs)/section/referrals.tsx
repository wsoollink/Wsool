import { useEffect, useState } from "react";
import { Share, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Copy, Share2 } from "lucide-react-native";
import { AreaChart } from "../../../components/AreaChart";
import { Chips, ProNote, SectionScreen, useSaver, useSection } from "../../../components/editor";
import { Button, Card, Field, Panel, Pill, Row, T } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { rpc } from "../../../lib/api";
import { useTheme } from "../../../lib/theme";

type Data = {
  isPro: boolean; rule: { percent: number; months: number; cookieDays: number; holdDays: number; minBankPayout: number }; link: string;
  balance: { pending: number; available: number; paidOut: number; earned: number }; clicksAll: number; signups: number; paying: number;
  series: { day: string; clicks: number }[];
  customers: { joined: string; plan: "pro" | "trial" | "free"; commission: number }[];
  payouts: { method: "credit" | "bank"; amount: number; note: string; createdAt: string }[];
  payout: { method: "credit" | "bank"; maskedIban: string | null; holderName: string };
};

/** Affiliate program: referral link, clicks, sign-ups, commission balance and how it's paid out. */
export default function Referrals() {
  const { t, num, date } = useI18n();
  const { colors } = useTheme();
  const { data, error, reload } = useSection<Data>("referrals");
  const { status, message, save, touch } = useSaver();
  const [method, setMethod] = useState<"credit" | "bank">("credit");
  const [iban, setIban] = useState("");
  const [holder, setHolder] = useState("");
  const [errors, setErrors] = useState<{ iban?: boolean; holderName?: boolean }>({});
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (data) { setMethod(data.payout.method); setHolder(data.payout.holderName); } }, [data]);
  const sar = (n: number) => t("referrals.sar", { n: num(Math.round(n * 100) / 100) });

  const savePayout = () => save(async () => {
    const res = await rpc<{ ok?: boolean; errors?: { iban?: boolean; holderName?: boolean } }>("savePayoutSettings", { method, iban, holderName: holder });
    setErrors(res.errors ?? {});
    if (res.ok) { setIban(""); reload(); }
    return !!res.ok;
  });

  return (
    <SectionScreen parent="account" title={t("section.referrals")} subtitle={t("referrals.subtitle")} loading={!data && !error} error={error} onRetry={reload}>
      {data && (
        <>
          {!data.isPro && <ProNote text={t("referrals.proOnly")} />}
          <Card>
            <T size={12.5} tone="muted">{t("referrals.yourLink")}</T>
            <T weight="bold" size={16} style={{ writingDirection: "ltr", opacity: data.isPro ? 1 : 0.5 }} numberOfLines={1}>{data.link.replace(/^https?:\/\//, "")}</T>
            <T size={12.5} tone="muted">{t("referrals.linkHint")}</T>
            <Row>
              <Button title={t("home.share")} icon={<Share2 size={16} color={colors.onBlue} />} disabled={!data.isPro} onPress={() => Share.share({ message: data.link, url: data.link })} style={{ flex: 1 }} />
              <Button title={copied ? t("home.copied") : t("home.copy")} variant="secondary" icon={<Copy size={16} color={colors.navy} />} disabled={!data.isPro}
                onPress={async () => { await Clipboard.setStringAsync(data.link); setCopied(true); setTimeout(() => setCopied(false), 2000); }} />
            </Row>
          </Card>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {[[t("referrals.clicks"), num(data.clicksAll)], [t("referrals.signups"), num(data.signups)], [t("referrals.paying"), num(data.paying)], [t("referrals.earned"), sar(data.balance.earned)]].map(([l, v]) => (
              <Card key={l} style={{ flexBasis: "47%", flexGrow: 1, gap: 4, padding: 14 }}><T size={12.5} tone="muted">{l}</T><T weight="black" size={v.length > 9 ? 17 : 24}>{v}</T></Card>
            ))}
          </View>
          <T size={12.5} tone="muted">{t("referrals.rule", { percent: num(data.rule.percent), months: num(data.rule.months) })}</T>

          <Panel title={t("referrals.clicksChart")} aside={t("analytics.lastDays", { n: num(30) })}>
            <AreaChart values={data.series.map((d) => d.clicks)} labels={data.series.map((d) => date(d.day))}
              ticks={[0, 10, 20, 29].map((i) => date(data.series[i].day, { day: "numeric", month: "short" }))}
              valueText={(i) => num(data.series[i].clicks)} accessibilityLabel={t("referrals.clicksChart")} height={130} />
          </Panel>

          <Panel title={t("referrals.balance")}>
            <Row style={{ justifyContent: "space-between" }}><T>{t("referrals.pending")}</T><T weight="bold">{sar(data.balance.pending)}</T></Row>
            <Row style={{ justifyContent: "space-between" }}><T>{t("referrals.available")}</T><T weight="black" size={18} tone="good">{sar(data.balance.available)}</T></Row>
            <Row style={{ justifyContent: "space-between" }}><T tone="muted">{t("referrals.paidOut")}</T><T tone="muted">{sar(data.balance.paidOut)}</T></Row>
            <T size={12} tone="muted">{t("referrals.holdNote", { days: num(data.rule.holdDays) })}</T>
          </Panel>

          <Card>
            <T weight="bold" size={16}>{t("referrals.payoutTitle")}</T>
            <Chips value={[method]} onChange={([m]) => { setMethod(m); touch(); }} options={[{ value: "credit", label: t("referrals.credit") }, { value: "bank", label: t("referrals.bank") }]} />
            <T size={12.5} tone="muted">{method === "credit" ? t("referrals.creditHint") : t("referrals.bankHint", { min: sar(data.rule.minBankPayout) })}</T>
            {method === "bank" && (
              <>
                <Field label={t("referrals.iban")} value={iban} onChangeText={(v) => { setIban(v.toUpperCase()); touch(); }} autoCapitalize="characters" autoCorrect={false}
                  placeholder={data.payout.maskedIban ?? "SA00 0000 0000 0000 0000 0000"} style={{ textAlign: "left", writingDirection: "ltr" }}
                  hint={data.payout.maskedIban ? t("referrals.ibanSaved", { iban: data.payout.maskedIban }) : t("referrals.ibanHint")} error={errors.iban ? t("referrals.ibanError") : null} />
                <Field label={t("referrals.holder")} value={holder} onChangeText={(v) => { setHolder(v); touch(); }} maxLength={100} error={errors.holderName ? t("referrals.holderError") : null} />
              </>
            )}
            {status === "saved" || status === "failed" ? <T size={13} tone={status === "saved" ? "good" : "bad"}>{message ?? (status === "saved" ? t("editor.saved") : t("editor.failed"))}</T> : null}
            <Button title={t("editor.save")} variant="secondary" onPress={savePayout} loading={status === "saving"} />
          </Card>

          <Panel title={t("referrals.customers")} aside={num(data.signups)}>
            {data.customers.length === 0 ? <T tone="muted">{t("referrals.noCustomers")}</T> : data.customers.map((c, i) => (
              <Row key={i} style={{ justifyContent: "space-between", minHeight: 40 }}>
                <View><T size={14}>{t("referrals.customerN", { n: num(data.customers.length - i) })}</T><T size={12} tone="muted">{date(c.joined, { day: "numeric", month: "short", year: "numeric" })}</T></View>
                <Pill tone={c.plan === "pro" ? "good" : c.plan === "trial" ? "blue" : "grey"}>{t(`plan.${c.plan}`)}</Pill>
                <T weight="bold">{sar(c.commission)}</T>
              </Row>
            ))}
          </Panel>

          {data.payouts.length > 0 && (
            <Panel title={t("referrals.payouts")}>
              {data.payouts.map((p, i) => (
                <Row key={i} style={{ justifyContent: "space-between" }}>
                  <View><T size={14}>{t(`referrals.${p.method}`)}</T><T size={12} tone="muted">{date(p.createdAt, { day: "numeric", month: "short" })}{p.note ? ` · ${p.note}` : ""}</T></View>
                  <T weight="bold">{sar(p.amount)}</T>
                </Row>
              ))}
            </Panel>
          )}
        </>
      )}
    </SectionScreen>
  );
}
