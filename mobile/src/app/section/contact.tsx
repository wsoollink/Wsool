import { useEffect, useState } from "react";
import { Linking } from "react-native";
import { Mail } from "lucide-react-native";
import { PlatformIcon } from "../../components/PlatformIcon";
import { SaveBar, SectionScreen, SwitchRow, useSaver, useSection } from "../../components/editor";
import { Card, Field, Row, T } from "../../components/ui";
import { useI18n } from "../../i18n";
import { rpc } from "../../lib/api";
import { useTheme } from "../../lib/theme";

type Data = { whatsapp: string; email: string; whatsappVisible: boolean; emailVisible: boolean; taps: { whatsapp: number; email: number } };

/** WhatsApp + email shown on the page, each can be hidden without deleting it. */
export default function Contact() {
  const { t, num } = useI18n();
  const { colors } = useTheme();
  const { data, error, reload } = useSection<Data>("contact");
  const { status, message, save, touch } = useSaver();
  const [form, setForm] = useState<Omit<Data, "taps"> | null>(null);
  const [errors, setErrors] = useState<{ whatsapp?: boolean; email?: boolean }>({});
  useEffect(() => { if (data) setForm({ whatsapp: data.whatsapp ? `+${data.whatsapp}` : "", email: data.email, whatsappVisible: data.whatsappVisible, emailVisible: data.emailVisible }); }, [data]);
  const set = (patch: Partial<Omit<Data, "taps">>) => { setForm((f) => (f ? { ...f, ...patch } : f)); touch(); };

  const onSave = () => save(async () => {
    const res = await rpc<{ ok?: boolean; whatsapp?: string; email?: string; errors?: { whatsapp?: boolean; email?: boolean } }>("saveContact", form);
    setErrors(res.errors ?? {});
    if (res.ok) setForm((f) => (f ? { ...f, whatsapp: res.whatsapp ? `+${res.whatsapp}` : "", email: res.email ?? "" } : f));
    return !!res.ok;
  });

  return (
    <SectionScreen title={t("section.contact")} subtitle={t("contact.subtitle")} loading={!form && !error} error={error} onRetry={reload}
      footer={form && <SaveBar onSave={onSave} status={status} message={message} />}>
      {form && data && (
        <>
          <Card>
            <Row><PlatformIcon platform="whatsapp" size={22} color="#25D366" /><T weight="bold">WhatsApp</T></Row>
            <SwitchRow label={t("contact.show")} value={form.whatsappVisible} onChange={(v) => set({ whatsappVisible: v })} />
            <Field label={t("contact.whatsapp")} value={form.whatsapp} onChangeText={(v) => set({ whatsapp: v })} keyboardType="phone-pad"
              placeholder="+966 5X XXX XXXX" style={{ textAlign: "left", writingDirection: "ltr" }} hint={t("contact.whatsappHint")} error={errors.whatsapp ? t("contact.whatsappError") : null} />
            <T size={12.5} tone="muted">{t("contact.taps", { n: num(data.taps.whatsapp) })}</T>
            {form.whatsapp ? <T size={13} tone="blue" accessibilityRole="link" onPress={() => Linking.openURL(`https://wa.me/${form.whatsapp.replace(/\D/g, "")}`)}>{t("contact.test")}</T> : null}
          </Card>
          <Card>
            <Row><Mail size={22} color={colors.navy} /><T weight="bold">{t("contact.emailTitle")}</T></Row>
            <SwitchRow label={t("contact.show")} value={form.emailVisible} onChange={(v) => set({ emailVisible: v })} />
            <Field label={t("contact.email")} value={form.email} onChangeText={(v) => set({ email: v })} keyboardType="email-address" autoCapitalize="none"
              style={{ textAlign: "left", writingDirection: "ltr" }} error={errors.email ? t("contact.emailError") : null} />
            <T size={12.5} tone="muted">{t("contact.taps", { n: num(data.taps.email) })}</T>
          </Card>
        </>
      )}
    </SectionScreen>
  );
}
