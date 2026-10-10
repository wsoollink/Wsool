import { countryCode } from "@/lib/places";
import { AGE_GROUPS, MAX_AUDIENCE_ROWS } from "@/lib/validation/accounts";

type Share = { label: string; percent: number };
export type AudienceFill = { gender: Share[]; ages: Share[]; countries: Share[]; cities: Share[] };

type Read = {
  female_percent: number | null;
  male_percent: number | null;
  age_groups: { range: string; percent: number }[];
  countries: { name: string; percent: number }[];
  cities: { name: string; percent: number }[];
};

/** Whole percents that never add up to more than 100 (the largest absorbs rounding). */
function whole(list: Share[]): Share[] {
  const out = list.map((s) => ({ ...s, percent: Math.max(0, Math.min(100, Math.round(s.percent))) })).filter((s) => s.percent > 0);
  const excess = out.reduce((sum, s) => sum + s.percent, 0) - 100;
  if (excess > 0 && out.length) {
    const top = out.reduce((a, b) => (b.percent > a.percent ? b : a));
    top.percent = Math.max(0, top.percent - excess);
  }
  return out;
}

/** "18-24" → 18, "55+" → 55, "١٨-٢٤" → 18; null when no number. */
function lowerBound(range: string): number | null {
  const digits = range.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)).match(/\d+/);
  return digits ? Number(digits[0]) : null;
}

/** Our fixed age group for a range's lower bound (platforms use 18-24, 25-34, 35-44, 45-54, 55+ ...). */
function ageGroup(lower: number): (typeof AGE_GROUPS)[number] {
  if (lower < 18) return "13-17";
  if (lower < 25) return "18-24";
  if (lower < 35) return "25-34";
  if (lower < 45) return "35-44";
  return "45+";
}

/** Turns an AI audience reading into the audience form's values (the creator reviews before saving). */
export function audienceFromRead(read: Read): AudienceFill {
  const gender = whole([
    ...(read.female_percent !== null ? [{ label: "female", percent: read.female_percent }] : []),
    ...(read.male_percent !== null ? [{ label: "male", percent: read.male_percent }] : []),
  ]);
  const ages = new Map<string, number>();
  for (const a of read.age_groups) {
    const lower = lowerBound(a.range);
    if (lower === null || !Number.isFinite(a.percent)) continue;
    const g = ageGroup(lower);
    ages.set(g, (ages.get(g) ?? 0) + a.percent);
  }
  const countries = new Map<string, number>();
  for (const c of read.countries) {
    const code = countryCode(c.name);
    if (code && !countries.has(code)) countries.set(code, c.percent);
  }
  const cities = new Map<string, number>();
  for (const c of read.cities) {
    const name = c.name.trim().slice(0, 40);
    if (name && !cities.has(name)) cities.set(name, c.percent);
  }
  const top = (m: Map<string, number>) => [...m].map(([label, percent]) => ({ label, percent })).sort((a, b) => b.percent - a.percent).slice(0, MAX_AUDIENCE_ROWS);
  return {
    gender,
    ages: whole(AGE_GROUPS.filter((g) => ages.has(g)).map((g) => ({ label: g, percent: ages.get(g)! }))),
    countries: whole(top(countries)),
    cities: whole(top(cities)),
  };
}
