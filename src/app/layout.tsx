import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "وصول | Wsool",
  description: "Media kit pages for content creators.",
};

// Language/direction handling (ar default RTL, en LTR) is added in the i18n step.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
