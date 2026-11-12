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
    claimHint: "حروف إنجليزية صغيرة وأرقام، من 3 إلى 20 حرفًا",
    claimChecking: "نتحقق من توفر الرابط…",
    claimOk: (u: string) => `✓ wsool.link/${u} متاح`,
    claimTaken: "هذا الرابط محجوز، جرّب اسمًا آخر",
    claimInvalid: "استخدم حروفًا إنجليزية صغيرة وأرقامًا ونقطة وشرطة سفلية فقط",
    nlInvalid: "اكتب بريدًا إلكترونيًا صحيحًا",
    followOn: (p: string) => `حساب وصول على ${p} (يفتح في نافذة جديدة)`,
    chatWhatsapp: "تواصل مع وصول عبر WhatsApp (يفتح في نافذة جديدة)",
    appLabel: (store: string, live: boolean) => (live ? `حمّل تطبيق وصول من ${store} (يفتح في نافذة جديدة)` : `تطبيق وصول على ${store}`),
    price: (n: number) => String(n),
    perMonth: "ريال شهريًا",
    perYear: "ريال سنويًا",
    templates: ["أبيض", "أسود", "رملي", "زهري", "أسود وذهبي", "حيوي", "أخضر", "مخصص"],
    faq: [
      ["هل التسجيل مجاني؟", "نعم. تسجّل وتبني صفحتك مجانًا، وتبدأ تلقائيًا بتجربة كل مزايا الخطة الاحترافية لمدة 14 يومًا دون بطاقة دفع."],
      ["ماذا يحدث بعد التجربة المجانية؟", "نذكّرك قبل نهايتها، وتختار الباقة الشهرية أو السنوية. وإذا لم تشترك، تعود صفحتك إلى الخطة الأساسية وتبقى كل بياناتك محفوظة."],
      ["كيف يتم توثيق أرقامي؟", "أرفق لقطة شاشة لصفحة كل حساب يظهر فيها عدد المتابعين، ونراجعها خلال 48 ساعة، وتظهر الشارة لمدة 90 يومًا. وفي الخطة الاحترافية يمكنك ربط حساباتك (مثل YouTube وTikTok وX) فتتوثّق وتتحدث أرقامها تلقائيًا كل يوم."],
      ["هل يمكنني إخفاء أسعار الإعلانات؟", "بالتأكيد. تحدد أسعارك وتختار إظهارها في صفحتك أو ملف PDF أو إخفاءها، فتظهر بدلًا منها عبارة \"الأسعار عند التواصل\"."],
      ["هل يمكنني حذف حسابي؟", "نعم، بنفسك من لوحة التحكم في أي وقت، مع مهلة 30 يومًا للتراجع."],
    ],
    faq2: [
      ["ما طرق الدفع المتاحة؟", "مدى، وApple Pay، والبطاقات الائتمانية."],
      ["هل يمكنني الإلغاء في أي وقت؟", "نعم، تلغي من صفحة الاشتراك بضغطة، وتبقى المزايا مفعّلة حتى نهاية الفترة التي دفعت مقابلها."],
      ["هل يمكنني التحويل من الشهري إلى السنوي؟", "نعم، في أي وقت من صفحة الاشتراك، ويبدأ السنوي من موعد تجديدك القادم."],
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
    chatWhatsapp: "Chat with Wsool on WhatsApp (opens in a new tab)",
    appLabel: (store: string, live: boolean) => (live ? `Download the Wsool app on ${store} (opens in a new tab)` : `Wsool app on ${store}`),
    price: (n: number) => `$${n}`,
    perMonth: "per month",
    perYear: "per year",
    templates: ["White", "Black", "Sand", "Pink", "Black & Gold", "Vivid", "Green", "Custom"],
    faq: [
      ["Is signing up free?", "Yes. Sign up and build your page for free, and you automatically get a 14-day trial of every paid feature, no card required."],
      ["What happens after the free trial?", "We remind you before it ends so you can pick a monthly or yearly plan. If you don’t subscribe, your page moves to the free plan and all your data stays safe."],
      ["How are my numbers verified?", "Upload a screenshot of each account showing your follower count. We review it within 48 hours and the badge stays for 90 days. On Pro you can also link your accounts (like YouTube, TikTok and X) so they are verified and their numbers update by themselves every day."],
      ["Can I hide my ad rates?", "Absolutely. Set your rates and choose to show them on your page, in your PDF, or hide them and show \"Rates on request\"."],
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
