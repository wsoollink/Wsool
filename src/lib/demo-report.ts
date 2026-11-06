import type { ReportData } from "@/components/reports/ReportPage";

/**
 * Demo ad report (wsool.link/r/demo): the demo creator (/demo) with a fictional brand and sample numbers, to show brands
 * and agencies what a report looks like. Nothing is stored or read from a platform.
 */
export function buildDemoReport(lang: "ar" | "en", now = new Date()): ReportData {
  const day = (n: number) => new Date(now.getTime() - n * 86_400_000);
  // Views per day over two weeks: a fast start that keeps growing slower.
  const curve = Array.from({ length: 14 }, (_, i) => Math.round(214_000 * (1 - Math.exp(-(i + 1) / 4.2))));
  const posts: ReportData["posts"] = [
    { platform: "youtube", url: "https://www.youtube.com", title: lang === "en" ? "I tried the new Najma headphones for a week" : "جربت سماعات نجمة الجديدة لمدة أسبوع", thumb: "/demo/work-1.jpg", postedAt: day(13), handle: "abdullah.tech", creator: null, lastSync: now,
      metrics: { views: 128_400, likes: 9_310, comments: 742, shares: 515, watchMinutes: 301_000, avgViewSeconds: 141 } },
    { platform: "instagram", url: "https://www.instagram.com", title: lang === "en" ? "Unboxing + first impressions" : "فتح الصندوق وأول انطباع", thumb: "/demo/work-2.jpg", postedAt: day(12), handle: "abdullah.tech", creator: null, lastSync: now,
      metrics: { views: 64_900, reach: 48_200, likes: 5_120, comments: 388, shares: 690, saves: 1_240 } },
    { platform: "threads", url: "https://www.threads.net", title: lang === "en" ? "Battery test results, honestly" : "نتيجة اختبار البطارية بصراحة", thumb: "/demo/work-3.jpg", postedAt: day(10), handle: "abdullah.tech", creator: null, lastSync: now,
      metrics: { views: 20_700, likes: 1_480, comments: 212, shares: 96 } },
  ];
  const totals: ReportData["totals"] = {};
  for (const p of posts) for (const [k, v] of Object.entries(p.metrics)) if (k !== "avgViewSeconds") totals[k as keyof typeof totals] = (totals[k as keyof typeof totals] ?? 0) + (v as number);
  return {
    brand: lang === "en" ? "Najma Headphones · Launch" : "سماعات نجمة · الإطلاق",
    lang,
    by: { name: lang === "en" ? "Abdullah bin Sultan" : "عبدالله بن سلطان", photo: "/demo/abdullah.jpg", href: "/demo", agency: false },
    posts,
    totals,
    chart: curve.map((views, i) => ({ day: day(13 - i).toISOString().slice(0, 10), views })),
    updatedAt: now,
    demo: true,
  };
}
