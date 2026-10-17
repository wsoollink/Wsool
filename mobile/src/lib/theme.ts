import { createContext, useContext } from "react";

/** Same colours as the website (src/app/globals.css), light and dark. */
export const LIGHT = {
  navy: "#021941", blue: "#0060E6", cyan: "#22B8F0", muted: "#56607A", bg: "#F6F8FA",
  line: "#E3E8EE", lineSoft: "#EBEEF3", faint: "#8A94A7", hover: "#EEF1F5", card: "#FFFFFF",
  onBlue: "#FFFFFF", good: "#12805C", warn: "#B45309", bad: "#C0362C",
};
export type Colors = typeof LIGHT;
export const DARK: Colors = {
  navy: "#F2F4F8", blue: "#7DD3FC", cyan: "#22B8F0", muted: "#9AA3B2", bg: "#07090E",
  line: "#1F2530", lineSoft: "#1A1F29", faint: "#5D6678", hover: "#161B25", card: "#10141C",
  onBlue: "#07090E", good: "#4ADE80", warn: "#FBBF24", bad: "#F87171",
};

export const FONTS = { regular: "NotoKufi-Regular", bold: "NotoKufi-Bold", black: "NotoKufi-Black" };
export const RADIUS = { card: 14, input: 10, pill: 999 };

export type ThemeMode = "system" | "light" | "dark";
export const ThemeContext = createContext<{ colors: Colors; dark: boolean; mode: ThemeMode; setMode: (m: ThemeMode) => void }>({
  colors: LIGHT, dark: false, mode: "system", setMode: () => {},
});
export const useTheme = () => useContext(ThemeContext);
