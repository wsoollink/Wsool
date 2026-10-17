import { Linking, View } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { ChevronLeft, ChevronRight, Hammer } from "lucide-react-native";
import { Button, Card, Row, Screen, T } from "../../components/ui";
import { useI18n } from "../../i18n";
import { SITE_URL } from "../../lib/config";
import { useTheme } from "../../lib/theme";

/**
 * Dashboard sections that arrive in later phases (docs/mobile-app-plan.md):
 * for now a "coming soon" card with a link to the same section on the website.
 * Subscription gets no link or button at all: store rules forbid pointing to
 * purchases outside the app, so it only says the plan is managed on the website.
 */
export default function Section() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { t, rtl } = useI18n();
  const { colors } = useTheme();
  const Back = rtl ? ChevronRight : ChevronLeft;
  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <Row>
        <Button title="" variant="ghost" icon={<Back size={22} color={colors.navy} />} onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))} accessibilityLabel="back" style={{ paddingHorizontal: 8, minWidth: 44 }} />
        <T weight="bold" size={20}>{t(`section.${key}`)}</T>
      </Row>
      <Card style={{ alignItems: "center", paddingVertical: 28 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.blue + "18", alignItems: "center", justifyContent: "center" }}>
          <Hammer size={24} color={colors.blue} />
        </View>
        <T weight="bold" style={{ textAlign: "center" }}>{t("common.soon")}</T>
        {key === "subscription" ? (
          <T tone="muted" style={{ textAlign: "center" }}>{t("plan.manageOnWeb")}</T>
        ) : (
          <Button title={t("common.openOnWeb")} variant="secondary" onPress={() => Linking.openURL(`${SITE_URL}/dashboard/${key}`)} />
        )}
      </Card>
    </Screen>
  );
}
