import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * A light tap when a switch flips, and success / error after a save (design review, Oct 2026).
 * Phones without haptics (and the web) just ignore it.
 */
export function haptic(kind: "tap" | "success" | "error") {
  if (Platform.OS === "web") return;
  const run =
    kind === "tap" ? Haptics.selectionAsync()
    : Haptics.notificationAsync(kind === "success" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
  run.catch(() => {});
}
