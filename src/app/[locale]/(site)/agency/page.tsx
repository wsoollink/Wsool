import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck, ExternalLink, FileText, Link2, LogOut } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { DashboardSwitch } from "@/components/DashboardSwitch";
import { PendingSubmit } from "@/components/PendingSubmit";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangPill } from "@/components/dashboard/LangPill";
import { Panel } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { getMembership, roleAtLeast } from "@/lib/agency";
import { getCurrentUser, loginUrl } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCompact, formatNumber } from "@/lib/format";
import { notificationText } from "@/lib/notify";
import { initials } from "@/lib/initials";
import { signOut } from "../login/actions";
import { Directory } from "./Directory";
import { AddMember, ConfirmAction, InviteCreator, ManageButton } from "./Controls";
import { PageEditor, type EditorInitial } from "./PageEditor";
import { BillingPlans, type BillingPlanCard } from "./Billing";
import { AGENCY_CREATOR_LIMIT } from "@/config/agency-plans";
import { SUPPORT_EMAIL } from "@/config/site";
import { siteOrigin } from "@/lib/site-url";

/** "الاشتراك" tab: current plan + usage, and the plans to ask for (managers and the owner; no online payment yet). */
async function BillingTab({ agencyId, lang }: { agencyId: string; lang: Locale }) {
  const [t, ta, a, used] = await Promise.all([
    getTranslations("AgencyBilling"),
    getTranslations("Agencies"),
    db.agency.findUniqueOrThrow({ where: { id: agencyId }, select: { name: true, kind: true, plan: true, planCycle: true, planUntil: true } }),
    db.agencyLink.count({ where: { agencyId, status: { in: ["active", "pending"] } } }),
  ]);
  const limit = AGENCY_CREATOR_LIMIT[a.plan];
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "long" });
  const cards = (ta.raw("plans") as Omit<BillingPlanCard, "key">[]).map((p, i) => ({ ...p, key: (["starter", "growth", "custom"] as const)[i] })).filter((p) => p.key);
  return (
    <div className="flex flex-col gap-5">
      <Panel title={t("current")}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-xl font-black">
              {t(`plan.${a.plan}`)}
              {a.planCycle && a.plan !== "trial" && <Pill tone="blue" dot={false}>{t(`cycle.${a.planCycle}`)}</Pill>}
            </p>
            <p className="mt-1 text-sm text-muted">
              {a.plan === "trial" ? t("trialNote") : a.planUntil ? t("until", { date: date.format(a.planUntil) }) : t("openEnded")}
            </p>
          </div>
          <div className="rounded-xl border border-line px-4 py-3 md:min-w-56">
            <p className="text-xs text-muted">{t("usage")}</p>
            <p className="font-numbers text-lg font-black">{limit === null ? t("unlimited", { n: formatNumber(used, lang) }) : t("usageOf", { n: formatNumber(used, lang), limit: formatNumber(limit, lang) })}</p>
            {limit !== null && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
                <div className={`h-full rounded-full ${used >= limit ? "bg-bad" : "bg-blue"}`} style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
              </div>
            )}
          </div>
        </div>
      </Panel>
      {a.kind === "agency" ? (
        <Panel title={t("plansTitle")}>
          <BillingPlans plans={cards} current={a.plan} agency={a.name} features={ta.raw("planFeatures") as string[]} />
          <p className="mt-4 text-sm text-muted">{t("payNote")}</p>
          <p className="mt-1 text-sm text-muted">{t("email", { email: SUPPORT_EMAIL })}</p>
        </Panel>
      ) : (
        <Panel title={t("plansTitle")}>
          <p className="text-sm text-muted">{t("brandNote")}</p>
          <p className="mt-1 text-sm text-muted">{t("email", { email: SUPPORT_EMAIL })}</p>
        </Panel>
      )}
    </div>
  );
}

