/**
 * Turns the free-text country and city creators type ("السعودية", "Saudi
 * Arabia", "KSA"; "جده", "Jeddah") into one key each, so staff insights
 * count them together. Pure functions, no database.
 */

/** Lowercase, no diacritics/tatweel, one Arabic spelling for أإآ/ة/ى, no punctuation. */
export function normalizePlace(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Short forms people actually type, beside the official names Intl knows.
const COUNTRY_ALIASES: Record<string, string> = {
  "السعوديه": "SA", "المملكه": "SA", "ksa": "SA", "saudi": "SA", "saudia": "SA", "saudi arabia": "SA",
  "الامارات": "AE", "uae": "AE", "emirates": "AE", "the uae": "AE",
  "الكويت": "KW", "قطر": "QA", "البحرين": "BH", "عمان": "OM", "سلطنه عمان": "OM",
  "مصر": "EG", "الاردن": "JO", "العراق": "IQ", "لبنان": "LB", "سوريا": "SY", "المغرب": "MA",
  "الجزائر": "DZ", "تونس": "TN", "ليبيا": "LY", "السودان": "SD", "اليمن": "YE", "فلسطين": "PS",
  "امريكا": "US", "usa": "US", "us": "US", "america": "US", "بريطانيا": "GB", "uk": "GB", "england": "GB",
};

// Pseudo, grouping and retired codes Intl still names (FX = old "Metropolitan France").
const NOT_COUNTRIES = new Set(["EU", "EZ", "UN", "QO", "XA", "XB", "ZZ", "FX", "AN", "BU", "CS", "DD", "NT", "SU", "TP", "YD", "YU", "ZR"]);

let countryIndex: Map<string, string> | null = null;
function buildCountryIndex() {
  const index = new Map<string, string>();
  const ar = new Intl.DisplayNames(["ar"], { type: "region" });
  const en = new Intl.DisplayNames(["en"], { type: "region" });
  const A = 65;
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const code = String.fromCharCode(A + i, A + j);
      const nameEn = en.of(code);
      if (!nameEn || nameEn === code || NOT_COUNTRIES.has(code)) continue;
      for (const name of [nameEn, ar.of(code)]) {
        const key = name && name !== code ? normalizePlace(name) : "";
        if (key && !index.has(key)) index.set(key, code);
      }
    }
  }
  for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) index.set(normalizePlace(alias), code);
  return index;
}

/** ISO code for a typed country name, or null when it isn't recognised. */
export function countryCode(text: string): string | null {
  const key = normalizePlace(text);
  if (!key) return null;
  countryIndex ??= buildCountryIndex();
  return countryIndex.get(key) ?? countryIndex.get(key.replace(/^ال/, "")) ?? null;
}

// Common cities in both languages (and usual spellings) → one key with both names.
const CITIES: { ar: string; en: string; also?: string[] }[] = [
  { ar: "الرياض", en: "Riyadh" },
  { ar: "جدة", en: "Jeddah", also: ["جده", "jidda", "jiddah", "jedda"] },
  { ar: "مكة", en: "Makkah", also: ["مكه المكرمه", "مكة المكرمة", "mecca", "makkah al mukarramah"] },
  { ar: "المدينة المنورة", en: "Madinah", also: ["المدينه", "medina", "al madinah", "madina"] },
  { ar: "الدمام", en: "Dammam" },
  { ar: "الخبر", en: "Khobar", also: ["al khobar", "alkhobar"] },
  { ar: "الظهران", en: "Dhahran" },
  { ar: "الأحساء", en: "Al Ahsa", also: ["الاحساء", "الهفوف", "hofuf", "al hasa", "alahsa"] },
  { ar: "الجبيل", en: "Jubail" },
  { ar: "القطيف", en: "Qatif" },
  { ar: "الطائف", en: "Taif" },
  { ar: "أبها", en: "Abha" },
  { ar: "خميس مشيط", en: "Khamis Mushait" },
  { ar: "تبوك", en: "Tabuk" },
  { ar: "بريدة", en: "Buraydah", also: ["buraidah", "buraydah"] },
  { ar: "عنيزة", en: "Unaizah" },
  { ar: "حائل", en: "Hail", also: ["حايل", "ha il"] },
  { ar: "جازان", en: "Jazan", also: ["جيزان", "jizan", "gizan"] },
  { ar: "نجران", en: "Najran" },
  { ar: "ينبع", en: "Yanbu" },
  { ar: "الباحة", en: "Al Baha", also: ["baha"] },
  { ar: "سكاكا", en: "Sakaka" },
  { ar: "عرعر", en: "Arar" },
  { ar: "دبي", en: "Dubai" },
  { ar: "أبوظبي", en: "Abu Dhabi", also: ["ابو ظبي", "abudhabi"] },
  { ar: "الشارقة", en: "Sharjah" },
  { ar: "العين", en: "Al Ain" },
  { ar: "الكويت", en: "Kuwait City", also: ["kuwait", "مدينه الكويت"] },
  { ar: "الدوحة", en: "Doha" },
  { ar: "المنامة", en: "Manama" },
  { ar: "مسقط", en: "Muscat" },
  { ar: "القاهرة", en: "Cairo" },
  { ar: "الإسكندرية", en: "Alexandria" },
  { ar: "عمّان", en: "Amman" },
  { ar: "بيروت", en: "Beirut" },
  { ar: "بغداد", en: "Baghdad" },
  { ar: "الدار البيضاء", en: "Casablanca" },
  { ar: "لندن", en: "London" },
];

let cityIndex: Map<string, (typeof CITIES)[number]> | null = null;
function buildCityIndex() {
  const index = new Map<string, (typeof CITIES)[number]>();
  for (const c of CITIES) for (const name of [c.ar, c.en, ...(c.also ?? [])]) index.set(normalizePlace(name), c);
  return index;
}

/**
 * One key per city: known cities get "city:<english name>" and their names in
 * both languages; any other city is grouped by its normalised spelling.
 */
export function cityKey(text: string): { key: string; ar?: string; en?: string } | null {
  const norm = normalizePlace(text);
  if (!norm) return null;
  cityIndex ??= buildCityIndex();
  const known = cityIndex.get(norm) ?? cityIndex.get(norm.replace(/^(ال|al )/, ""));
  return known ? { key: `city:${known.en.toLowerCase()}`, ar: known.ar, en: known.en } : { key: `text:${norm}` };
}
