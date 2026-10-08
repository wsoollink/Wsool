/**
 * Texts and data the design's scripts computed (claim messages, prices, FAQ,
 * template deck). The rest of the page text comes from the generated
 * *.text.ts files. Answers are kept true to how Wsool works.
 */
export const CLAIM_COOKIE = "wsool_claim";

/** Template deck colors from the design (background, ink, accent, card). */
export const TEMPLATES = [
  { bg: "#F3F4F6", ink: "#12151A", accent: "#2347D6", card: "rgba(255,255,255,0.85)" },
  { bg: "#07090E", ink: "#F2F4F8", accent: "#7DD3FC", card: "rgba(255,255,255,0.14)" },
  { bg: "#F4EDE3", ink: "#2B2118", accent: "#A0522D", card: "rgba(255,255,255,0.85)" },
  { bg: "#FBF1F2", ink: "#2A1A20", accent: "#C2577A", card: "rgba(255,255,255,0.85)" },
  { bg: "#0E0C0A", ink: "#F5EEDC", accent: "#D4AF37", card: "rgba(255,255,255,0.14)" },
  { bg: "linear-gradient(160deg, #5B21B6, #F97316)", ink: "#FFFFFF", accent: "#FDE047", card: "rgba(255,255,255,0.14)" },
  { bg: "#EEF2EC", ink: "#1E2A22", accent: "#3F7D58", card: "rgba(255,255,255,0.85)" },
  { bg: "linear-gradient(135deg, #E6F1F4, #FDF0D5)", ink: "#14161B", accent: "#0E7490", card: "rgba(255,255,255,0.85)" },
] as const;

export const MARKETING_TEXT = {
  ar: {
    claimHint: "حروف إنجليزية صغيرة وأرقام، من 3 إلى 20 حرف",
    claimChecking: "نتأكد إذا الرابط متاح…",
    claimOk: (u: string) => `✓ wsool.link/${u} متاح`,
    claimTaken: "هذا الرابط محجوز، جرّب اسم ثاني",
    claimInvalid: "استخدم حروف إنجليزية صغيرة وأرقام ونقطة وشرطة سفلية فقط",
    nlInvalid: "اكتب بريد إلكتروني صحيح",
    followOn: (p: string) => `حساب وصول على ${p} (يفتح في نافذة جديدة)`,
    price: (n: number) => String(n),
    perMonth: "ريال شهريًا",
    perYear: "ريال سنويًا",
    templates: ["أبيض", "أسود", "رملي", "زهري", "أسود وذهبي", "حيوي", "أخضر", "مخصص"],
    faq: [
      ["هل التسجيل مجاني؟", "نعم. تسجّل وتبني صفحتك مجانًا، وتبدأ تلقائيًا بتجربة كل مزايا الخطة المدفوعة 14 يوم بدون بطاقة دفع."],
      ["وش يصير بعد التجربة المجانية؟", "نذكّرك قبل نهايتها، وتختار الباقة الشهرية أو السنوية. لو ما اشتركت، ترجع صفحتك للخطة المجانية وتبقى كل بياناتك محفوظة."],
      ["كيف يتم توثيق أرقامي؟", "ترفع لقطة شاشة لصفحة كل حساب يبان فيها عدد المتابعين، ونراجعها خلال 48 ساعة، وتظهر الشارة لمدة 90 يوم."],
      ["هل أقدر أخفي أسعاري؟", "أكيد. تحدد أسعارك وتختار تظهرها في صفحتك أو ملف PDF أو تخفيها، ويظهر بدالها \"الأسعار عند التواصل\"."],
      ["أقدر أحذف حسابي؟", "نعم، من لوحة التحكم بنفسك في أي وقت، مع مهلة 30 يوم للتراجع."],
    ],
    faq2: [
      ["وش طرق الدفع المتاحة؟", "مدى، وApple Pay، والبطاقات الائتمانية."],
      ["أقدر ألغي في أي وقت؟", "نعم، تلغي من صفحة الاشتراك بضغطة، وتبقى المزايا شغالة لين نهاية الفترة اللي دفعتها."],
      ["أقدر أتحول من شهري لسنوي؟", "نعم، في أي وقت من صفحة الاشتراك، ويبدأ السنوي من موعد تجديدك الجاي."],
      ["هل الأسعار تشمل الضريبة؟", "نعم، الأسعار ثابتة في كل الدول وشاملة الضريبة."],
    ],
  },
  en: {
    claimHint: "Lowercase letters and numbers, 3 to 20 characters",
    claimChecking: "Checking if it's available…",
    claimOk: (u: string) => `✓ wsool.link/${u} is available`,
    claimTaken: "That link is taken. Try another name",
    claimInvalid: "Use lowercase letters, numbers, dots and underscores only",
    nlInvalid: "Enter a valid email",
    followOn: (p: string) => `Wsool on ${p} (opens in a new tab)`,
    price: (n: number) => `$${n}`,
    perMonth: "per month",
    perYear: "per year",
    templates: ["White", "Black", "Sand", "Pink", "Black & Gold", "Vivid", "Green", "Custom"],
    faq: [
      ["Is signing up free?", "Yes. Sign up and build your page for free, and you automatically get a 14-day trial of every paid feature, no card required."],
      ["What happens after the free trial?", "We remind you before it ends so you can pick a monthly or yearly plan. If you don’t subscribe, your page moves to the free plan and all your data stays safe."],
      ["How are my numbers verified?", "Upload a screenshot of each account showing your follower count. We review it within 48 hours and the badge stays for 90 days."],
      ["Can I hide my rates?", "Absolutely. Set your rates and choose to show them on your page, in your PDF, or hide them and show \"Rates on request\"."],
      ["Can I delete my account?", "Yes, yourself from the dashboard at any time, with a 30-day window to change your mind."],
    ],
    faq2: [
      ["Which payment methods do you accept?", "mada, Apple Pay and major credit cards."],
      ["Can I cancel anytime?", "Yes. Cancel in one tap from your subscription page and keep every feature until the end of your paid period."],
      ["Can I switch from monthly to yearly?", "Yes, anytime from your subscription page; yearly starts at your next renewal."],
      ["Do prices include VAT?", "Yes. Prices are the same in every country and include VAT."],
    ],
  },
} as const;
