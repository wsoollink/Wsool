import { Image } from "expo-image";
import { useI18n } from "../i18n";
import { useTheme } from "../lib/theme";

const LOGOS = {
  ar: { light: require("../../assets/brand/logo-ar.png"), dark: require("../../assets/brand/logo-ar-dark.png") },
  en: { light: require("../../assets/brand/logo-en.png"), dark: require("../../assets/brand/logo-en-dark.png") },
};

/** Wsool logo in the app language (white word in dark mode). */
export function Logo({ height = 30 }: { height?: number }) {
  const { lang } = useI18n();
  const { dark } = useTheme();
  return <Image source={LOGOS[lang][dark ? "dark" : "light"]} style={{ height, width: height * 3.2 }} contentFit="contain" accessibilityLabel={lang === "ar" ? "وصول" : "Wsool"} />;
}
