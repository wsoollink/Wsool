"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PRICES } from "@/config/plans";
import { PLATFORM_NAMES } from "@/config/platforms";
import { SOCIAL_LINKS } from "@/config/site";
import { normalizeUsername, usernameFormatError } from "@/config/usernames";
import type { Locale } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";
import { checkLink, joinNewsletter } from "./actions";
import { CLAIM_COOKIE, MARKETING_TEXT, TEMPLATES } from "./content";

const GOOD = "#12805C", BAD = "#D93A3A";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Template deck: offset, scale and tilt by distance from the current card. */
const OFF = [[0, 1, 0], [160, 0.86, 6], [290, 0.72, 10], [360, 0.6, 14]];

/**
 * Everything the generated design views read through `v` (the design canvas's
 * renderVals), wired to the real site: live username checks, the newsletter's
 * double opt-in, the language cookie, Wsool's social links.
 */
export function useMarketing(lang: Locale, opts: { initialClaim?: string; source?: string } = {}) {
  const T = MARKETING_TEXT[lang];
  const router = useRouter();
  const [claim, setClaim] = useState(opts.initialClaim ?? "");
  const [checked, setChecked] = useState<{ name: string; error: string | null } | null>(null);
  const [nl, setNl] = useState("");
  const [nlDone, setNlDone] = useState(false);
  const [nlErr, setNlErr] = useState(false);
  const [yearly, setYearly] = useState(false);
  const [open, setOpen] = useState(0);
  const [open2, setOpen2] = useState(-1);
  const [deck, setDeck] = useState(0);
  const [progress, setProgress] = useState(0);
  const paused = useRef(false);
  const [, startTransition] = useTransition();

  // Count-up of the hero number and the self-playing template deck.
  useEffect(() => {
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = still ? 1 : Math.min(1, (now - start) / 2000);
      setProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    if (still) return () => cancelAnimationFrame(raf);
    const timer = setInterval(() => { if (!paused.current) setDeck((d) => (d + 1) % TEMPLATES.length); }, 2800);
    return () => { clearInterval(timer); cancelAnimationFrame(raf); };
  }, []);

  // Live availability check (format right away, database after a pause).
  const name = normalizeUsername(claim);
  const formatError = name ? usernameFormatError(name) : null;
  useEffect(() => {
    if (!name || formatError) return;
    const timer = setTimeout(() => startTransition(async () => setChecked(await checkLink(name))), 350);
    return () => clearTimeout(timer);
  }, [name, formatError]);
  const error = !name ? null : formatError ?? (checked?.name === name ? checked.error : undefined);
  const ok = !!name && error === null;
  const claimMsg = !name ? T.claimHint : error === undefined ? T.claimChecking : ok ? T.claimOk(name) : error === "taken" || error === "reserved" ? T.claimTaken : T.claimInvalid;
  const claimGo = () => {
    if (!ok) return;
    // Onboarding pre-fills this name after sign-in.
    document.cookie = `${CLAIM_COOKIE}=${encodeURIComponent(name)}; path=/; max-age=3600; samesite=lax`;
    router.push("/login");
  };

  const sendNl = () => {
    if (!EMAIL.test(nl)) return setNlErr(true);
    setNlErr(false);
    startTransition(async () => {
      const res = await joinNewsletter(nl, lang, opts.source ?? "home");
      if (res.ok) setNlDone(true);
      else setNlErr(true);
    });
  };

  const n = TEMPLATES.length;
  const on = (x: boolean) => (x ? { bg: "#021941", c: "#FFFFFF", p: "true" } : { bg: "transparent", c: "#56607A", p: "false" });
  const m = on(!yearly), y = on(yearly);
  const faqList = (list: readonly (readonly [string, string])[], cur: number, set: (i: number) => void) =>
    list.map(([q, a], i) => ({ q, a, open: cur === i, exp: cur === i ? "true" : "false", rot: cur === i ? 180 : 0, toggle: () => set(cur === i ? -1 : i) }));
  const currency = lang === "en" ? "USD" : "SAR";

  return {
    en: lang === "en",
    social: SOCIAL_LINKS as Record<string, string>,
    // Footer "Follow us": only platforms with a link (CLAUDE.md section 11).
    socialList: (Object.entries(SOCIAL_LINKS) as [keyof typeof SOCIAL_LINKS, string][])
      .filter(([, href]) => href)
      .map(([key, href]) => ({ key, href, name: PLATFORM_NAMES[key], label: T.followOn(PLATFORM_NAMES[key]) })),
    switchLang: (e: React.MouseEvent) => {
      e.preventDefault();
      const form = new FormData();
      form.set("locale", lang === "en" ? "ar" : "en");
      startTransition(async () => { await setLocale(form); router.refresh(); });
    },
    reload: () => window.location.reload(),

    claimV: claim,
    onClaim: (e: React.ChangeEvent<HTMLInputElement>) => setClaim(e.target.value.toLowerCase().replace(/\s/g, "")),
    claimGo,
    claimBorder: !name ? "rgba(2,25,65,0.10)" : ok ? GOOD : error === undefined ? "rgba(2,25,65,0.10)" : BAD,
    claimColor: !name || error === undefined ? "#56607A" : ok ? GOOD : BAD,
    claimColorD: !name || error === undefined ? "rgba(255,255,255,0.72)" : ok ? "#7EE2B8" : "#FCA5A5",
    claimMsg,

    nlV: nl, nlForm: !nlDone, nlDone, nlInvalid: nlErr ? "true" : "false", nlErrMsg: nlErr ? T.nlInvalid : "",
    nlBorder: nlErr ? "#C0362C" : "rgba(2,25,65,0.10)",
    onNl: (e: React.ChangeEvent<HTMLInputElement>) => { setNl(e.target.value.trim()); setNlErr(false); },
    nlGo: sendNl,
    nlKey: (e: React.KeyboardEvent) => { if (e.key === "Enter") sendNl(); },
    nlReset: () => { setNl(""); setNlDone(false); setNlErr(false); },

    price: T.price(PRICES[currency][yearly ? "yearly" : "monthly"]),
    unit: yearly ? T.perYear : T.perMonth,
    pickM: () => setYearly(false), pickY: () => setYearly(true),
    mBg: m.bg, mC: m.c, mP: m.p, yBg: y.bg, yC: y.c, yP: y.p,

    deck: TEMPLATES.map((x, i) => {
      let k = i - deck;
      if (k > n / 2) k -= n;
      if (k < -n / 2) k += n;
      const a = Math.abs(k), sgn = k > 0 ? -1 : 1, o = OFF[Math.min(a, 3)];
      return {
        name: T.templates[i], bg: x.bg, ink: x.ink, ac: x.accent, card: x.card, cur: k === 0 ? "true" : "false",
        tf: `translateX(${sgn * o[0]}px) scale(${o[1]}) rotate(${sgn * o[2]}deg)`, z: 20 - a, o: a > 2 ? 0 : 1,
        blur: a === 0 ? "none" : `blur(${a * 0.7}px)`, dot: k === 0 ? "#0A6CFF" : "rgba(2,25,65,0.16)", dotW: k === 0 ? 24 : 8,
        pick: () => setDeck(i),
      };
    }),
    deckName: T.templates[deck],
    deckNext: () => setDeck((deck + 1) % n), deckPrev: () => setDeck((deck - 1 + n) % n),
    pause: () => { paused.current = true; }, resume: () => { paused.current = false; },
    count: Math.round(240000 * progress).toLocaleString("en-US"),

    faq: faqList(T.faq, open, setOpen),
    faq2: faqList(T.faq2, open2, setOpen2),
  };
}
