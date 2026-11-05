import { useEffect, useState } from "react";
import { SectionScreen, SwitchRow, useSection } from "../../../components/editor";
import { Card, T } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { rpc } from "../../../lib/api";
import { haptic } from "../../../lib/haptics";

type Data = { reminders: boolean; productNews: boolean };

/** Optional emails (same switches as the website's Notifications page): reminders + Wsool's creators newsletter. */
export default function EmailsScreen() {
  const { t } = useI18n();
  const { data, error, reload } = useSection<Data>("emails");
  const [value, setValue] = useState<Data | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { if (data) setValue(data); }, [data]);

  const toggle = async (patch: Partial<Data>) => {
    if (!value) return;
    const before = value, next = { ...value, ...patch };
    setValue(next); setMsg(null); haptic("tap");
    try {
      await rpc("saveEmailSettings", next.reminders, next.productNews);
      setMsg({ ok: true, text: t("emails.saved") });
    } catch { setValue(before); setMsg({ ok: false, text: t("common.error") }); }
  };

  return (
    <SectionScreen parent="account" title={t("emails.title")} subtitle={t("emails.subtitle")} loading={!data && !error} error={error} onRetry={reload}>
      {value ? (
        <Card>
          <SwitchRow label={t("emails.reminders")} hint={t("emails.remindersHint")} value={value.reminders} onChange={(v) => toggle({ reminders: v })} />
          <SwitchRow label={t("emails.productNews")} hint={t("emails.productNewsHint")} value={value.productNews} onChange={(v) => toggle({ productNews: v })} />
          <SwitchRow label={t("emails.billing")} hint={t("emails.billingHint")} value disabled onChange={() => {}} />
          <T size={12.5} tone="muted">{t("emails.always")}</T>
          {msg ? <T size={13.5} tone={msg.ok ? "good" : "bad"} accessibilityLiveRegion="polite">{msg.text}</T> : null}
        </Card>
      ) : null}
    </SectionScreen>
  );
}
