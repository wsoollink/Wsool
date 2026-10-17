import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "../lib/app";
import { appRoute } from "../lib/push";
import { useTheme } from "../lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { dark, colors } = useTheme();
  // Tapping a push notification opens its screen.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      router.push(appRoute(r.notification.request.content.data?.href as string | undefined) as never);
    });
    return () => sub.remove();
  }, []);
  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    "NotoKufi-Regular": require("../../assets/fonts/NotoKufiArabic-Regular.ttf"),
    "NotoKufi-Bold": require("../../assets/fonts/NotoKufiArabic-Bold.ttf"),
    "NotoKufi-Black": require("../../assets/fonts/NotoKufiArabic-Black.ttf"),
  });
  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => {}); }, [loaded]);
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}
