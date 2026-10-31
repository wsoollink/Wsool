# Wsool (وصول) — Project guide for Claude Code

Read this file fully before any task. It is the source of truth for product decisions.
The owner (Ibrahim) is not a professional developer: explain what you did in short, clear
**Arabic (Saudi dialect is fine)**, one step at a time, and ask before anything destructive.

---

## 1. What we are building

Wsool is a media-kit platform for content creators. Each creator gets a public page at
`wsool.link/<username>` showing their profile, verified follower numbers, brands they worked
with, past work, ad rates, and direct contact (WhatsApp + email). Brands open the link the
creator shares. There is **no brand directory** in v1.

Surfaces:
1. **Public creator page** — `wsool.link/<username>` (8 templates, Arabic + English).
2. **Creator dashboard** — `wsool.link/dashboard/...` (11 sections, Arabic + English).
3. **Sign-up & onboarding** — 7 steps.
4. **Marketing site** — home + pricing (Arabic + English).
5. **Admin panel** — `wsool.link/admin/...` (owner + staff with permissions).
6. **PDF media kit** — generated from the creator's data, in their template.
7. **Transactional emails** — 15 emails (via Resend).

---

## 2. Tech stack (decided)

- **Next.js (App Router) + TypeScript + Tailwind CSS**
- **Supabase**: Postgres, Auth, Storage, scheduled jobs
- **Prisma** as ORM against the Supabase Postgres
- **Resend** for transactional email, sent from `mail.wsool.link` (never from the personal mailbox)
- **Mailboxes**: `support@wsool.link` and `billing@wsool.link` are aliases of the owner's Google Workspace
  inbox (`ibrahim@wsool.link`; MX on `wsool.link` = Google, don't touch). Constants `SUPPORT_EMAIL` /
  `BILLING_EMAIL` in `src/config/site.ts`: support = reply-to of every email + "Contact support" in the
  dashboard; billing = invoices + reply-to of billing notifications (`billing: true` in `NOTIFICATIONS`).
- **Payments**: Saudi gateway, **Moyasar** (owner, Oct 2026: application sent, awaiting approval). Build behind a
  `PaymentProvider` interface so the provider can be swapped. Must support mada, Apple Pay,
  international cards, and recurring billing.
- **Hosting**: Netlify (switched from Vercel: its phone verification never reached Saudi
  numbers, and its free plan is non-commercial). Config in `netlify.toml`. Domain `wsool.link`
  is on Cloudflare: `@` and `www` are CNAMEs to `graceful-fox-a6c2f5.netlify.app`, **DNS only** (grey cloud, so
  Netlify issues the certificate); `wsool.link` is the primary domain in Netlify, so its `URL` env var (used by
  `siteOrigin()`) is `https://wsool.link` and `NEXT_PUBLIC_SITE_URL` is not set. DMARC via Cloudflare DMARC
  Management (`p=none`, monitoring) since Oct 2026. Netlify env: Supabase keys, DB URLs, `OWNER_EMAIL`,
  `RESEND_API_KEY`, `CRON_SECRET`, `ANTHROPIC_API_KEY` (secrets marked secret; `NEXT_PUBLIC_*` must never be).
- **i18n**: `next-intl` (or equivalent) with `ar` (default, RTL) and `en` (LTR).

### Non-negotiable engineering rules
- **Never commit secrets.** All keys live in `.env.local` (git-ignored) and in Netlify env vars.
  Provide `.env.example` with empty values.
- Public creator pages must be **server-rendered** (SEO + link previews with Open Graph image).
- Enable **Row Level Security** on every Supabase table. A creator can only read/write their own rows.
  Public page data is read through a server-side query, never by exposing other users' rows.
- Validate every input on the server (zod).
- Mobile-first. Every screen must work at 360px wide. Text fields are at least 16px on touch screens
  (rule in `globals.css`), otherwise iPhone Safari zooms the page when a field is tapped.
- Accessibility: real `<button>`/`<a>`, labels on inputs, visible focus, 44px touch targets.
- Small commits with clear messages. Run the app and fix errors before saying a step is done.

---

## 3. Language & formatting rules

- Arabic is the primary language, RTL. English is LTR.
- **All numbers everywhere use Western digits 0–9**, also in Arabic (no ٠١٢٣).
- Platform names always in English (TikTok, Instagram, X, YouTube, Snapchat, Threads, Telegram, Facebook, LinkedIn,
  Pinterest, Twitch, Jaco, Discord, Spotify).
- Creator page opens in the visitor's device language if the creator enabled it; otherwise the creator's primary language.
- Creators write their own English content. **No auto-translation.**
- Currency: Arabic site prices in SAR, English site in USD. The dashboard shows the currency the creator subscribed in.

---

## 4. Brand & design tokens

Logos: Arabic and English logo files (owner will add to `/public/brand/`).

| Token | Value | Use |
| --- | --- | --- |
| navy | `#021941` | text, dark buttons |
| blue | `#0060E6` | interactive accent (passes contrast) |
| logo blue | `#0A6CFF` | decorative only, gradients |
| cyan | `#22B8F0` | gradient partner |
| muted | `#56607A` | secondary text |
| bg | `#F6F8FA` / `#F6F8FC` | app / marketing background |
| line / line-soft | `#E3E8EE` / `#EBEEF3` | card borders / rows inside cards |
| good / warn / bad | `#12805C` / `#B45309` / `#C0362C` | status |

Fonts: text = **Noto Kufi Arabic** (Google, free OFL license; Arabic + Latin, variable weight
100-900), chosen by the owner (Oct 2026) instead of the commercial GT America Arabic. Web file:
`src/styles/fonts/NotoKufiArabic-Variable.woff2` (loaded with `next/font/local` in
`src/styles/fonts.ts`); OG image and PDF use the static Regular/Bold TTFs in `assets/fonts/`.
Big numbers: the same font's **Black (900)** cut (owner, instead of Menda), forced whatever weight a
class asks for (`NotoKufiArabic-Black.woff2` / `.ttf`). Both sit behind the CSS variables
`--font-text` and `--font-numbers` so they can be swapped in one place. Emails use system fonts.

Dashboard style (**Stripe-style redesign**, owner approved Oct 2026): flat `bg` page, white cards (radius 14px,
hairline `line` border, very soft shadow), pill-shaped buttons (`buttonClasses`: primary blue, secondary white + border;
44px on touch screens, 38px with a mouse via `pointer-fine:`). Shared pieces: `Card` / `Panel` (title row + divider)
in `src/components/ui/Card.tsx`, `Pill` (status badge), `KpiStrip` (numbers in one bordered strip, sparklines),
`src/components/charts/` (`AreaChart`: current period + dashed previous, hover tooltip, time runs left→right in both
languages; tooltip texts are precomputed `text` because functions can't be passed to client components; `Sparkline`),
shell class strings in `src/components/ui/styles.ts` (`navRow`, `navRowActive`, `iconButton`, `topBar`).

**Dark mode** (owner, Oct 2026) for the marketing site, dashboard, admin, login and legal pages (never creator pages:
they follow the creator's template). Colours are CSS variables (`@theme`, not `inline`, in `globals.css`) with a
`[data-theme="dark"]` set taken from the dashboard design's dark theme (bg `#07090E`, text `#F2F4F8`, accent `#7DD3FC`).
`THEME_SCRIPT` (`src/components/ThemeToggle.tsx`, in the site root layout's `<head>`) sets `data-theme` before paint
from `localStorage["wsool-theme"]`, else the device setting. Rules: use `bg-card` (never `bg-white`) for surfaces,
`text-on-blue` / `text-on-navy` for text on solid colours, `BrandLogo` for the logo (white-word `logo-*-dark.png`),
`dark:` variant when needed. Toggle: dashboard header (desktop) + phone menu, admin sidebar + phone header,
marketing header (desktop and phones; on phones `marketing.css` shrinks the logo and gaps to make room). Marketing: `scripts/design-to-tsx.py` (`theme_value`) maps the design's inline colours to
`--mk-*` variables (`marketing.css`) by property; navy gradient cards keep their colours in both modes; small one-colour dark icon images get `.mk-icon` (`is_dark_icon`) and turn white in dark (`filter: invert(1)`).

---

## 5. Creator page (public)

Order (mobile): hero square photo fading into background · name + verified badge · specialty
(accent color) · bio · country/city (country first everywhere: page, PDF, forms; owner) · licenses (only if any) · total followers (animated count-up)
· social icons row · tags (3 per row, max 18 chars, no wrap) · monthly views box · platform cards
grid (tap → audience pop-up if data exists) · brand logos (auto-scrolling marquee) · past work
(auto-scrolling row, tap → portrait video pop-up) · **ad rates** · contact (WhatsApp + email)
· footer "صنعت بـ❤️ وصول" (hideable on Pro).
Desktop: left sticky sidebar with photo, info and contact; main column with the rest.

**8 templates**: White, Black (glass), Sand, Pink, Black & Gold, Vivid, Green, **Custom**
(creator picks 1–2 colors + light/dark; palette is derived automatically, with contrast guards).
Templates are fixed: there is **no visitor light/dark toggle**.
Creator can also pick an accent color (Appearance) and the photo shape (Edit page photo card: full = square fading into the page, or circle).
**Account icons style** (owner, Oct 2026, all plans): Appearance card "شكل أيقونات الحسابات" sets `pages.icon_style`
(`solid` default = circle in the template's text colour with the glyph in its background colour, `color` = brand-colour
rounded squares with white glyphs (`BRAND_COLORS`), `outline` = Tabler outline glyphs (MIT, `OUTLINE_ICON_PATHS`, Jaco
hand-drawn) in the text colour), in `src/components/creator/icon-styles.ts` + `SocialIcon.tsx`. Only the icons row under
total followers uses it (not platform cards, PDF or OG).
Big numbers always use the wide Black cut (the number-font choice was removed by the owner, Oct 2026).

**Licenses**: a flexible list. Each item = free-text name (e.g. "رخصة موثوق") + number + optional
file (opens in a pop-up). Section hidden if empty.

**Ad rates**: per platform, the creator adds their own rate types (name + price, add/delete).
Optional **bundle**: chosen platforms + its own rate types; show "instead of X" and savings %
only when the same type name exists on every included platform. Toggles: show on page,
show in PDF, currency, VAT included or not. Hidden → show "الأسعار عند التواصل".

---

## 6. Plans, trial, pricing

- **Free** and **Pro**. Pro = **SAR 49/month or SAR 490/year** (USD 13 / 130 on the English site).
  Prices are fixed in every country and **include VAT**.
- Every new account automatically gets a **14-day Pro trial, no card**. Reminder emails at
  day 10, day 13, and day 14. If not subscribed, the page drops to Free; **no data is deleted**.
- Free plan (owner, Oct 2026): page + link, 2 templates (White, Black), brand logos strip, 6 past works, contact,
  3 links + 3 services. Pro only: **ad rates and audience data** (hidden on Free pages, saved data kept; Free creators
  see a `ProNotice` in those sections), **platform connections** (linking + daily auto-update), verified badge, analytics, PDF, hiding the Wsool footer, all templates,
  unlimited works. All limits live in `FREE_LIMITS` (`src/config/plans.ts`), applied in `shapePage()`; the
  Subscription page comparison (`PlanPicker`) reads the same config.

---

## 7. Verification

- Creator uploads a screenshot of each account page showing the username and follower count.
- Staff review in the admin panel within 48h: three checkboxes must be ticked to approve;
  rejecting requires a reason from a preset list (sent to the creator by email + notification).
- Verification is valid **90 days**; reminder 7 days before expiry.
- Statuses: none, in review, verified, expiring soon, rejected.

---

## 8. Dashboard sections

Home · Edit page · Accounts & numbers · Brands & work · **Ad rates** · **Links & services** · Contact · Verification ·
Appearance · Analytics · Subscription · Notifications (bell with unread dot in every header).
Mobile: ☰ menu in every page header opening a side drawer with all sections (owner, Oct 2026; replaced the
bottom tab bar). The drawer is one scrolling column (card, sections, footer) with 40px rows so nothing hides behind
a fixed footer on short screens. Collapsible rows are buttons, not `<details>` (iOS underlined `<summary>` text). Desktop: left sidebar.
Subscription page also holds **self-service account deletion**: download data → type username
to confirm → page hidden immediately → 30-day undo window → permanent deletion and link released.

---

## 9. Admin panel

Pages: Overview · Verification queue · Users · Subscriptions & payments · **Finance** · Team & permissions.
- Owner has all permissions and cannot be edited.
- Staff roles (presets): Verifier, Support, Finance, Custom. Permissions toggled per member:
  view/decide verifications, view/edit users, extend trial, suspend accounts, view revenue, refund.
  Only the owner can invite members, change permissions, or change platform settings.
- Every admin action is written to an **audit log** (who, what, when).
- Finance: revenue (auto from subscriptions), expenses (manual, categories, recurring), P&L,
  unit economics (MRR growth, ARPU, churn, LTV, CAC), and a **read-only investor link**
  (choose sections + period, expiry, optional password, no personal user data, PDF export).

---

## 10. Data model (starting point — refine as needed)

users · pages (username, primary_lang, en_enabled, template, custom_colors, accent,
number_font, hide_branding, is_published, deleted_at) · page_translations (lang, full_name,
specialty, bio, city, country) · tags · licenses (name, number, file_url, sort) ·
social_accounts (platform, handle, url, followers, followers_updated_at, verification_status,
verified_until, sort) · audience_data (account_id, gender, ages, countries, cities, updated_at) ·
monthly_views (month, views) · brand_logos (logo_url, name, sort) · portfolio_items
(+ translations: brand, type, platform, video_url, thumb_url, sort) · rate_settings (show_on_page,
show_in_pdf, currency, vat_included) · rates (account_id, name, price, sort) · rate_bundles +
bundle_platforms + bundle_rates · verification_requests (account_id, screenshot_url, status,
reason, reviewed_by, reviewed_at) · subscriptions (plan, cycle, currency, status, trial_ends_at,
current_period_end, provider_ids) · invoices · page_views · contact_clicks · notifications ·
notification_settings · admin_members (role, permissions json, active) · audit_log ·
expenses · investor_links · reserved_usernames.

Username rules: lowercase a–z, 0–9, dot, underscore, 3–20 chars, not reserved
(admin, dashboard, api, wsool, login, signup, pricing, help, support, …). Changeable once every 30 days.

---

## 11. Build phases (do them in order)

1. **Foundation**: project setup, i18n + RTL, design tokens, Supabase + Prisma, auth
   (email OTP + Google; Apple later), username claim, dashboard shell.
2. **Creator page**: public page with 8 templates, both languages, 404 / hidden-page states, OG image.
3. **Dashboard editing**: edit page, accounts, brands & work, ad rates, contact, appearance.
4. **Verification + admin**: uploads, review queue, users, team & permissions, audit log.
5. **Payments**: provider interface, trial logic, subscriptions, invoices, billing emails.
6. **Launch pieces**: analytics, PDF media kit, all emails & notifications, marketing site, finance.
   - **Newsletter signup** on the marketing site (Arabic + English), a section just above the
     footer: email field + subscribe button + one line saying what subscribers will receive.
     - Double opt-in: send a confirmation email; add the address only after it is confirmed.
     - Unsubscribe link in every email.
     - Table `newsletter_subscribers` (email, lang, status, source, confirmed_at,
       unsubscribed_at), no duplicate emails.
     - Sent through Resend from `mail.wsool.link`.
     - Admin panel: subscriber count + CSV export.
   - **Footer social icons** on the marketing site (Arabic + English) for Wsool's own accounts:
     Instagram, TikTok, X, Snapchat, YouTube, Facebook (+ Threads and Telegram, added by the owner).
     Links are filled in `SOCIAL_LINKS` (`src/config/site.ts`); YouTube is empty for now (no icon).
     Component: `src/components/site/SocialLinks.tsx`, to be placed per the approved design.
     - Links live in one config file (site-config).
     - A platform with an empty link shows no icon.
     - Links open in a new tab; every icon has a descriptive accessible name for screen readers.
   - **Approved design** for both: the owner's marketing homepage design. Newsletter = a card
     just above the footer (mail icon, title, description, email field + button, error
     message, green success state). Social icons = a "Follow us" (تابعنا) row under the Wsool
     description in the footer. Match that design exactly when building them; ask the owner
     for the design file if it is not in the repo yet.

Before starting each phase: write a short plan in Arabic and wait for the owner's "تمام".

**Business brief** (owner, Oct 2026): `docs/business-brief.md` is the non-technical summary of Wsool (product, plans, growth
tools, company, what's left) that the owner keeps in a claude.ai Project (synced from GitHub) for marketing and expansion
planning. **Update it in the same commit whenever a feature, price, plan limit, platform connection, growth tool or
company detail changes**, and bump its "آخر تحديث" date. Arabic, no code, no secrets, no real user numbers.

**Before the official launch**: walk the owner through `docs/launch-checklist.md` (security/2FA, Supabase Pro,
Resend, payment gateway, seller + legal details, DMARC, final checks). Remind them whenever they mention launching.

---

## 12. Decisions added by the owner (Phase 1)

1. **Creator URL has no language prefix.** It is always `wsool.link/<username>` (never `/ar/...`
   or `/en/...`). The creator page language comes from the creator's settings + the visitor's
   device language (section 3). Other surfaces (marketing, dashboard, admin, auth) must use a
   locale scheme that never collides with `/<username>`: language is stored in a cookie /
   detected from `Accept-Language`, not in the path, and every top-level route segment is a
   reserved username.
2. **Ownership checks on the server.** Prisma connects as a privileged role and bypasses RLS,
   so RLS is a second line of defense only. Every server action / route handler that touches
   creator data must: get the signed-in user from the Supabase session on the server (never
   trust a user id from the client), then scope every query by that user's id
   (`where: { userId }` / ownership check before update/delete) through shared helpers.
   Client code never talks to tables directly with the service key.
3. **Usernames are case-insensitive.** Stored and compared lowercased (unique index on the
   lowercased value). Reserved list includes every top-level site route (dashboard, admin, api,
   pricing, login, signup, auth, settings, …) and must be updated whenever a route is added.
4. **OTP emails** go through Resend (custom SMTP in Supabase Auth, sender on
   `mail.wsool.link`, domain verified in Resend, region eu-west-1). Done in Phase 1, step 5.

### How i18n routing is implemented (Phase 1, step 2)
- `src/proxy.ts` reads the `NEXT_LOCALE` cookie, then `Accept-Language`, else `ar`, and
  **rewrites** (never redirects) `/x` → `/<locale>/x`. Public URLs never show a prefix;
  typing `/ar/...` or `/en/...` gives 404, so `ar` and `en` are reserved usernames.
- Site pages live in `src/app/[locale]/(site)/` with their own root layout (`lang`/`dir`).
  Creator pages will get a separate root layout in Phase 2 so their language follows the
  creator's settings, not the site cookie.
- next-intl's locale is `ar-u-nu-latn` for Arabic so every formatted number/date uses 0–9.
  Use the `[locale]` route param (`"ar" | "en"`) for logic; `toIntlLocale()` for `Intl`.
- The proxy skips paths ending in asset extensions (`.png`, `.json`, `.pdf`, …). Usernames may
  contain dots, so username validation must reject names ending in those extensions.

### Database workflow (Phase 1, step 4)
- Prisma 7 (`prisma.config.ts`, client generated to `src/generated/prisma`, git-ignored;
  `postinstall` runs `prisma generate`). Server code imports `db` from `src/lib/db.ts`
  (`server-only`, `@prisma/adapter-pg` over `DATABASE_URL`).
- **Claude cloud sessions cannot open a Postgres connection to Supabase** (the sandbox proxy
  only passes HTTPS). HTTPS to Supabase (Auth, Storage, REST) works when the environment's
  network allowlist has `*.supabase.co` / `*.supabase.com`.
- So develop against the local Postgres 16 in the sandbox:
  `service postgresql start`, then apply `prisma/local-supabase-stub.sql` to `template1`
  (fake `auth.uid()` + `anon`/`authenticated` roles, local only), create db `wsool`, and run
  Prisma with `DIRECT_URL`/`DATABASE_URL` set to the local db on the command line (real env
  vars point at Supabase).
- Migrations reach Supabase on deploy: Netlify runs `npm run build:deploy` =
  `prisma migrate deploy && next build` (see `netlify.toml`).
- RLS migration (`prisma/migrations/*_rls`): RLS on every table, owner-only policies for
  `authenticated`, no access for `anon`. Every new table needs RLS + policies in its migration
  (helpers `owns_page()`, `owns_account()`, `owns_bundle()` exist).
- **The Data API is read-only** for `anon`/`authenticated` (INSERT/UPDATE/DELETE revoked in the
  `*_page_content` migration, also for future tables). All writes go through the server, which
  enforces ownership, verification rules and plan limits (otherwise a creator could self-verify
  or enable Pro settings via the public API).
- Since Supabase's Oct 30, 2026 change, new `public` tables get **no** Data API grants at all. That's fine: no code
  reads tables through supabase-js/PostgREST (only Storage signed uploads). Don't add GRANTs for anon/authenticated
  in migrations unless a feature really needs the Data API (then SELECT only, with RLS).
- Reserved usernames: `src/config/usernames.ts` (code, all site routes) + `reserved_usernames`
  table (extra names staff add).

### Auth (Phase 1, step 5)
- Email OTP via Supabase (`src/app/[locale]/(site)/login`). Server actions call
  `signInWithOtp` / `verifyOtp`; first sign-in creates the `users` row + 14-day trial
  (`src/lib/account.ts`, `TRIAL_DAYS` in `src/config/plans.ts`).
- `src/lib/auth.ts`: `getCurrentUser()` / `requireUser()` read the verified JWT claims
  (`getClaims`). They are the only source of a user id for queries.
- `src/proxy.ts` refreshes the Supabase session cookie only when an `sb-` cookie exists.
- Supabase email templates "Magic Link" (returning users) and "Confirm signup" (new users)
  hold one bilingual body (Arabic, code, English) with `{{ .Token }}`. Free projects can only
  edit templates with custom SMTP, which is why Resend is connected. The OTP is 6 digits (owner, Oct 31, 2026; was 8; Supabase → Sign In / Providers → Email → Email OTP Length)
  (the form accepts 6-10).
- **Google sign-in**: `signInWithGoogle` (server action, PKCE) → Supabase → Google → `/api/auth/callback`
  (`exchangeCodeForSession`, then `ensureAccount` = same trial as email sign-up) → `/dashboard`. Errors go to
  `/login?error=google`. The button shows only when Google is enabled in Supabase
  (`googleSignInEnabled()` reads `/auth/v1/settings`, cached minutes), so no code change is needed to
  turn it on. Owner setup: Google Cloud OAuth client (redirect URI = the Supabase callback
  `https://<project>.supabase.co/auth/v1/callback`), then Supabase → Providers → Google, and every site
  origin's `/api/auth/callback` in Supabase's Redirect URLs. Same-email accounts are linked by Supabase.
- Supabase project: `wsool-eu` in Frankfurt (eu-central-1).
- Sandbox only: run the app with `NODE_USE_ENV_PROXY=1` (Node's fetch ignores HTTPS_PROXY
  otherwise) and the overrides in `.env.local`.

### Username claim (Phase 1, step 6)
- Rules live in `src/config/usernames.ts` (`usernameFormatError`, `normalizeUsername`, shared by
  browser and server); `src/lib/username.ts` adds the database checks (staff-reserved table,
  taken by another page). Usernames are lowercased as the creator types.
- `/onboarding` lets a signed-in user without a page claim a name (live availability check,
  then `claimUsername` creates the page). `/dashboard` sends users without a page there.
- Changing the name later: `nextUsernameChange()` enforces 30 days between changes. The first
  claim does not start the cooldown, so a creator can fix a typo once right away. The change
  form is `UsernameCard` at the top of Edit page (`changeUsername`, live check via `checkUsername`). The old name goes
  to `username_redirects` (server only): for `USERNAME_REDIRECT_DAYS` = 30 it redirects (307, `getUsernameRedirect`
  in `loadCreatorPage`) and `usernameError()` reports it taken for everyone else; taking back your own old name
  ends its redirect. Both old and new cache tags are updated.

### Dashboard shell (Phase 1, step 7)
- Sections are defined once in `src/config/dashboard.ts` (`group: "account"` = under the "Account" label). Layout:
  `src/app/[locale]/(site)/dashboard/layout.tsx`: desktop sidebar (logo, `CreatorCard` = photo/name/link, sections,
  support, sign out) + a sticky **top bar** (phones: ☰ + logo; desktop: `SectionSearch` "jump to a section", ⌘K;
  then theme, bell, language). Phones: `MobileMenu` (`src/components/dashboard/MobileMenu.tsx`, native `<dialog>`
  drawer from the start side; also used by admin with its own `nav`; `/dashboard/more` redirects home).
  `PageHeader` is only the title row (title, subtitle, `actions`). Admin: same shell (sidebar with an "Owner" group,
  top bar with `CreatorSearch`), `AdminHeader` = title row. Sidebar and drawer sit on the
  **start** side: right in Arabic, left in English.
- Single-column grids need `grid-cols-1` (= `minmax(0,1fr)`) on phones: a bare `grid` sizes its column to the widest
  content and the page grows wider than the screen.
- Every dashboard page gets the creator through `requireCreator()` (`src/lib/creator.ts`):
  signed out → `/login`, no page yet → `/onboarding`. Call it inside `<Suspense>`.
- Unbuilt sections render from `dashboard/[section]/page.tsx` (placeholder). Building a
  section = add its own folder (e.g. `dashboard/accounts/`), which takes priority.
- `usePathname()` may return the internal `/<locale>/...` path; nav strips it before matching.
- Bell unread dot is a TODO until the notifications table exists.

### Public creator page (Phase 2)
- Route: `src/app/[locale]/(creator)/[username]/` with its **own root layout**. `[locale]` is the
  visitor's language (site cookie, then device); `resolvePageLang()` picks it if the creator
  offers it, else the creator's primary language. `html lang/dir` follow that.
- Data: `getPublicPage(username)` in `src/lib/public-page.ts` (`"use cache"`, public fields only,
  tag `pageCacheTag(username)`, `cacheLife("hours")`). **Every edit to a creator's page data
  must call `revalidateTag(pageCacheTag(username))`** (Phase 3), also publish/unpublish,
  username change (old and new), plan changes and verification decisions.
- States: unknown/invalid name → creator not-found (invite to claim); unpublished or deleted →
  "not available" page with noindex; `/Ali` → 308 to `/ali`.
- Reserved names only block claiming; staff-made pages with reserved names still render.
- **Demo page** `/demo` (owner, Oct 2026): fictional creator "عبدالله القحطاني" (Riyadh, owner's AI photo) showing EVERY
  page feature: all 14 platforms (big five verified + audience), monthly views per account, verified license with file,
  brands, works, rates on five platforms + a bundle with savings, services, links, coupons, creator logo, categories, Pro
  forever (`currentPeriodEnd` 2099). The page belongs to the owner's account `DEMO_EMAIL` (`src/config/site.ts`,
  ibrahim@wsool.link, owner's choice; it replaces any page that account had), so the owner edits it from the dashboard or
  the app; until that account exists it sits on a placeholder account (`demoUserId`, removed on the next refresh). Data: `src/lib/demo-page.ts` (`buildDemoPage`); **every new page
  feature must get a sample there**. Live site: owner clicks "Refresh demo page" (resets it, asks first) on the admin overview (`DemoCard`,
  `refreshDemoPage`, audited `demo.refresh`); local: `DATABASE_URL=<local> npx tsx scripts/seed-demo.ts`. Images in
  `public/demo/` are PNG/JPEG (the PDF can't embed SVG); fictional brands; links go to example.com / platform home pages,
  never real accounts. The page shows a navy "Demo page · Make yours free" bar; the home hero links to it
  ("شاهد صفحة تجريبية ←", design files + `LINKS`) and the footer's Product column has "صفحة تجريبية" / "Demo page".
- Templates: `src/components/creator/theme.ts` turns template + accent + custom colors into CSS
  variables (`--page-bg`, `--page-surface` frosted card, `--page-solid` opaque box, `--page-soft`,
  `--page-text`, `--page-muted`, `--page-line`, `--page-accent`, `--page-on-accent`,
  `--page-grad-end` for `grad-num` big numbers, `--page-pill`, `--page-panel`). Colors, grid + glow
  background and layout follow the owner's design artifact "وصول — صفحة الصانع" (Oct 2026).
  Shared class strings live in `src/components/creator/styles.ts` (never export plain values from a
  "use client" file to server components: they arrive as references). Custom = 1-2 hex colors + light/dark, palette derived
  automatically. Contrast guards (`src/lib/color.ts`) keep text >= 7:1 and accent >= 4.5:1.
- Free/Pro limits live in `FREE_LIMITS` (`src/config/plans.ts`) and are applied in
  `getPublicPage`: Free pages fall back to White if their template isn't free, show at most
  6 past works, no verified badge, and always show the Wsool footer.
- Template previews (local only): `npx tsx scripts/seed-demo.ts t.sand sand`, or
  `... t.custom custom "#e63946,#1d3557:light"`, or add `free` as the last argument.
- Interactions (client components in `src/components/creator/`): `CountUp` (server renders the
  final number; animates once in view), `Marquee` (scrollable row moved per frame, swipeable by hand, pauses
  on touch/hover/focus/scroll and resumes after 2.5s; stands still while the page itself scrolls (iOS Chrome cut the page scroll short and hid the top under the browser bar); moves and duplicates its items only when they overflow; RTL-aware), `Modal` (native `<dialog>`), `PlatformCard` (audience pop-up), `WorkItem` (portrait
  video pop-up), `LicenseFile` (PDF/image pop-up). All respect `prefers-reduced-motion`.
- Videos: store MP4 (H.264) for Safari/iOS. The sandbox's test Chromium can't decode H.264, so
  video playback can only be checked there with a WebM copy.
- Video files (`.mp4/.webm/.mov/.m4v`) are assets: excluded in the proxy matcher and blocked as
  username endings.
- Link preview (OG) image: route handler `src/app/[locale]/(creator)/[username]/og/route.tsx`,
  public URL `/<username>/og` (not the `opengraph-image` file convention, whose URL would carry
  the internal `/<locale>` prefix). Metadata sets `og:image`/`twitter:image` and `metadataBase`
  from `siteOrigin()` (`NEXT_PUBLIC_SITE_URL`, else Netlify's `URL`). CDN-cached for a day, so the metadata
  links `/<username>/og?lang=&v=<fingerprint>`: `v` hashes what the image shows (name, specialty, photo, colors,
  followers per account), so any change gets a fresh image URL. The route honours `?lang=` (crawlers send no language).
- **Arabic in OG images**: next/og (Satori) mis-measures Arabic, breaking word spacing. Text is
  shaped with fontkit and drawn as SVG outlines (`src/lib/og-text.ts`, right-to-left with line
  wrapping). Fonts live in `assets/fonts/` (OFL) and are listed in `outputFileTracingIncludes`.
  Satori also crashes on `backgroundImage: undefined`; only pass it when set.

### Dashboard editing (Phase 3)
- Server actions live next to each section (e.g. `dashboard/edit/actions.ts`): `requireCreator()`,
  zod validation (`src/lib/validation/`), writes scoped to `page.id` from the session, then
  `updateTag(pageCacheTag(page.username))` so the public page shows the change immediately.
- **Forms**: React 19 resets uncontrolled fields after a form `action`, wiping what the creator
  typed when validation fails. Submit through `onSubmit` + `startTransition(() => action(data))`
  (see `ProfileForm`), or keep the inputs controlled.
- In bilingual forms the labels follow the dashboard language; only inputs get the content
  language's `dir`/`lang`.
- Publishing requires a name in the primary language (`setPublished`).
- **Uploads** (Supabase Storage, public bucket `media`, created by the `*_storage_media`
  migration): the browser asks `requestUpload(kind, type, size)` for a one-time signed URL; the
  server checks type/size (`src/config/uploads.ts`) and picks the path
  `media/<userId>/<kind>/<uuid>.<ext>`; the browser uploads straight to Supabase
  (`src/lib/upload-client.ts`, photos shrunk to JPEG first); then the section's save action
  checks `isOwnUploadedFile()` before storing `publicFileUrl(path)`. Replaced/removed files are
  deleted with `removeFiles()`. No storage write policies exist for anon/authenticated.
  SVG is never accepted (it can carry scripts).
- Sandbox test browsers can't reach Supabase directly; relay `*.supabase.co` requests through
  Node in the test (`page.route` + `fetch` with `NODE_USE_ENV_PROXY=1`).
- Tags (`saveTags`, per language, max 12, 18 chars) and licenses (`saveLicenses`, max 10) are
  saved as whole lists (delete + recreate). A license file must be a fresh upload in the
  creator's own folder or a file one of their licenses already had; unused files are deleted.
- **Netlify credits**: the owner upgraded to the **Personal plan** (Oct 2026; was Free = 300
  credits/month). Each production deploy costs credits (15 on Free), branch deploys are free. Production branch is `main` (updated only when the owner approves);
  `claude/new-session-r5ze7y` gets free branch deploys. Avoid needless production deploys.
- **Accounts & numbers** (`dashboard/accounts/`): `saveAccounts` updates accounts in place by id
  (rates/audience stay attached), creates new ones, deletes missing ones. Profile URLs are built
  on the server from platform + handle (`profileUrl()`, no free-form links); pasted links/`@` are
  cleaned by `normalizeHandle()`. Exception, `LINK_PLATFORMS` (Spotify, Discord, Jaco: no URL can be built from a
  username): the creator pastes the profile link, `linkProfileUrl()` accepts only that platform's domain and cleans it
  (Spotify artist/show/user, Discord invite = server, followers labelled "members"; Jaco keeps its query). Icons:
  simple-icons + hand-made LinkedIn/Jaco paths, all run through `spacedPath()` (pdf-lib misreads packed arc flags). Changing platform, handle or followers of a verified/in-review
  account resets it to `none`. Monthly views: the creator picks the month once, then types views per account;
  `saveMonthlyViews` keeps one row (first day of the month, UTC) with the total (`views`, what the page shows) and
  `by_account` ({accountId: views}); all empty hides the box, deleting an account drops its share (`dropDeletedViews`). Audience = gender, fixed age groups, top 5 countries (ISO codes) and cities, each group
  <= 100%. Number inputs go through `digitsOnly()` (turns ٠-٩ into 0-9).
- **Brands & work** (`dashboard/work/`): `saveBrands` / `saveWorks` replace whole lists. Brands are logos only (owner, Oct 2026: no name field; `name` stays optional, old names kept as alt text). Files use
  `{ path, url }` refs: a fresh upload in the creator's own folder, or a URL their rows already had;
  unused files are deleted. Logos are shrunk to WebP (keeps transparency); a new video gets a cover
  grabbed from its first second in the browser (`videoCover()`), replaceable by the creator. The
  dashboard keeps all works; Free pages show the first `FREE_LIMITS.portfolioItems` (warned in the UI).
  A work can instead be a **post link** (owner, Oct 2026): TikTok / Instagram / YouTube only, parsed by
  `parseWorkLink()` (`src/lib/work-link.ts`, pure: canonical URL, embed URL, portrait or 16:9). `checkWorkLink` follows
  TikTok share links (`resolveWorkLink`, stays on tiktok.com) and stores a cover in the creator's folder
  (`workLinkCover`: YouTube thumbnail, TikTok oEmbed with one retry, Instagram = the image on the post's public embed page; failures logged as `[work-link]`) via `storeServerFile`. A link work without a cover shows "Get the cover from the platform" (calls `checkWorkLink` again).
  `portfolio_items.link_url` (then `video_url` is null; DB check: one of them is set). Public pop-up = the platform's
  iframe player (loaded only when opened) + "Open in {platform}"; the PDF links to the post.
  `hasPro()` in `src/config/plans.ts` is the one place that decides Pro vs Free.
- **Ad rates** (`dashboard/rates/`): `saveRateSettings` (upsert), `saveRates(accountId, rates)` per
  account (ownership checked), `saveBundles` (whole list; every account id must be the creator's,
  2+ platforms, 1+ rate). The bundle card explains itself ("How does a bundle work?" steps + example, web and app). Without saved settings the public page uses defaults (shown, VAT included,
  SAR, or USD when the primary language is English). Prices accept Arabic digits and "٫"
  (`decimalInput()`), 2 decimals. The bundle editor previews "instead of X, save Y%" with
  `bundleComparison()`, the same function the public page uses.
- **Contact** (`dashboard/contact/`): `saveContact` stores WhatsApp as international digits
  (`normalizeWhatsapp()`: strips `+`/`00`/spaces, Arabic digits, Saudi `05…` → `9665…`; DB check
  `^[0-9]{8,15}$`) and the email lowercased; empty = hidden on the page. The public WhatsApp button
  opens the chat with a prefilled "found you on Wsool: wsool.link/<username>" message.
- **Appearance** (`dashboard/appearance/`): `saveAppearance` saves template, custom colors (kept
  when switching away from Custom), accent (null = template's), number font, hide branding. Free
  users can't save Pro templates or hide the footer (`FREE_LIMITS`, checked on the server; the UI
  locks them). Live preview = `Preview.tsx` using the same `pageTheme()` as the public page.
- **Trial end and the page cache**: `getPublicPage` shortens its cache life when a trial ends
  within the hour, so the page drops to Free within 5 minutes of the trial ending (5 min is the
  floor: shorter "use cache" lifetimes make Next.js treat the page as dynamic and fail).
  Admin/payment plan changes must still call `updateTag(pageCacheTag(username))`.

### Verification + admin (Phase 4)
- Migration `*_admin_verification`: `verification_requests` (snapshot of platform/handle/followers,
  one pending per account), `admin_members`, `audit_log`, `users.suspended_at`, private storage
  bucket `verification`. Creators can only SELECT their own requests; staff tables have RLS with
  no policies (server only).
- Upload kinds carry their bucket (`src/config/uploads.ts`); screenshots go to the private bucket
  and staff see them through 10-minute signed URLs (`signedVerificationUrl`).
- Creator side (`dashboard/verification/`): `submitVerification` / `cancelVerification`. A renewal
  keeps a still-valid verification until it's decided. Changing an account (Accounts section)
  cancels its pending request. Rules and statuses: `src/config/verification.ts`
  (`verificationDisplay()`: none, in_review, verified, expiring = last 7 days, expired, rejected).
- **Admin access** (`src/lib/admin.ts`): the owner = whoever signs in with `OWNER_EMAIL` (env var,
  comma-separated). Members are invited by email (Team page) and linked on first visit.
  `requireAdmin(permission?)` returns 404 to non-staff. Permissions/presets/sections:
  `src/config/admin.ts`. Only the owner sees Team and Activity log.
- **Every admin action calls `audit()`** inside the same transaction as the change.
- Decisions use `updateMany where status = pending` so two staff can't decide the same request.
- Suspended accounts: `requireCreator()` sends them to `/suspended`; `getPublicPage` hides the page.
- next-intl reads dots in keys as nesting: message keys for dotted ids (`user.suspend`,
  `verifications.view`) are nested objects.
- Emails/notifications for decisions and invitations are TODO(phase 6).

### Payments (Phase 5)
- Provider interface: `src/lib/payments/types.ts`; active provider from `PAYMENT_PROVIDER`
  (`src/lib/payments/index.ts`). Only `mock` exists (Moyasar not connected until approved): signed
  fake payment ids, tokens `mock_tok_ok` / `mock_tok_fail`. **Test providers are staff-only**
  (checkout refuses non-staff), so leaving `mock` on never gives Pro for free. Unset = payments off.
- Adding the real provider: implement `PaymentProvider` next to `mock.ts`, register it in
  `paymentProvider()`, set `PAYMENT_PROVIDER` + its keys. Nothing else changes.
- Flow (`src/lib/billing.ts`): `startCheckout` creates a pending invoice with the price from
  `PRICES` (`src/config/plans.ts`, VAT included, `vatPart()`), the browser pays, then
  `/billing/return` (route handler, full-page redirect target) and `/api/payments/webhook` both
  read the payment **from the provider** and call `settleCheckout` (checks invoice id, amount,
  currency; idempotent). The paid period starts after any trial/paid time left.
- Invoice numbers come from the `invoice_number_seq` sequence when paid (`WS-001001`...).
  Seller details for invoices: `src/config/site.ts` (owner must fill VAT/CR numbers).
- Hourly job: Netlify scheduled function `netlify/functions/billing-cron.mts` → POST
  `/api/cron/billing` with `CRON_SECRET`: renewals with the saved token, retries after 1 and 3
  days (past_due keeps Pro), then Free; ends cancelled plans and trials; purges accounts deleted
  more than 30 days ago (`src/lib/account-deletion.ts`).
- Route handlers and jobs can't call `updateTag`: use `expirePage(username)` (revalidateTag with
  expire 0). Server actions keep `updateTag(pageCacheTag(...))`.
- Account deletion lives on the Subscription page: JSON export (`/api/account/export`, no payment
  token), type username → `pages.deleted_at` (page hidden, auto-renew off), undo within 30 days.
- `subscriptions.payment_token` is not readable through the Data API (column grants).
- Billing emails (receipt, renewal, failed payment, trial reminders) are TODO(phase 6).

### Launch pieces (Phase 6)
- **Analytics**: tables `page_views` / `contact_clicks` (migration `*_analytics`, RLS read-own).
  The public page's `Tracker` (client) sends a view beacon and taps on elements with
  `data-track="whatsapp|email|social:<platform>|work:<platform>"` to `/api/track`. No IP/UA is
  stored: a daily salted `visitorHash` counts unique visitors; bots, the owner's own visits and
  more than 20 events per visitor/page/day are ignored (plus 60/day per IP + page). Country from Netlify's `x-nf-geo`.
  Report: `src/lib/analytics-report.ts`; dashboard `dashboard/analytics/` (Pro only, 7/30/90 days,
  bar chart with hover + table view). Data is collected for Free pages too.
- **Notifications & emails**: `notify(userId, type, data, { dedupeKey })` (`src/lib/notify.ts`) adds a
  row to `notifications` (the bell) and emails it in the creator's page language through Resend
  (`src/lib/email/send.ts`, `RESEND_API_KEY`, from `noreply@mail.wsool.link`; without the key it
  only logs `[email:dry-run]`). Types and texts: `NOTIFICATIONS` + `messages/*.json` → `Notify`.
  Reminder types respect `notification_settings.email_reminders`. Layout: `src/lib/email/layout.ts`
  (table-based, RTL). Preview all emails: `npx tsx --require ./scripts/no-server-only.cjs
  scripts/preview-emails.ts <dir>`. `notify` uses `use-intl/core` (works outside requests).
- Reminders run in the hourly job (`src/lib/reminders.ts`): trial day 10/13, yearly renewal 7 days
  before, verification expiring (7 days) and expired (status → none, page cache expired).
- Bell dot: `UnreadDot` (server, in Suspense in each page header); notifications are marked read
  per item or with "mark all as read" (`markRead` / `markAllRead`), not on opening the page. All dashboard sections are built (no placeholder route).
- **PDF media kit**: `/<username>/pdf` (route handler, Pro pages only, `?lang=` one of the page's
  languages, `&download` for attachment) → `buildMediaKit()` (`src/lib/pdf/media-kit.ts`, pdf-lib). Matches the
  owner's design (dashboard design artifact, board "ملف PDF", Oct 2026): A4 pages laid out in the design's CSS px
  (794 × 1123, ×0.75 → pt): cover (photo fading into the page, or a circle; creator logo in place of the "Wsool" pill;
  floating brand logos; total followers; link card), about (bio, tags, licenses, city, content language), numbers,
  one page per platform (audience bars + its rates; skipped when it has neither), bundle, services, brands, selected
  work (thumbnail + link to the video), contact (WhatsApp, email, dark "full page" card with a QR code). Empty
  sections are left out; header/footer with page numbers; "made with Wsool" follows `showBranding`; every card is a
  clickable link annotation. Colors come from `pageTheme()` (incl. its `grid`/`glow`). Texts: `MediaKit` messages.
  Text is drawn as outlines with `textPaths()` (`src/lib/og-text.ts`). The photo fade uses ~40 overlapping layers with
  computed opacities (hundreds of faint layers get rounded away by PDF renderers). Images are clipped with PDF clip
  paths (`withClip`). Local preview without the app: render from a script with `getPreviewPage()` + `buildMediaKit()`.
  Dashboard home has the download buttons.
- **Finance** (`admin/finance/`, permission `revenue.view`): `financeReport(months)`
  (`src/lib/finance.ts`) — revenue from paid invoices without VAT, in SAR (USD × 3.75), expenses
  (table `expenses`, one-off/monthly/yearly with optional end date), P&L per month, MRR (yearly
  invoices spread over 12 months while their period covers the month), customers, churn (3-month
  average), ARPU, LTV = ARPU / churn, CAC = marketing spend / new paying customers (3 months).
  `FinanceView` renders it for the admin page and investor links.
- **VAT** (owner, Oct 2026: Safhat Wsool Company For Information Technology, CR 7055476373; prices always include 15% VAT):
  Finance page `VatSection` (`src/components/finance/VatSection.tsx`) from `vatReport(months)` (`src/lib/vat.ts`): current quarter
  KPIs (sales incl./excl. VAT, VAT collected, VAT on refunds, owed to ZATCA), last 4 quarters and per month. Sales count in the
  Saudi-time month paid, refunds take their VAT back in the month refunded, USD × 3.75. CSV for the accountant `/api/admin/vat?months=`
  (`revenue.view`, audited `vat.export`, one row per invoice). Not in investor links. Invoices = "simplified tax invoice" with seller
  name/CR/address from `SELLER`, the VAT number (`SELLER.vatNumber` = 315129912700003, registered Oct 30, 2026) and the ZATCA phase-1 QR (`zatcaQrPayload`: TLV of seller,
  VAT number, time, total, VAT in SAR, base64). The ZATCA "distinguished number" (10 digits) never goes on invoices. Phase-2 e-invoicing
  integration (Fatoora API) is built only when ZATCA notifies the company.
- **Investor links** (owner only): table `investor_links` stores only the token hash, chosen
  sections (`INVESTOR_SECTIONS`), period, expiry, optional scrypt password. Public page
  `/invest/<token>` (noindex, no personal data, Print/PDF); password unlock = httpOnly cookie
  with an HMAC of the link id. Every expense/link change is in the audit log.
- **Marketing site** (home, pricing, 404, hidden page, 500) is generated from the owner's design:
  `design/marketing/*.dc.html` (desktop + mobile, ar + en) → `python3 scripts/design-to-tsx.py` →
  `src/components/marketing/generated/` (views, texts, CSS; never edit by hand). Design links
  (`LINKS`), buttons (`BUTTONS`) and holes (`v.*`) are wired in the script and in
  `useMarketing.ts`; computed texts (claim messages, FAQ, prices from `PRICES`) in `content.ts`.
  Page wrappers: `src/components/marketing/Pages.tsx`. Hand fixes go in `marketing.css`.
  Owner wording (Oct 2026): "ملفك الإعلامي" instead of "ميديا كِت", "تقنع أي شركة", paid plan badge "الاحترافية".
  On phones the header shows "Log in" as a round person icon next to "Start free" (CSS in `marketing.css`).
  Tablets / wide foldables (768-1199px): the home hero stacks and centres (text above, phone below), CSS in `marketing.css`.
  Text changes are made in the `design/marketing/*.dc.html` files, then the script is re-run.
  Adding an element to a design shifts the generated `mk-home-N` numbers after it: update the numbers used in
  `marketing.css` (check each against `generated/home.css` before and after).
- Home "claim your link": live check (`checkLink`), then cookie `wsool_claim` → `/login`;
  onboarding pre-fills that name.
- **Newsletter** (`src/lib/newsletter.ts`, table `newsletter_subscribers`): double opt-in, HMAC
  links (no stored token) for `/newsletter/confirm` and `/newsletter/unsubscribe`, one-click
  `List-Unsubscribe` POST at `/api/newsletter/unsubscribe`, one confirmation per address per 10 min.
  Admin overview shows the confirmed count; CSV at `/api/admin/newsletter` (`users.view`, audited).
- **Sending the newsletter** (`admin/newsletter/`, editor at `/admin/newsletter/edit?id=`; no server-action
  redirects (they showed a blank page on Netlify): actions return data and the client navigates;
  permission `newsletter.send`): tables
  `newsletter_campaigns` (subject/body/button per language, status draft → sending → sent, counts) and
  `newsletter_deliveries` (one row per campaign × subscriber, written **before** sending, so a resumed
  or double-clicked send never emails anyone twice). Each subscriber gets their language's version, or
  the other one if theirs is empty (`versionFor`). Body = a small text format (owner, Oct 2026: editor with a toolbar,
  `MarkupToolbar`): `## heading`, `**bold**`, `*italic*`, `[blue|green|red|gray]…[/…]` colour (`TEXT_COLORS`), `- list`,
  `1. numbered`, `[text](https://…)`, `![](https://…)` image line, `---` divider, `[center]`/`[box]` … `[/center]`/`[/box]` on
  their own lines (centred / highlighted box), blank line = new paragraph, bare links clickable. Toolbar edits go in through
  `insertText()` (`src/lib/text-insert.ts`, execCommand) so undo/redo (toolbar buttons + Ctrl+Z) works. Emoji picker
  (`src/components/admin/EmojiPicker.tsx`, subject + body; Arabic/English search, recently used in localStorage, bottom sheet
  on phones) loads `emoji-data.ts` lazily; that file is generated by `scripts/emoji-data.py` (emojibase + CLDR Arabic names,
  Unicode ≤ 15.0). Heading font per issue (`newsletter_campaigns.heading_font` = `wsool` default | `system`): `wsool` puts an
  `@font-face` for `public/brand/fonts/noto-kufi-arabic-bold.woff2` (CORS `*` in `next.config.ts`) on the title, `##` headings
  and the logo word; Apple Mail shows it, Gmail/Outlook fall back to system fonts; body text always uses system fonts.
  Rendered by `markupToHtml()` / `markupToText()`
  (`src/lib/email/markup.ts`, everything escaped first; old plain-text campaigns render as before). Images: upload kind
  `newsletterImage` (JPG/PNG/GIF, 5 MB, public `media` bucket, staff's own folder) via `requestNewsletterUpload` +
  `newsletterImageUrl` (checks the stored file). Sandbox tests can't relay a file body from the test browser: do the signed
  upload from Node in the route handler. The editor previews the real email, sends
  a `[TEST]` to the signed-in staff member, then the browser calls `sendBatches` in a loop (about 300
  emails per call through Resend's batch API, `sendBatch()` in `src/lib/email/send.ts`) with a progress
  bar; an interrupted send shows "Resume", failed batches can be retried. Every email has the
  subscriber's own unsubscribe link + one-click `List-Unsubscribe`. Logic: `src/lib/newsletter-campaign.ts`.
  Local tests can point `RESEND_API_BASE` at a fake server.
- **Admin design pass**: `AdminHeader` (title, subtitle, creator search → `/admin/users?q=`; the
  search part is in its own `<Suspense>` because it reads the session). Sidebar badge = pending
  account + license requests. Overview: 6 tiles, 30-day signups, navy queue card, funnel, activity.
  Users: table with filters `?f=all|paid|trial|free` (+ counts) and `?q=` (name, username, email).
  Verification queue: master/detail (`?id=`), only the open request gets a signed screenshot URL;
  approve/reject side by side, reject asks for the reason. Team: list + detail, permissions grouped
  by `PERMISSION_GROUPS` (`src/config/admin.ts`). Invoices CSV: `/api/admin/invoices` (`revenue.view`,
  audited); CSV helper `src/lib/csv.ts`. Audit entries are shown as sentences by `auditSentences()`
  (`src/lib/audit-text.ts`, messages `Admin.sentence.<action>`): **every new audit action needs a
  sentence in both languages**.
- **Terms / Privacy** (`/terms`, `/privacy`): text in `src/content/legal.ts` (from the owner's doc,
  adjusted to the real stack), rendered by `src/components/legal/LegalPage.tsx`. Blanks (entity,
  registration, payment gateway, effective date) come from `LEGAL` in `src/config/site.ts`; empty
  ones show as [placeholders]. Login shows "by continuing you agree…" with both links.
  Update the text whenever a provider or data practice changes.

### Security pass (Oct 2026, pre-launch review)
- **Rate limits**: `rateLimit(key, limit, windowSeconds)` (`src/lib/rate-limit.ts`, table `rate_limits`, server only, atomic
  upsert; purged hourly by the billing cron). Used for login codes (10/h per IP, 5/h per email; verify 10/15 min), newsletter
  sign-up (5/h per IP, 3/day per address), uploads (150/h per creator), investor-link passwords (10/15 min per link, min 8
  chars), page tracking (60/day per IP + page) and the AI daily limit (`underDailyLimit`, counted before the call).
  Client IP = `x-nf-client-connection-ip` (`ipFrom` / `clientIp`). Country = Netlify's `x-nf-geo` only (cf-ipcountry can be
  forged: Cloudflare is DNS-only).
- **Headers** (`next.config.ts`): `frame-ancestors 'self'` + X-Frame-Options SAMEORIGIN, HSTS, nosniff, Referrer-Policy,
  Permissions-Policy. No script CSP yet (needs nonces for `THEME_SCRIPT`); revisit when the payment gateway's form is added.
- Session cookies are httpOnly (`SESSION_COOKIE_OPTIONS`, `src/lib/supabase/env.ts`); the browser Supabase client only
  uploads to signed URLs.
- `isOwnUploadedFile` also checks the stored object's real mimetype + size against the upload kind (deletes it otherwise).
  Image fetches for PDF/OG use `fetchImage()` (`src/lib/fetch-capped.ts`: images only, 10 MB cap, timeout); cover fetches
  don't follow redirects and read with `readCapped`.
- Verification: `applyReadFollowers` resets a verification / cancels a pending request like `saveAccounts`;
  `approveVerification` refuses when the account changed since the request (error `changed`).
- Admin: staff can't suspend the owner (or other staff unless owner); suspended staff lose admin access; AI re-read needs
  `verifications.decide`; refunding an old invoice doesn't end the current period; newsletter create/test/delete audited.
- Discounts: a code can only be in one open checkout at a time (another user's pending invoice in the last hour = "used";
  the same user's older pending ones are dropped).
- Newsletter confirm/unsubscribe pages act only after a button press (`LinkAction` + `runNewsletterLink`), so mail scanners
  can't confirm or unsubscribe. One-click `List-Unsubscribe` POST stays.
- **GitHub checks**: `.github/workflows/ci.yml` (lint, `next typegen` + tsc, migrations apply on a fresh Postgres 16 with
  the local stub and match the schema) on pushes to main/claude/** and PRs; `codeql.yml` (weekly + main); Dependabot
  (`.github/dependabot.yml`: weekly npm, minor/patch grouped; monthly actions). Dependabot PRs are never merged without the owner.
- **Sentry** (`@sentry/nextjs`): `src/instrumentation.ts` (server/edge + `onRequestError`), `src/instrumentation-client.ts`,
  options in `src/sentry.shared.ts` (off without `NEXT_PUBLIC_SENTRY_DSN`; `sendDefaultPii: false`, no replay, 5% traces);
  `withSentryConfig` in `next.config.ts` (source maps only with `SENTRY_AUTH_TOKEN` + `SENTRY_ORG`/`SENTRY_PROJECT`).
  Region EU (owner). Listed in the privacy policy. Uptime: UptimeRobot on `https://wsool.link` (owner's account).
- Not done yet (low): dedicated signing secrets instead of `CRON_SECRET` for mock payments / investor cookie / newsletter
  links / visitor hash; cleanup of uploaded files no row uses; Turnstile on sign-up forms.

### Design pass (Oct 2026, owner decisions)
- The built screens are being matched to the owner's design artifacts ("صفحة الصانع", "لوحة التحكم",
  "لوحة الإدارة"), in that order. Where a design conflicts with this file, this file wins (44px touch
  targets, sticky desktop sidebar, uploaded videos, server-built profile links, SAR finance, link expiry).
- Monthly views stay **before** the platform cards (owner).
- Buttons: pill shape (section 4), primary color per the dashboard design (owner left it to Claude).
- Owner said yes to these design-only features: license verification, a "why are you cancelling?"
  survey, AED + KWD rate currencies, a **single** ad-rate bundle, preset accent colors (Custom
  template keeps its free color pickers).
- Creator page: language switch sets the `NEXT_LOCALE` cookie and reloads; share uses
  `navigator.share` or copies the link (`PageActions.tsx`).
- Dashboard shell: replaced by the Stripe-style redesign (section 4): flat `app-backdrop`, `Card` radius 14, 44px inputs
  (`Field.tsx`, focus ring), `Switch` (`src/components/ui/Switch.tsx`, role=switch), `PageHeader` per page (title + subtitle
  from `DashboardHeader` messages). Sections with one save for everything use `SaveBar` (fixed to the bottom on phones).
- Ad rates: one bundle per page (`MAX_BUNDLES = 1`; the public page shows only the first), rate
  currencies SAR/USD/AED/KWD (`RateCurrency` enum, separate from the subscription `Currency`).
- Accent color: presets only (`ACCENT_SWATCHES`, light + dark variant chosen by `pageTheme`).
- Cancelling auto-renew can carry a reason (`CANCEL_REASONS`, table `cancellation_feedback`).
- Licenses can be verified: `licenses.verification_status` (+ reason, dates); creators send from the
  Verification page, staff decide in the queue's Licenses tab (`decideLicense`, audited, notified);
  saving the license list keeps the status of unchanged licenses.
- Contact: `pages.whatsapp_visible` / `email_visible` hide a channel without deleting it.
- **My links & My services** (owner, Oct 2026; keeps Wsool a media kit, not a general page builder):
  dashboard `dashboard/links/` (one `SaveBar`, `saveLinksAndServices` replaces both lists). Tables
  `page_links` (title + optional `titleEn`, https url, optional image = upload kind `linkImage`) and
  `services` (name, description, optional price = "on request" when empty, unit, English versions);
  limits `MAX_LINKS` 10 / `MAX_SERVICES` 12 (`src/lib/validation/links.ts`, URLs normalised to https by
  `normalizeLinkUrl`). Public page order: ad rates → **My services** → **My links** → contact. A link
  without an image gets an icon from `linkKind()` (`src/lib/link-kind.ts`: map / store / video / link).
  "Request" on a service opens WhatsApp (else email) with a prefilled message. Free pages show the first
  `FREE_LIMITS.links` / `FREE_LIMITS.services` (3 each). Services print in the PDF after the rates.
  Taps are counted as click kinds `link` / `service` with `contact_clicks.target_id` (checked to belong
  to the page) and shown by name in Analytics. Shared upload helpers: `src/lib/page-files.ts`.
- **Discount coupons** (owner, Oct 2026; creators' store codes, not Wsool's own discount codes below): dashboard `dashboard/coupons/`
  (section "كوبونات الخصم", `saveCoupons` replaces the whole list), table `coupons` (store + optional `storeEn`, description, code
  `[\p{L}\p{N}._-]{1,30}` without spaces, https tracking `url`, optional logo = upload kind `couponLogo`, optional `expires_on` = last
  day shown in Saudi time). `MAX_COUPONS` 10 (`src/lib/validation/coupons.ts`), Free pages show the first `FREE_LIMITS.coupons` = 2
  live ones; expired coupons are dropped in `shapePage()` (`liveCoupons`). Public page: after My links, cards with logo, store,
  description, the code with a copy button (`CopyCode`, client) and "Shop now" (`rel="sponsored"`), section aside "أكواد إعلانية"
  (ad disclosure). Taps are click kinds `coupon_copy` / `coupon_open` (target = coupon id, checked in `/api/track`), named by store in
  Analytics. PDF (Pro): "Discount coupons" page after services, each card links to the tracking URL. App: `section/coupons.tsx`, row in
  My page. Terms section 3 has a line on them; data export includes them.
- **Discount codes** (owner, Oct 2026): admin `admin/discounts/` (permission `discounts.manage`, in the
  money group): one code per row (name/note + optional email lock), percent 5-90 (`DISCOUNT_MIN/MAX`;
  free time = "extend trial"), valid `DISCOUNT_DAYS` = 30, statuses unused / used (by whom, when) /
  expired / revoked; create and revoke are audited. Table `discount_codes` (server only). Creators enter a
  code on the Subscription page ("Have a discount code?", `applyDiscount` checks it for their email);
  `startCheckout` re-checks it and charges `discountedPrice()` on the **first payment only** (renewals use
  `PRICES`); the invoice stores `discount_code_id` / `discount_amount`, and `settleCheckout` marks the code
  used inside the paid transaction. Invoices show the discount line before VAT. Logic: `src/lib/discounts.ts`.
  **100% codes** (owner, Oct 2026): `DISCOUNT_FREE` = 100 with `discount_codes.free_cycle` (monthly | yearly) = a free Pro
  period, no payment (works while payments are off; the code box shows even without a provider). The creator applies it,
  then "Activate" → `redeemFree` → `redeemFreeCode()` (`src/lib/billing.ts`): marks the code used, sets the subscription
  active for the period after any trial/paid time left, `cancelAtPeriodEnd` = true (no card, never renews; the hourly job
  drops it to Free at the end), notifies `free_activated`; `free_ending` reminder 7 days before. No invoice, no revenue.
  Refused when a paid plan is active with auto-renew. Checkout never accepts a 100% code.
- **Creator categories & insights** (owner, Oct 2026): table `categories` (name ar/en, sort; seeded with 14, owner
  edits the list at `admin/categories`, owner only, `saveCategoryList` replaces the whole list, audited
  `category.update`) and `page_categories` (creator picks up to `MAX_PAGE_CATEGORIES` = 2 in Edit page,
  `CategoriesCard` / `saveCategories`; not shown on the public page). `admin/insights` (`users.view`): creators by
  category, country, city, platform, size band (`SIZE_BANDS`) and plan; each row links to Users with that filter.
  Per-creator data: `creatorRows()` (`src/lib/creator-insights.ts`, in memory: fine for thousands). Free-text
  country/city are unified by `countryCode()` / `cityKey()` (`src/lib/places.ts`: Intl names ar/en + aliases).
  Users page has the same filters (`?cat=&country=&city=&platform=&size=`, `none` = not set) and an export:
  `/api/admin/users` (CSV, same filters, audited `creators.export`). Shared UI: `src/components/admin/CreatorFilters.tsx`.
- **Owner batch (Oct 2026)**: `pages.photo_shape` (`full` | `circle`, chosen in the Edit page photo card, `savePhotoShape`, saved on tap;
  public hero, OG image, PDF and the Appearance preview follow it)
  replaced `number_font` (dropped). `pages.logo_url` = the creator's own logo (Edit page `LogoCard` → `saveLogo`, upload
  kind `logo`, shrunk to PNG so pdf-lib embeds it without sharp), drawn at the top of the PDF only.
  Edit page preview: `/<username>/preview?lang=` (owner only, fresh data via `getPreviewPage()`, works while hidden,
  no visit counting, noindex) shown by `PagePreview` (sticky frame on desktop, full-screen button on phones); cards
  call `notifySaved()` (`src/lib/saved-event.ts`) after saving so it reloads. `getPublicPage` / `getPreviewPage`
  share `PAGE_SELECT` + `shapePage()`. Activity log filters: `?who=&type=&p=today|7|30&from=&to=` (types = action
  prefixes in `GROUPS`, days in Saudi time). Discounts: revoked codes can be deleted (one or all, never used ones;
  audited `discount.delete`). Finance page "Export PDF" = print view (`PrintButton` in `src/components/`, admin chrome
  is `print:hidden`, A4 margins in `globals.css`).
- **AI screenshot reading** (owner, Oct 2026): `src/lib/ai/screenshots.ts` calls Claude (`AI_MODEL` = `claude-opus-5-5`,
  `beta.messages.parse` + `betaZodOutputFormat`, effort `low`, refusal fallback `fallbacks: "default"` with beta
  `server-side-fallback-2026-07-01`). Off without `ANTHROPIC_API_KEY` (everything falls back to the manual flow); local
  tests point `ANTHROPIC_BASE_URL` at a fake server. Text inside images is data, never instructions (system prompt).
  Table `ai_reads` (server only) logs every read; `AI_DAILY_LIMIT` = 20 per creator per day is an atomic `rateLimit` counter.
  Verification: picking a screenshot uploads it and runs `checkScreenshot` → `compareRead()` (`src/lib/ai/compare.ts`,
  pure: username, platform, followers within 3% = match, 10% = close); the creator can `applyReadFollowers` (value from
  the stored read, never the browser); `submitVerification(..., readId)` copies the read to
  `verification_requests.ai_result`. Staff: queue badges + `?ai=match|check` filter, `AiCard` in `ReviewCard`, username/
  followers checks pre-ticked when they match ("authentic" always manual), `readRequestWithAi` for unread requests
  (audited `verification.ai_read`). Audience: "Fill from a stats screenshot" (upload kind `audienceShot`, private bucket)
  → `readAudienceShot` → `audienceFromRead()` (`src/lib/ai/audience.ts`: ages into `AGE_GROUPS`, names → ISO codes,
  whole percents ≤ 100); fills the form only (creator saves); the image is deleted right after reading.
  Up to 4 screenshots at once, read one by one; each fills only the groups it shows (others keep their values).
  Audience reads use effort `medium` and `AUDIENCE_TASK` (pair each age label with the percent on its row, RTL apps
  swap sides, never estimate from bar length); ages not adding up to 100 ±3 show a "check the ages" warning (`agesUncertain`).

### Speed (owner, Oct 2026)
- Netlify functions run in **Frankfurt** (owner changed "Functions region"), next to Supabase (`wsool-eu`). Every database
  query is a network round trip, so: Prisma `relationJoins` (nested reads = one query), queries that don't depend on each
  other go in one `Promise.all` (start optional ones early and drop them, e.g. stats before the plan is known, with
  `.catch(() => {})`), never query for an empty `in: []` list, `react` `cache()` for lookups rendered twice. The pg pool
  keeps idle connections 2 min (`src/lib/db.ts`). App API: `guarded()` in `src/lib/mobile/api.ts` reads the suspension flag
  and the page in one query.
- Dashboard sections show `SectionSkeleton` while their data streams in (Suspense fallback).
- App: every GET answer is kept in memory (`peek`, `src/lib/api.ts`); screens use `useCached()` (`mobile/src/lib/cached.ts`)
  to open at once and refresh in the background (same data = no re-render, so forms aren't reset). Any POST clears it.
- Local check: put a small TCP proxy that delays each packet 50 ms in front of the local Postgres and time the pages;
  each 100 ms = one round trip (Oct 2026: dashboard home 912 → 369 ms, app screens ~200 ms).

### Agent tools (owner, Oct 2026)
- **Context7** (`.mcp.json`, MCP server `https://mcp.context7.com/mcp`, no API key yet = lower rate limit): before writing
  or changing code that uses Next.js, Supabase, Prisma, next-intl, Resend, Sentry, Netlify or the payment gateway, look
  up the current docs with Context7 (for Next.js, `node_modules/next/dist/docs/` from AGENTS.md comes first). If Context7
  is unreachable (cloud sessions need `mcp.context7.com` in the environment's allowed domains), say so and carry on.
- **Skills** from addyosmani/agent-skills (MIT, `.claude/skills/LICENSE-agent-skills.md`), shared checklists in
  `.claude/references/`: `security-and-hardening` (auth, input, uploads, payments), `performance-optimization`,
  `code-review-and-quality` (review your own change before saying a step is done), `shipping-and-launch` (use together
  with `docs/launch-checklist.md`). This file wins over any skill where they disagree (e.g. stack, branches, deploy
  credits); skip skill steps that don't fit a solo owner (feature flags, staged rollouts, heavy test suites) unless asked.

### Affiliate program (owner, Oct 2026)
- Rules in `REFERRAL` (`src/config/referrals.ts`): 20% of each paid invoice **before VAT** (in SAR, USD × 3.75), for payments
  before the customer's first payment + 12 months; referrer must be Pro (and not suspended) when the payment settles; 30-day
  cookie (last click wins); payable after 14 days (a refund before then cancels it, `cancelCommissionForRefund`); bank
  transfers from SAR 100. Logic: `src/lib/referrals.ts`.
- Link `wsool.link/?ref=<username>` (any site path): `src/proxy.ts` redirects to `/api/ref?u=&next=`, which counts a unique
  click (`referral_clicks`, visitor hash, bots/30 per IP per day ignored), sets the httpOnly `wsool_ref` cookie
  (`<referrerId>.<ms>`) only for eligible referrers, and goes back to the clean same-site path. Old usernames still redirecting
  keep working. Pro creator pages put the ref link on the "Made with Wsool" footer (plain `<a>`, full load).
- `ensureAccount()` (first sign-in only) calls `attachReferral()`: sets `users.referred_by` / `referred_at`; never self, never
  the same inbox (`sameInbox`: gmail dots / +tags); DB check `users_not_self_referred`.
- `earnCommission(invoiceId)` runs after `settleCheckout` and renewals (idempotent: unique `invoice_id`), notifies
  `commission_earned`. Balance = payable commissions − `referral_payouts` (`referralBalance`).
- Payout method (`referral_accounts`, server only, IBAN mod-97 checked by `validIban` in `src/lib/iban.ts`): `credit` (default)
  = `renewalCredit()` in `runBillingJob` takes it off the creator's own renewal (`invoices.credit_amount`, card charged the
  rest, 0 = no provider call, never leaves a charge under 1; a payout row `method=credit`; refund gives the provider only the
  charged part and deletes that payout) or `bank` = staff record transfers.
- Dashboard `dashboard/referrals/` (section "العمولة", account group): link (copy/share, disabled on Free + `ProNotice`),
  KPIs, 30-day clicks chart, balance, customers table (no personal data: "Customer N", date, plan, commission), payout form
  (`savePayoutSettings`; empty IBAN keeps the saved one, only shown masked), payouts history, rules.
- Admin `admin/referrals/` (permission `referrals.manage`, money group): balances per creator with full IBAN, "Transferred"
  (`recordBankPayout`: whole payable balance, row-locked, reference, audited `referral.payout`, notifies `commission_paid`),
  CSV `/api/admin/referrals` (audited `referral.export`). Finance counts commissions as expense category `affiliate` (and in
  marketing for CAC). Terms section 7 + privacy (data row, 30-day cookie) describe it. Data export includes it.

### Platform connections (owner, Oct 2026)
- Creators link an account through the platform's own sign-in (OAuth); followers + audience then update daily and the account
  counts as verified while linked. Plan, platform order and the owner's Google setup: **`docs/platform-connections.md`**.
- **Pro only** (owner, Oct 2026; trial counts; `FREE_LIMITS.connections`): `canConnect(userId)` guards start (web + app ticket,
  error `pro`), the callback (`completeConnection`), Telegram's webhook and `checkBotLink`; `syncConnections` only picks links
  whose owner is Pro (`proSubscription()`, same rule as `hasPro`). On Free a link is kept with its last numbers but paused
  (dashboard/app note `connect.paused`) and resumes by itself with Pro; Free creators see `connect.proOnly` instead of the
  button (web: "Upgrade" link; the app never says where to buy). Plan comparison row `cmp.connections`, pricing/home lists.
- Code: `src/lib/connect/` (`Provider` per platform, `PROVIDERS`; YouTube = followers + audience, Instagram (`instagram.ts`, "Instagram API with Instagram Login" = professional accounts, no Facebook Page; Meta app "Wsool" in the company's business portfolio; scopes `instagram_business_basic` + `instagram_business_manage_insights`; the 60-day long-lived token is stored as the "refresh token" and renewed daily via `refresh_access_token`; audience = `follower_demographics` per breakdown (gender/age/country/city, tries without then with `timeframe`, refusals logged `[instagram]`, needs 100+ followers); monthly views = `views` in two ≤30-day halves; Meta callbacks `/api/connect/instagram/deauthorize` (link → error + `connection_lost`) and `/data-deletion` (deletes the link + its audience, returns status URL + code), both check the HMAC `signed_request` with `INSTAGRAM_APP_SECRET`; until app review passes only Instagram testers can link), Threads (`threads.ts`, same Meta app, Threads use case; scopes `threads_basic` + `threads_manage_insights`; same 60-day token renewal (`th_refresh_token`); followers = `threads_insights` `followers_count`; audience = `follower_demographics` one breakdown per call; monthly views = sum of daily `views`; `THREADS_APP_ID` / `THREADS_APP_SECRET`; callbacks `/api/connect/threads/uninstall` + `/data-deletion`), Meta callbacks shared in `src/lib/connect/meta.ts` (`metaCallbacks(platform, secret)`), Facebook Pages (`facebook.ts`, Facebook Login for Business with `FACEBOOK_CONFIG_ID` (User access token config, permissions `pages_show_list` + `pages_read_engagement` + `read_insights`), `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` = the Meta app's own; personal profiles can't be linked; profile() picks the Page whose username/link matches the saved account (else the only one shared, else error `no_page`) and returns its Page token as `profile.refreshToken`, which `completeConnection` keeps instead of the user token; followers = `followers_count` (else `fan_count`); no audience (Meta removed Page demographics); monthly views try `page_media_view` then `page_views_total`, logged `[facebook]`; not in `CONNECT_VIEWS` until checked on a real Page; data deletion = instructions in the privacy policy), TikTok + Twitch = followers only, Discord = members of the server behind the saved invite, linked only when the creator owns/manages it (`profile(token, {url, externalId})`, `notFound: "no_server"`), X = followers via OAuth 2.0 + PKCE (verifier = HMAC of the signed state, `exchange(code, uri, state)`), paid per call so daily syncs are capped by `X_DAILY_SYNC_LIMIT` (default 500) and 402/429 are retried, not "lost", Telegram = channel subscribers through a bot (`bot: true`, `BOT_PLATFORMS`): Connect stamps `social_accounts.connect_requested_at` and opens t.me/<bot>?startchannel; the bot's `my_chat_member` webhook (`/api/telegram/webhook`, secret header) links the one account that asked in 30 min with the same @handle; stored "token" = chat id; webhook set by `ensureTelegramWebhook` (hourly + on Connect); "Check the link" (`checkBotConnection` → `checkBotLink`) asks Telegram directly whether the bot is an admin of @handle (Telegram sends no update when the bot already was one) and reloads the page (`CONNECT_AUDIENCE` in
  `src/config/platforms.ts` + app picks the hint text); `refresh()` may return a rotated refresh token, saved before reading), table `platform_connections` (server only, one
  platform account per Wsool account), refresh tokens sealed with `TOKEN_ENCRYPTION_KEY` (`src/lib/token-box.ts`). Routes
  `/api/connect/<platform>/start|callback` (redirects use the request's own origin (`requestOrigin`), so branch deploys work; web: session + nonce cookie; app: 2-minute one-time ticket from
  `POST /api/mobile/v1/connect/<platform>`, returns to `wsool://connect`). Daily `syncConnections()` in the billing cron; revoked
  = status `error` + `connection_lost`. Linked accounts keep platform/handle/followers in `saveAccounts`; `disconnectAccount`.
  The Connect button shows only when the platform's keys are set. Privacy policy cites YouTube ToS / Google privacy (Google rule).
- Owner polish (Oct 2026): Connect buttons in the platform's colour with its logo (`BRAND_COLORS`, web + app). `autoFilled(kind, platform,
  connection)` (`src/config/platforms.ts`, app copy in `mobile/src/lib/platforms.ts`): an active link on a `CONNECT_AUDIENCE` platform
  locks the audience (read-only summary, no screenshot reading; `saveAudience` / `readAudienceShot` refuse), on a `CONNECT_VIEWS`
  platform it locks that account's monthly views (`saveMonthlyViews` keeps the stored value). Audience is stored in the platform's own
  groups and order (YouTube ages 13-17 … 65+, not merged; cities only when YouTube names them, else the creator's stay); the manual
  form folds finer groups into 45+ (`manualAges`). Age labels are shown left to right (`<bdi dir="ltr">`). YouTube monthly views =
  last complete month (from the 3rd), written by `setAccountViews()` into the page's one monthly views row. Public pop-up note says
  "updates automatically from {platform}" for linked accounts (`audienceLinked`).

### Mobile app (owner, Oct 2026 — phases 1-3 built)
- Native React Native (Expo) app for creators, before the official launch, published as "وصول" (organization accounts).
  Decisions, store rules (no in-app subscription sales, Sign in with Apple, in-app account deletion), architecture
  (`/api/mobile/v1` + `mobile/`), phases and open questions: **`docs/mobile-app-plan.md`**. Read it before any app work.
- Server: `/api/mobile/v1/*` (Bearer Supabase token, `authed`/`withPage` in `src/lib/mobile/api.ts`, CORS open: no cookies).
  Shared logic goes in `src/lib/*` (e.g. `claimPage`), never duplicated. `notify()` also pushes to phones (`src/lib/push.ts`,
  table `push_tokens`). App: `mobile/` (Expo SDK 58, own package.json; excluded from the root tsc/eslint; CI job `mobile`).
  Changes only in `mobile/`, `docs/`, `.claude/`, `.github/` or `*.md` files (CLAUDE.md, README…) don't trigger a Netlify deploy (`ignore` in `netlify.toml`); the netlify.toml change itself does.
- **Design review (owner, Oct 2026, against Apple's HIG + Material)**: text is never under 12 (`MIN_TEXT`, no global shrink) and
  follows the phone's larger-text setting up to `MAX_SCALE` 1.8 (bars and tab labels 1.3; no fixed heights around text);
  small grey `faint` ≥ 4.5:1, an "off" switch uses `switchOff` (≥ 3:1). Touch targets `TOUCH` = 44 (iOS) / 48 (Android).
  Sections live in native stacks per tab (`app/(tabs)/page/*`, `app/(tabs)/account/*`, each with a `_layout` Stack), so edge
  swipe / Android back work and the bar stays; routes are `/page/<section>`, `/account/{referrals,subscription}`, analytics =
  `/insights` (`appRoute()` maps web hrefs). `SectionScreen`: iPhone bar (‹ tab name, centred title) or Android top app bar
  (arrow + title at the start); `dirty` asks before leaving (`usePreventRemove`; `useSaver().dirty`). Android ripples on
  pressables. Edit page: one `SaveBar` for about/categories/tags/licenses (publish, photo, logo save on tap; username has
  its own button). Haptics via `src/lib/haptics.ts` (switch tap, save success/error). The app never mentions where to buy or
  manage the plan (App Store 3.1.3).
- **iPhone (Oct 2026)**: system tab bar on iOS (`app/(tabs)/_layout.ios.tsx`, `NativeTabs`) and system headers with large titles
  (`TabStack`; `Screen` / `SectionScreen` set `Stack.Screen` options when `NATIVE_BARS`); Android/web keep `TabBar` + our bars.
  Store and platform reviewers sign in with `REVIEW_EMAIL` + `REVIEW_CODE` (Netlify secrets) in the app and on the website login (`reviewTokenHash()` in `src/lib/mobile/review-login.ts`, no email sent). Meta review guide (7 permissions, texts, screencast script): `docs/meta-app-review.md`. Store listing, privacy answers
  and review notes: `docs/app-store.md`; Google Play listing, data safety, upload and Firebase push setup: `docs/google-play.md` (`mobile/app.config.js` adds `googleServicesFile` from the expo.dev file env var `GOOGLE_SERVICES_JSON`). Demo page files are stored as full URLs (`asset()`), because the app can't open
  site-relative paths: after deploying, the owner presses "Refresh demo page" once.
- Home page "Get the app" (owner, Oct 2026): App Store + Google Play badges under "Follow us" in the newsletter card
  (`.wapp` in the design files + `marketing.css`, images `public/marketing/{app-store,google-play}-badge.png` from the owner).
  Store links in `APP_LINKS` (`src/config/site.ts`); an empty link shows that badge as a plain image without a link.
  On phones (<768px) the newsletter card reads title → description → email field, then "Follow us" + "Get the app" under a
  divider (owner): CSS reorder in `marketing.css` (text column `display: contents`), the design files keep one structure.
  Also on phones: social icons and store badges centred on one row each (they shrink to fit), the footer tagline on one
  line (font scales with the width) and the three link columns side by side at equal widths (Home + Pricing footers).
