import Image from "next/image";
import { CheckCircle2, FileText, Link2, Search, ShieldCheck } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { VerifiedBadge } from "@/components/creator/VerifiedBadge";
import type { Platform } from "@/generated/prisma/enums";

/** Fictional creators for the mock-ups (the first one is the demo page's creator). */
export const CREATORS = [
  { ar: "عبدالله بن سلطان", en: "Abdullah bin Sultan", handle: "demo", followers: "2.4M", photo: "/demo/abdullah.jpg", grad: "from-[#0A6CFF] to-[#22B8F0]", platforms: ["instagram", "tiktok", "youtube"] as Platform[], spark: [4, 6, 5, 8, 7, 9, 11] },
  { ar: "سارة العتيبي", en: "Sara Alotaibi", handle: "sara.style", followers: "860K", grad: "from-[#E1306C] to-[#F77737]", platforms: ["instagram", "snapchat"] as Platform[], spark: [5, 5, 6, 7, 6, 8, 9] },
  { ar: "فهد القحطاني", en: "Fahad Alqahtani", handle: "fahad.tech", followers: "415K", grad: "from-[#12805C] to-[#34D399]", platforms: ["youtube", "x"] as Platform[], spark: [3, 4, 4, 5, 6, 6, 7] },
  { ar: "نورة الشمري", en: "Noura Alshammari", handle: "noura.food", followers: "1.1M", grad: "from-[#B45309] to-[#F59E0B]", platforms: ["tiktok", "instagram"] as Platform[], spark: [6, 7, 7, 8, 10, 9, 12] },
];

type Lang = "ar" | "en";

