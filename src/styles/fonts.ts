import { IBM_Plex_Sans_Arabic, Unbounded } from "next/font/google";

// TEMPORARY free fonts. GT America Arabic (text) and Menda (numbers) replace
// these once the web license is bought: swap them here and in globals.css
// (--font-text / --font-numbers). Nothing else needs to change.
export const textFont = IBM_Plex_Sans_Arabic({
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic", "latin"],
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
