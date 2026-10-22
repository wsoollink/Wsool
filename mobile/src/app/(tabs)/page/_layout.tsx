import { Stack } from "expo-router";
import { useTheme } from "../../../lib/theme";

/** Index first, so a section opened from another tab still goes back to this tab's list. */
export const unstable_settings = { initialRouteName: "index" };

/**
 * The tab's own native stack: sections slide in over the list and go back with the system
 * gestures (edge swipe on iPhone, back on Android). The bar of each section is SectionScreen's.
 */
export default function TabStack() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
