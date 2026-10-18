import { useState } from "react";
import { View } from "react-native";
import { SectionScreen, useSection } from "../../../components/editor";
import { Button, Card, Field, Panel, Pill, Row, T } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { rpc } from "../../../lib/api";
import { useAuth } from "../../../lib/app";
import { useTheme } from "../../../lib/theme";

type Data = {
  plan: "pro" | "trial" | "free"; status: string; cycle: "monthly" | "yearly" | null; trialDaysLeft: number;
  periodEnd: string | null; cancelAtPeriodEnd: boolean; paymentMethod: string | null;
  invoices: { id: string; label: string; status: string; amount: number; currency: string; paidAt: string | null }[];
  username: string; deletedAt: string | null; purgeAt: string | null;
};

/**
 * The plan, read only: store rules forbid buying or pointing to a purchase
 * outside the app, so there is no price, button or link to pay here.
 * Account deletion (required by Apple inside the app) lives at the bottom.
 */
export default function Subscription() {
  const { t, num, date } = useI18n();
  const { colors } = useTheme();
  const { refreshMe } = useAuth();
  const { data, error, reload } = useSection<Data>("subscription");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const long = (iso: string) => date(iso, { day: "numeric", month: "long", year: "numeric" });

  const remove = async () => {
    setBusy(true); setFailed(false);
    const res = await rpc<{ ok?: boolean }>("requestDeletion", confirm).catch(() => ({ ok: false }));
    setBusy(false);
    if (!res.ok) return setFailed(true);
    setConfirm(""); reload(); refreshMe();
  };
  const undo = async () => { setBusy(true); await rpc("undoDeletion").catch(() => {}); setBusy(false); reload(); refreshMe(); };

  return (
    <SectionScreen parent="account" title={t("section.subscription")} subtitle={t("sub.subtitle")} loading={!data && !error} error={error} onRetry={reload}>
      {data && (
        <>
          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <T weight="bold" size={18}>{t("sub.yourPlan")}</T>
              <Pill tone={data.plan === "pro" ? "good" : data.plan === "trial" ? "blue" : "grey"}>{t(`plan.${data.plan}`)}</Pill>
            </Row>
            {data.plan === "trial" && <T tone="muted">{t("plan.trialLeft", { days: num(data.trialDaysLeft) })}</T>}
            {data.plan === "pro" && data.periodEnd && <T tone="muted">{data.cancelAtPeriodEnd ? t("plan.ends", { date: long(data.periodEnd) }) : t("plan.renews", { date: long(data.periodEnd) })}</T>}
            {data.plan === "pro" && data.cycle && <T size={13} tone="muted">{t(`sub.${data.cycle}`)}{data.paymentMethod ? ` · ${data.paymentMethod}` : ""}</T>}
            {data.plan === "free" && <T tone="muted">{t("sub.freeText")}</T>}
            <T size={12.5} tone="muted">{t("plan.manageOnWeb")}</T>
          </Card>

          {data.invoices.length > 0 && (
            <Panel title={t("sub.invoices")}>
              {data.invoices.map((i) => (
                <Row key={i.id} style={{ justifyContent: "space-between" }}>
                  <View><T size={14} style={{ writingDirection: "ltr" }}>{i.label}</T><T size={12} tone="muted">{i.paidAt ? long(i.paidAt) : ""}</T></View>
                  {i.status === "refunded" && <Pill tone="grey">{t("sub.refunded")}</Pill>}
                  <T weight="bold">{num(i.amount)} {i.currency}</T>
                </Row>
              ))}
            </Panel>
          )}

          <Card style={{ borderColor: colors.bad + "55" }}>
            <T weight="bold" size={16} tone="bad">{t("sub.deleteTitle")}</T>
            {data.deletedAt && data.purgeAt ? (
              <>
                <T>{t("sub.deleteScheduled", { date: long(data.purgeAt) })}</T>
                <Button title={t("sub.undo")} onPress={undo} loading={busy} />
              </>
            ) : (
              <>
                <T size={13.5} tone="muted">{t("sub.deleteText")}</T>
                <Field label={t("sub.typeUsername", { username: data.username })} value={confirm} onChangeText={(v) => { setConfirm(v.trim().toLowerCase()); setFailed(false); }}
                  autoCapitalize="none" autoCorrect={false} style={{ textAlign: "left", writingDirection: "ltr" }} error={failed ? t("editor.failed") : null} />
                <Button title={t("sub.delete")} variant="danger" onPress={remove} loading={busy} disabled={confirm !== data.username} style={{ borderWidth: 1, borderColor: colors.bad }} />
              </>
            )}
          </Card>
        </>
      )}
    </SectionScreen>
  );
}
