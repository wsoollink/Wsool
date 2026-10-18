import { Image } from "expo-image";
import { useI18n } from "../i18n";
import { useTheme } from "../lib/theme";

const LOGOS = {
  ar: { light: require("../../assets/brand/logo-ar.png"), dark: require("../../assets/brand/logo-ar-dark.png") },
  en: { light: require("../../assets/brand/logo-en.png"), dark: require("../../assets/brand/logo-en-dark.png") },
};

/** Wsool logo in the app language (white word in dark mode, or always on a dark background with `onDark`). */
export function Logo({ height = 30, onDark }: { height?: number; onDark?: boolean }) {
  const { lang } = useI18n();
  const { dark } = useTheme();
  return <Image source={LOGOS[lang][dark || onDark ? "dark" : "light"]} style={{ height, width: height * 3.2 }} contentFit="contain" accessibilityLabel={lang === "ar" ? "وصول" : "Wsool"} />;
}
