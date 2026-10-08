type RateLike = { name: string; nameEn: string | null; price: number };
type AccountLike = { id: string; rates: RateLike[] };

const key = (name: string) => name.trim().toLowerCase();

/** Rate type name in the page language (English falls back to the Arabic name). */
export function rateName(rate: { name: string; nameEn: string | null }, lang: "ar" | "en") {
  return lang === "en" && rate.nameEn ? rate.nameEn : rate.name;
}

/**
 * "Instead of X" for a bundle rate (CLAUDE.md section 5): only when every
 * platform in the bundle has a rate type with the same name. Returns the sum
 * of those separate prices and the savings percent, or null.
 */
export function bundleComparison(rate: RateLike, accountIds: string[], accounts: AccountLike[]) {
  if (accountIds.length < 2) return null;
  let separate = 0;
  for (const id of accountIds) {
    const match = accounts.find((a) => a.id === id)?.rates.find((r) => key(r.name) === key(rate.name));
    if (!match) return null;
    separate += match.price;
  }
  if (separate <= rate.price) return null;
  return { separate, savingsPercent: Math.round(((separate - rate.price) / separate) * 100) };
}
