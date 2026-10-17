import { Linking, Pressable, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { ChevronLeft, ChevronRight, LogOut, Mail } from "lucide-react-native";
import { Card, Row, Screen, T } from "../../components/ui";
import { useI18n, type Lang } from "../../i18n";
import { useAuth } from "../../lib/app";
import { SECTIONS } from "../../lib/sections";
import { useTheme, type ThemeMode } from "../../lib/theme";


function Choice<V extends string>({ options, value, onChange, label }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void; label: string }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", gap: 4, padding: 4, borderRadius: 12, backgroundColor: colors.hover }}>
      {options.map((o) => (
        <Pressable key={o.value} accessibilityRole="radio" accessibilityState={{ checked: o.value === value }} onPress={() => onChange(o.value)}
          style={{ flex: 1, minHeight: 44, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: o.value === value ? colors.card : "transparent" }}>
          <T weight="bold" size={13.5} tone={o.value === value ? undefined : "muted"}>{o.label}</T>
        </Pressable>
      ))}
    </View>
  );
}

/** All sections, settings (language, theme), support and sign out. */
export default function More() {
  const { t, lang, setLang, rtl } = useI18n();
  const { colors, mode, setMode } = useTheme();
  const { me, signOut } = useAuth();
  const Chevron = rtl ? ChevronLeft : ChevronRight;
  const row = { minHeight: 48, justifyContent: "center" as const, paddingHorizontal: 16 };
  return (
    <Screen>
      <T weight="bold" size={22}>{t("more.title")}</T>
      <T size={13} tone="muted">{t("more.sections")}</T>
      <Card padded={false} style={{ gap: 0 }}>
        {SECTIONS.map((s, i) => (
          <Pressable key={s} accessibilityRole="button" onPress={() => router.push(`/section/${s}` as never)}
            style={[row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.lineSoft }]}>
            <Row style={{ justifyContent: "space-between" }}><T>{t(`section.${s}`)}</T><Chevron size={18} color={colors.faint} /></Row>
          </Pressable>
        ))}
      </Card>

      <T size={13} tone="muted">{t("more.settings")}</T>
      <Card style={{ gap: 12 }}>
        <T weight="bold" size={13.5}>{t("more.language")}</T>
        <Choice<Lang> label={t("more.language")} value={lang} onChange={setLang} options={[{ value: "ar", label: "العربية" }, { value: "en", label: "English" }]} />
        <T weight="bold" size={13.5}>{t("more.theme")}</T>
        <Choice<ThemeMode> label={t("more.theme")} value={mode} onChange={setMode} options={[{ value: "system", label: t("more.themeSystem") }, { value: "light", label: t("more.themeLight") }, { value: "dark", label: t("more.themeDark") }]} />
      </Card>

      <T size={13} tone="muted">{t("more.account")}</T>
      <Card padded={false} style={{ gap: 0 }}>
        {me && <View style={[row, { paddingVertical: 10 }]}><T size={13} tone="muted">{t("more.signedInAs", { email: me.user.email })}</T></View>}
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL("mailto:support@wsool.link")} style={[row, { borderTopWidth: 1, borderTopColor: colors.lineSoft }]}>
          <Row><Mail size={18} color={colors.navy} /><T>{t("more.support")}</T></Row>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={signOut} style={[row, { borderTopWidth: 1, borderTopColor: colors.lineSoft }]}>
          <Row><LogOut size={18} color={colors.bad} /><T tone="bad">{t("more.signOut")}</T></Row>
        </Pressable>
      </Card>
      <T size={12} tone="faint" style={{ textAlign: "center" }}>{t("more.version", { v: Constants.expoConfig?.version ?? "1.0.0" })}</T>
    </Screen>
  );
}
