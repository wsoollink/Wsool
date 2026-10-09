import localFont from "next/font/local";
import { Unbounded } from "next/font/google";

// Text: Noto Kufi Arabic (Google, OFL; Arabic + Latin, variable weight 100-900),
// chosen by the owner in place of GT America Arabic. Numbers: Unbounded until
// the owner decides on Menda. Swap them here and in globals.css
// (--font-text / --font-numbers); the OG image and PDF use the same text font
// from assets/fonts (src/lib/og-text.ts).
export const textFont = localFont({
  src: "./fonts/NotoKufiArabic-Variable.woff2",
  weight: "100 900",
  variable: "--font-text-fallback",
  display: "swap",
});

export const numbersFont = Unbounded({
  weight: ["700"],
  subsets: ["latin"],
  variable: "--font-numbers-fallback",
  display: "swap",
});

export const fontVariables = `${textFont.variable} ${numbersFont.variable}`;
