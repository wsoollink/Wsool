import localFont from "next/font/local";

// Noto Kufi Arabic (Google, OFL; Arabic + Latin), chosen by the owner in place
// of GT America Arabic (text) and Menda (numbers). Text uses the variable file
// (weights 100-900); big numbers always use the Black (900) cut, whatever
// weight a class asks for. Swap them here and in globals.css
// (--font-text / --font-numbers); the OG image and PDF use the same files from
// assets/fonts (src/lib/og-text.ts).
export const textFont = localFont({
  src: "./fonts/NotoKufiArabic-Variable.woff2",
  weight: "100 900",
  variable: "--font-text-fallback",
  display: "swap",
});

export const numbersFont = localFont({
  src: "./fonts/NotoKufiArabic-Black.woff2",
  weight: "100 900",
  variable: "--font-numbers-fallback",
  display: "swap",
});

export const fontVariables = `${textFont.variable} ${numbersFont.variable}`;
