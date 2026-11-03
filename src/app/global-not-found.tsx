import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import { fontVariables } from "@/styles/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "الصفحة غير موجودة · Page not found | وصول",
  robots: { index: false },
};

/**
 * 404 for addresses that match no route at all, e.g. /dashboard/typo or /<username>/xyz (owner audit, Nov 2026). The app has
 * several root layouts (site, creator pages), so Next.js renders this page on its own: no layout, no language cookie,
 * so it speaks both languages. Plain <a> links: a full load gets the visitor back into the normal layouts.
 */
export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl" className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-bg-marketing text-navy">
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-5 px-4 py-16 text-center">
          <BrandLogo lang="ar" alt="وصول" className="h-9 w-auto" />
          <p className="font-numbers bg-gradient-to-l from-[#0060E6] to-[#22B8F0] bg-clip-text text-7xl font-black text-transparent">404</p>
          <h1 className="text-2xl font-black">الصفحة اللي تدورها غير موجودة</h1>
          <p className="text-muted">يمكن الرابط فيه خطأ، أو الصفحة انتقلت.</p>
          <p className="text-sm text-muted" dir="ltr" lang="en">This page doesn&apos;t exist. The link may be wrong or the page has moved.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full load back into the site layout */}
            <a href="/" className="inline-flex min-h-11 items-center rounded-full bg-[#021941] px-6 text-sm font-bold text-white dark:bg-[#7DD3FC] dark:text-[#021941]">الصفحة الرئيسية · Home</a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/dashboard" className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-6 text-sm font-bold">لوحة التحكم · Dashboard</a>
          </div>
        </main>
      </body>
    </html>
  );
}