/** "صفحة الوكالة" tab: the public page editor (managers and the owner). */
async function PageTab({ agencyId }: { agencyId: string }) {
  const a = await db.agency.findUniqueOrThrow({
    where: { id: agencyId },
    include: {
      links: {
        where: { status: "active" },
        orderBy: [{ sort: "asc" }, { decidedAt: "asc" }],
        select: { id: true, agencyHidden: true, showOnPage: true, page: { select: { username: true, photoUrl: true, primaryLang: true, translations: { select: { lang: true, fullName: true } } } } },
      },
    },
  });
  const initial: EditorInitial = {
    slug: a.slug ?? "", published: a.pagePublished, name: a.name, nameEn: a.nameEn ?? "", tagline: a.tagline ?? "", taglineEn: a.taglineEn ?? "",
    bio: a.bio ?? "", bioEn: a.bioEn ?? "", city: a.city ?? "", cityEn: a.cityEn ?? "", logoUrl: a.logoUrl, whatsapp: a.whatsapp ?? "",
    email: a.email ?? "", website: a.website ?? "", template: a.template, accent: a.accent,
    creators: a.links.map((l) => ({
      linkId: l.id, username: l.page.username, photoUrl: l.page.photoUrl, hidden: l.agencyHidden, creatorHidden: !l.showOnPage,
      name: l.page.translations.find((x) => x.lang === l.page.primaryLang)?.fullName || l.page.translations[0]?.fullName || l.page.username,
    })),
  };
  return <PageEditor initial={initial} origin={siteOrigin()} />;
}

