import "server-only";

/** Meta's insight rows ({name, values: [{value}]} or {name, total_value: {value}}) as name → number. */
export type Insight = { name?: string; values?: { value?: unknown }[]; total_value?: { value?: unknown } };
export function insightValues(data?: Insight[] | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of data ?? []) {
    const v = row.total_value?.value ?? row.values?.[0]?.value;
    if (row.name && typeof v === "number" && Number.isFinite(v)) out[row.name] = v;
  }
  return out;
}

type Paged<M> = { data?: M[]; paging?: { cursors?: { after?: string }; next?: string } };

/** Walks the account's newest posts (pages of 50) until `match` finds one; null after `pages` pages. */
export async function findPost<M>(page: (after?: string) => Promise<Paged<M>>, match: (m: M) => boolean, pages = 6): Promise<M | null> {
  let after: string | undefined;
  for (let i = 0; i < pages; i++) {
    const res = await page(after);
    const hit = res.data?.find(match);
    if (hit) return hit;
    after = res.paging?.cursors?.after;
    if (!after || !res.paging?.next || !res.data?.length) return null;
  }
  return null;
}

/** Whole numbers only (dropping what the platform didn't send). */
export function clean(m: Record<string, number | undefined>) {
  return Object.fromEntries(Object.entries(m).filter(([, v]) => typeof v === "number" && Number.isFinite(v)).map(([k, v]) => [k, Math.round(v!)]));
}
