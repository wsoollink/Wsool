import { I18nManager, Platform } from "react-native";
import { createContext, useContext } from "react";

/** Same colours as the website (src/app/globals.css), light and dark. */
export const LIGHT = {
  navy: "#021941", blue: "#0060E6", cyan: "#22B8F0", muted: "#5B6478", bg: "#F2F4F8",
  line: "#E3E8EF", lineSoft: "#EEF1F5", faint: "#8A93A5", hover: "#EEF1F5", card: "#FFFFFF",
  onBlue: "#FFFFFF", good: "#0E6B4C", warn: "#A35200", bad: "#C0362C",
  // App design (Oct 2026): inputs, soft blue fills, the navy link card, segmented track, floating tab bar.
  input: "#F4F6FA", blueSoft: "#E6EFFD", hero: "#021941", track: "#E4E8EF", tabBar: "rgba(255,255,255,0.96)",
};
export type Colors = typeof LIGHT;
export const DARK: Colors = {
  navy: "#F2F4F8", blue: "#7DD3FC", cyan: "#22B8F0", muted: "#9AA3B2", bg: "#07090E",
  line: "#232A36", lineSoft: "#1A1F29", faint: "#5D6678", hover: "#161B25", card: "#12161E",
  onBlue: "#07090E", good: "#4ADE80", warn: "#FBBF24", bad: "#F87171",
  input: "#161B25", blueSoft: "rgba(125,211,252,0.14)", hero: "#0B1A36", track: "#1A1F29", tabBar: "rgba(18,22,30,0.96)",
};

export const FONTS = { regular: "NotoKufi-Regular", bold: "NotoKufi-Bold", black: "NotoKufi-Black" };
export const RADIUS = { card: 20, input: 14, button: 16, pill: 999 };

export type ThemeMode = "system" | "light" | "dark";
export const ThemeContext = createContext<{ colors: Colors; dark: boolean; mode: ThemeMode; setMode: (m: ThemeMode) => void }>({
  colors: LIGHT, dark: false, mode: "system", setMode: () => {},
});
export const useTheme = () => useContext(ThemeContext);

/**
 * textAlign of a <Text> for a physical side. Android swaps "left" and "right"
 * on Text when the app is laid out right-to-left; iOS, the web and TextInput
 * keep them physical, so inputs use plain "left"/"right".
 */
export const align = (side: "left" | "right"): "left" | "right" =>
  Platform.OS === "android" && I18nManager.isRTL ? (side === "left" ? "right" : "left") : side;