export const metadata: Metadata = { robots: { index: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;

/** The agency's dashboard: linked creators with their numbers, invites, and the team (owner, Nov 2026, phase 1). */
async function AgencyDashboard({ lang, searchParams }: { lang: Locale; searchParams: SP }) {
  const me = await getCurrentUser();
  if (!me) redirect(await loginUrl());
  const m = await getMembership(me);
  if (!m) notFound();
  const t = await getTranslations("AgencyApp");
  const sp = await searchParams;
  const brand = m.agency.kind === "brand";
  // Brand accounts only search the directory; agencies also manage creators.
  const tabs = brand ? (["directory", "team", "billing"] as const) : (["creators", "page", "directory", "team", "billing"] as const);
  const tab = (tabs as readonly string[]).includes(sp.tab as string) ? (sp.tab as (typeof tabs)[number]) : tabs[0];
  const canInvite = roleAtLeast(m.member.role, "manager");
  const canEdit = roleAtLeast(m.member.role, "editor");
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium" });

  const [links, members, ownPage, updates] = await Promise.all([
    tab !== "creators" ? Promise.resolve([]) : db.agencyLink.findMany({
      where: { agencyId: m.agency.id, status: { in: ["active", "pending"] } },
      orderBy: { invitedAt: "desc" },
      include: {
        page: {
          select: {
            username: true, photoUrl: true, primaryLang: true,
            translations: { select: { lang: true, fullName: true } },
            socialAccounts: { select: { followers: true, verificationStatus: true, connection: { select: { status: true } } } },
          },
        },
      },
    }),
    tab === "team" ? db.agencyMember.findMany({ where: { agencyId: m.agency.id }, orderBy: { invitedAt: "asc" } }) : Promise.resolve([]),
    db.page.findUnique({ where: { userId: me.id }, select: { username: true } }),
    // Agency notifications (a creator accepted / unlinked): members without a creator page have no bell, so they show here.
    tab === "creators" ? db.notification.findMany({ where: { userId: me.id, type: { in: ["agency_accepted", "agency_ended"] } }, orderBy: { createdAt: "desc" }, take: 5 }) : Promise.resolve([]),
  ]);
  const active = links.filter((l) => l.status === "active");
  const pending = links.filter((l) => l.status === "pending");
  const nameOf = (p: (typeof links)[number]["page"]) => p.translations.find((x) => x.lang === p.primaryLang)?.fullName || p.translations[0]?.fullName || p.username;
  const followersOf = (p: (typeof links)[number]["page"]) => p.socialAccounts.reduce((s, a) => s + Number(a.followers ?? 0), 0);
  const total = active.reduce((s, l) => s + followersOf(l.page), 0);
  const accounts = active.flatMap((l) => l.page.socialAccounts);
  const verified = accounts.filter((a) => a.verificationStatus === "verified").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue">{m.agency.name}</p>
          <h1 className="text-2xl font-black md:text-3xl">{tab === "directory" ? t("directoryTitle") : t("title")}</h1>
          <p className="text-sm text-muted">{tab === "directory" ? t("directorySub") : t("sub")}</p>
        </div>
        <nav aria-label={t("title")} className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-card p-1">
          {tabs.map((k) => (
            <Link key={k} href={k === tabs[0] ? "/agency" : `/agency?tab=${k}`} aria-current={tab === k ? "page" : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-bold whitespace-nowrap ${tab === k ? "bg-navy text-on-navy" : "text-muted hover:text-navy"}`}>
              {t(`tabs.${k}`)}
            </Link>
          ))}
        </nav>
      </div>

      {tab === "billing" ? (
        canInvite ? <BillingTab agencyId={m.agency.id} lang={lang} /> : <p className="text-sm text-muted">{t("viewerNote")}</p>
      ) : tab === "page" ? (
        canInvite ? <PageTab agencyId={m.agency.id} /> : <p className="text-sm text-muted">{(await getTranslations("AgencyPageEditor"))("viewerNote")}</p>
      ) : tab === "directory" ? (
        <Directory lang={lang} sp={sp} userId={me.id} canInvite={!brand && canInvite} />
      ) : tab === "creators" ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { k: "creators", v: formatNumber(active.length, lang), hot: true },
              { k: "followers", v: formatCompact(total, lang) },
              { k: "verified", v: `${formatNumber(verified, lang)} / ${formatNumber(accounts.length, lang)}` },
              { k: "pending", v: formatNumber(pending.length, lang) },
            ].map((x) => (
              <div key={x.k} className={`rounded-card p-4 ${x.hot ? "bg-gradient-to-br from-[#021941] to-[#0A3A8C] text-white" : "border border-line bg-card shadow-card"}`}>
                <p className={`text-xs ${x.hot ? "opacity-75" : "text-muted"}`}>{t(`kpi.${x.k}`)}</p>
                <p className="font-numbers mt-1 text-2xl font-black" dir={x.k === "verified" ? "ltr" : undefined}>{x.v}</p>
              </div>
            ))}
          </div>

          <Panel title={t("creatorsTitle")} flush>
            {active.length === 0 ? (
              <p className="p-5 text-sm text-muted">{t("empty")}</p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {active.map((l) => {
                  const name = nameOf(l.page);
                  const linked = l.page.socialAccounts.filter((a) => a.connection?.status === "active").length;
                  const ver = l.page.socialAccounts.filter((a) => a.verificationStatus === "verified").length;
                  return (
                    <li key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                      {l.page.photoUrl ? (
                        <Image src={l.page.photoUrl} alt="" width={44} height={44} unoptimized className="size-11 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span aria-hidden="true" className="brand-gradient inline-flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white uppercase">{initials(name)}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{name}</p>
                        <p className="text-xs text-muted" dir="ltr"><span className="rtl:float-right">wsool.link/{l.page.username}</span></p>
                      </div>
                      <div className="text-end">
                        <p className="font-numbers text-lg font-black">{formatCompact(followersOf(l.page), lang)}</p>
                        <p className="flex items-center gap-2 text-[11.5px] text-muted">
                          <span className="inline-flex items-center gap-1"><Link2 aria-hidden="true" size={12} />{t("linked", { n: linked })}</span>
                          <span className="inline-flex items-center gap-1"><BadgeCheck aria-hidden="true" size={12} />{t("verifiedN", { n: ver })}</span>
                        </p>
                      </div>
                      <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
                        {(["content", "rates", "contact"] as const).filter((k) => ({ content: l.canContent, rates: l.canRates, contact: l.canContact })[k]).map((k) => (
                          <Pill key={k} tone="blue" dot={false}>{t(`perm.${k}`)}</Pill>
                        ))}
                      </div>
                      <div className="flex w-full items-center gap-1 sm:w-auto">
                        {canEdit && <ManageButton linkId={l.id} />}
                        <a href={`/${l.page.username}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-[13px] font-bold hover:bg-hover"><ExternalLink aria-hidden="true" size={14} />{t("page")}</a>
                        <a href={`/${l.page.username}/pdf?download`} className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-[13px] font-bold hover:bg-hover"><FileText aria-hidden="true" size={14} />{t("pdf")}</a>
                        {canInvite && <ConfirmAction kind="removeCreator" id={l.id} label={t("remove")} confirm={t("confirmRemove", { name })} />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {pending.length > 0 && (
            <Panel title={t("pendingTitle")} flush>
              <ul className="divide-y divide-line-soft">
                {pending.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{nameOf(l.page)}</p>
                      <p className="text-xs text-muted">{t("invitedOn", { date: date.format(l.invitedAt) })}</p>
                    </div>
                    <Pill tone="warn">{t("pendingTitle")}</Pill>
                    {canInvite && <ConfirmAction kind="cancelInvite" id={l.id} label={t("cancel")} />}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {canInvite ? <Panel title={t("inviteTitle")}><InviteCreator /></Panel> : <p className="text-sm text-muted">{t("viewerNote")}</p>}

          {updates.length > 0 && (
            <Panel title={t("updatesTitle")} flush>
              <ul className="divide-y divide-line-soft">
                {updates.map((n) => {
                  const text = notificationText(n.type, n.data, lang);
                  return text ? (
                    <li key={n.id} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
                      <p className="min-w-0 flex-1 text-sm"><b>{text.title}</b> <span className="text-muted">{text.body.split("\n")[0]}</span></p>
                      <span className="text-xs text-muted">{date.format(n.createdAt)}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            </Panel>
          )}
        </>
      ) : (
        <Panel title={t("teamTitle")} flush>
          <p className="px-5 pt-4 text-sm text-muted">{t("teamHint")}</p>
          <ul className="divide-y divide-line-soft">
            {members.map((mem) => (
              <li key={mem.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span aria-hidden="true" className="brand-gradient inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white uppercase">{mem.email[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold" dir="ltr"><span className="rtl:float-right">{mem.email}</span></p>
                  {!mem.userId && <p className="text-xs text-muted">{t("memberPending")}</p>}
                </div>
                <Pill tone={mem.role === "owner" ? "blue" : "grey"} dot={false}>{t(`roles.${mem.role}`)}</Pill>
                {canInvite && mem.role !== "owner" && mem.id !== m.member.id && (mem.role !== "manager" || m.member.role === "owner") && (
                  <ConfirmAction kind="removeMember" id={mem.id} label={t("removeMember")} confirm={t("confirmRemoveMember", { email: mem.email })} />
                )}
              </li>
            ))}
          </ul>
          {canInvite && <div className="border-t border-line-soft p-5"><AddMember /></div>}
        </Panel>
      )}

      {ownPage && (
        <p className="text-sm text-muted"><Link href="/dashboard" className="font-semibold text-blue">{t("myPage")}</Link> · <span dir="ltr">wsool.link/{ownPage.username}</span></p>
      )}
    </div>
  );
}

export default async function AgencyPage({ params, searchParams }: PageProps<"/[locale]/agency">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("AgencyApp");
  return (
    <div className="app-backdrop flex min-h-dvh flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-4 py-3">
          <Link href="/agency" className="flex min-h-11 items-center" aria-label={t("title")}>
            <BrandLogo lang={locale === "en" ? "en" : "ar"} alt={locale === "en" ? "Wsool" : "وصول"} className="h-7 w-auto" priority />
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Suspense fallback={null}><DashboardSwitch current="agency" /></Suspense>
            <ThemeToggle bare />
            <LangPill current={locale} />
            <form action={signOut} data-nav>
              <PendingSubmit label={t("signOut")} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-hover" icon={<LogOut aria-hidden="true" size={18} />} />
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-6 md:py-8">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-card" />}>
          <AgencyDashboard lang={locale} searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