export function Avatar({ c, lang, size = 40 }: { c: (typeof CREATORS)[number]; lang: Lang; size?: number }) {
  if (c.photo) {
    return <Image src={c.photo} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${c.grad} font-bold text-white`} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {c[lang].slice(0, 1)}
    </span>
  );
}

function Spark({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 60},${22 - (v / max) * 20}`).join(" ");
  return (
    <svg viewBox="0 0 60 24" width="60" height="24" aria-hidden="true" className="shrink-0" style={{ direction: "ltr" }}>
      <polyline points={pts} fill="none" stroke="#0060E6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type DashText = { url: string; title: string; creators: string; total: string; verified: string; filterAll: string; filterBig: string; search: string; linked: string; updated: string };

/** The agency dashboard in a browser window (hero). */
export function DashboardMock({ t, lang }: { t: DashText; lang: Lang }) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-line bg-card shadow-[0_40px_80px_-40px_rgba(2,25,65,0.45)]">
      <div className="flex items-center gap-3 border-b border-line-soft px-4 py-3">
        <span className="flex gap-1.5" dir="ltr"><i className="size-2.5 rounded-full bg-[#FF5F57]" /><i className="size-2.5 rounded-full bg-[#FEBC2E]" /><i className="size-2.5 rounded-full bg-[#28C840]" /></span>
        <span className="flex-1 rounded-full bg-bg px-3 py-1 text-xs font-semibold" dir="ltr">{t.url}</span>
      </div>
      <div className="p-4 md:p-5">
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-gradient-to-br from-[#021941] to-[#0A3A8C] p-3 text-white">
            <p className="text-[11px] opacity-75">{t.total}</p>
            <p className="font-numbers text-xl font-black" dir="ltr">4.8M</p>
          </div>
          <div className="rounded-2xl bg-bg p-3">
            <p className="text-[11px] text-muted">{t.creators}</p>
            <p className="font-numbers text-xl font-black">24</p>
          </div>
          <div className="rounded-2xl bg-bg p-3">
            <p className="text-[11px] text-muted">{t.verified}</p>
            <p className="font-numbers text-xl font-black text-good" dir="ltr">92%</p>
          </div>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex flex-1 items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-muted"><Search size={13} /> {t.search}</span>
          <span className="rounded-full bg-navy px-3 py-1.5 text-[11px] font-bold text-on-navy">{t.filterAll}</span>
          <span className="hidden rounded-full border border-line px-3 py-1.5 text-[11px] font-bold sm:inline" dir="ltr">{t.filterBig}</span>
        </div>
        <ul className="flex flex-col">
          {CREATORS.map((c) => (
            <li key={c.handle} className="flex items-center gap-3 border-t border-line-soft py-2.5 first:border-0">
              <Avatar c={c} lang={lang} size={38} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-[13px] font-bold">{c[lang]} <VerifiedBadge size={13} /></p>
                <p className="flex items-center gap-1.5 text-muted">
                  {c.platforms.map((p) => <PlatformIcon key={p} platform={p} size={12} />)}
                  <span className="text-[11px]" dir="ltr">· {c.handle}</span>
                </p>
              </div>
              <span className="hidden md:block"><Spark data={c.spark} /></span>
              <p className="font-numbers w-12 text-end text-sm font-black" dir="ltr">{c.followers}</p>
              <span className="hidden items-center gap-1 rounded-full bg-good/10 px-2 py-1 text-[10.5px] font-bold text-good sm:inline-flex"><Link2 size={11} /> {t.linked}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Small floating cards around the hero dashboard. */
export function FloatInvite({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 pe-4 shadow-[0_20px_40px_-20px_rgba(2,25,65,0.35)]">
      <Avatar c={CREATORS[1]} lang="ar" size={34} />
      <p className="text-[13px] font-bold">{text}</p>
      <CheckCircle2 aria-hidden="true" size={18} className="text-good" />
    </div>
  );
}

export function FloatPdf({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-card p-3 pe-4 shadow-[0_20px_40px_-20px_rgba(2,25,65,0.35)]">
      <span className="flex size-9 items-center justify-center rounded-xl bg-blue/10 text-blue"><FileText aria-hidden="true" size={18} /></span>
      <p className="text-[13px] font-bold">{text}</p>
    </div>
  );
}

export function FloatWeek({ text }: { text: string }) {
  const bars = [30, 42, 38, 55, 48, 70, 88];
  return (
    <div className="w-48 rounded-2xl border border-line bg-card p-3 shadow-[0_20px_40px_-20px_rgba(2,25,65,0.35)]">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-muted">{text}</p>
        <p className="text-xs font-black text-good" dir="ltr">+24%</p>
      </div>
      <div className="flex h-12 items-end gap-1.5" dir="ltr">
        {bars.map((h, i) => <span key={i} className="flex-1 rounded-t-[4px] bg-gradient-to-t from-[#0060E6] to-[#22B8F0]" style={{ height: `${h}%`, opacity: 0.45 + i * 0.08 }} />)}
      </div>
    </div>
  );
}

/** Bento: platform rows with "Linked · updated today". */
export function LinkedRows({ linked, updated }: { linked: string; updated: string }) {
  const rows: Platform[] = ["instagram", "tiktok", "youtube"];
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((p) => (
        <li key={p} className="flex items-center gap-3 rounded-xl bg-bg px-3.5 py-2.5">
          <PlatformIcon platform={p} size={17} />
          <span className="text-sm font-bold capitalize" dir="ltr">{p === "youtube" ? "YouTube" : p === "tiktok" ? "TikTok" : "Instagram"}</span>
          <span className="ms-auto text-[11px] text-muted">{updated}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-good/10 px-2 py-0.5 text-[11px] font-bold text-good"><Link2 size={11} /> {linked}</span>
        </li>
      ))}
    </ul>
  );
}

/** Bento: team avatars with their roles. */
export function TeamRoles({ roles, lang }: { roles: string[]; lang: Lang }) {
  return (
    <div className="flex flex-col gap-2">
      {roles.map((r, i) => (
        <div key={r} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
          <Avatar c={CREATORS[i + 1]} lang={lang} size={30} />
          <span className="h-2 flex-1 rounded-full bg-bg"><span className="block h-2 rounded-full bg-navy/15" style={{ width: `${70 - i * 18}%` }} /></span>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${i === 0 ? "bg-blue text-on-blue" : i === 1 ? "bg-blue/10 text-blue" : "bg-bg text-muted"}`}>{r}</span>
        </div>
      ))}
    </div>
  );
}

/** Bento (navy card): stacked PDF pages. */
export function PdfStack({ lang }: { lang: Lang }) {
  const c = CREATORS[0];
  return (
    <div className="relative mx-auto h-44 w-64" aria-hidden="true">
      {[2, 1, 0].map((i) => (
        <div
          key={i}
          className="absolute top-0 left-1/2 h-40 w-32 rounded-xl bg-white p-2.5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]"
          style={{ transform: `translateX(-50%) translateX(${(i - 1) * 62}px) rotate(${(i - 1) * 8}deg) translateY(${Math.abs(i - 1) * 10}px)`, zIndex: i === 1 ? 3 : 1 }}
        >
          {i === 1 ? (
            <>
              <div className="mb-2 h-16 overflow-hidden rounded-lg"><Image src={c.photo!} alt="" width={120} height={64} className="h-16 w-full object-cover object-top" /></div>
              <p className="truncate text-[9px] font-bold text-[#021941]">{c[lang]}</p>
              <p className="font-numbers text-sm font-black text-[#0060E6]" dir="ltr">2.4M</p>
              <div className="mt-1.5 grid grid-cols-3 gap-1">{[0, 1, 2].map((k) => <span key={k} className="h-4 rounded bg-[#EEF3FB]" />)}</div>
            </>
          ) : (
            <div className="flex h-full flex-col gap-1.5">
              <span className="h-3 w-2/3 rounded bg-[#EEF3FB]" />
              <span className="h-12 rounded-lg bg-[#EEF3FB]" />
              <span className="h-2 rounded bg-[#EEF3FB]" />
              <span className="h-2 w-3/4 rounded bg-[#EEF3FB]" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Bento: visits per creator. */
export function VisitsBars({ lang }: { lang: Lang }) {
  const values = [92, 64, 48, 77];
  return (
    <div className="flex flex-col gap-2.5">
      {CREATORS.map((c, i) => (
        <div key={c.handle} className="flex items-center gap-3">
          <Avatar c={c} lang={lang} size={26} />
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg">
            <span className="block h-full rounded-full bg-gradient-to-l from-[#0060E6] to-[#22B8F0] rtl:bg-gradient-to-r" style={{ width: `${values[i]}%` }} />
          </span>
          <span className="font-numbers w-9 text-end text-xs font-black" dir="ltr">{values[i] * 13}</span>
        </div>
      ))}
    </div>
  );
}

/** Bento: activity log timeline. */
export function ActivityLog({ rows, lang }: { rows: string[][]; lang: Lang }) {
  return (
    <ol className="flex flex-col">
      {rows.map(([who, what, when], i) => (
        <li key={i} className="flex gap-3 pb-3 last:pb-0">
          <span className="flex flex-col items-center">
            <Avatar c={CREATORS[[3, 2, 1][i % 3]]} lang={lang} size={26} />
            {i < rows.length - 1 && <span className="mt-1 w-px flex-1 bg-line" />}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[13px]"><b>{who}</b> {what}</p>
            <p className="text-[11px] text-muted">{when}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Ownership section: the creator's view of the agency's permissions. */
export function PermissionsMock({ t, lang }: { t: { title: string; content: string; rates: string; contact: string; unlink: string }; lang: Lang }) {
  const rows: [string, boolean][] = [[t.content, true], [t.rates, true], [t.contact, false]];
  return (
    <div className="rounded-[20px] bg-white p-5 text-[#021941] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]">
      <div className="mb-4 flex items-center gap-3">
        <Avatar c={CREATORS[0]} lang={lang} size={40} />
        <div>
          <p className="text-sm font-bold">{CREATORS[0][lang]}</p>
          <p className="flex items-center gap-1 text-xs text-[#56607A]"><ShieldCheck size={13} /> {t.title}</p>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map(([label, on]) => (
          <li key={label} className="flex items-center justify-between rounded-xl bg-[#F6F8FC] px-3.5 py-2.5 text-sm font-semibold">
            {label}
            <span className={`relative h-6 w-10 rounded-full ${on ? "bg-[#0060E6]" : "bg-[#C9D1DE]"}`}>
              <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? "end-0.5" : "start-0.5"}`} />
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-xl border border-[#C0362C]/25 py-2.5 text-center text-sm font-bold text-[#C0362C]">{t.unlink}</p>
    </div>
  );
}
