import { Platform } from "react-native";
import { Stack } from "expo-router";
import { FONTS, useTheme } from "../lib/theme";

/**
 * iPhone uses the system bars (iPhone app, Oct 2026): a large title on each tab's first screen that shrinks
 * when you scroll, and the system back button on sections. Android and the web keep our own bars.
 */
export const NATIVE_HEADER = Platform.OS === "ios";

/** A tab's own stack (page, account, insights, notifications): sections slide in and go back with the system gestures. */
export function TabStack() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: NATIVE_HEADER,
        // usePreventRemove (unsaved changes) doesn't work with the long-press back menu.
        headerBackButtonMenuEnabled: false,
        headerTintColor: colors.blue,
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerTitleStyle: { fontFamily: FONTS.bold, color: colors.navy },
        headerLargeTitleStyle: { fontFamily: FONTS.black, color: colors.navy },
        headerBackTitleStyle: { fontFamily: FONTS.regular },
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
