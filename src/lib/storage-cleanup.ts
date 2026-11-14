import "server-only";
import { MEDIA_BUCKET, UPLOAD_KINDS, type UploadKind } from "@/config/uploads";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { publicFileUrl } from "@/lib/storage";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/** Uploads younger than this are never touched (a form may still be open, or a cover waiting for "Save"). */
const MIN_AGE_DAYS = 7;
/** Owner folders checked per day; the slice moves every day, so every folder comes round. */
const FOLDERS_PER_DAY = 40;
const TIME_BUDGET_MS = 25_000;

const MEDIA_KINDS = (Object.keys(UPLOAD_KINDS) as UploadKind[]).filter((k) => UPLOAD_KINDS[k].bucket === MEDIA_BUCKET);

/** The URLs no row uses: page photo/logo, licenses, brands, works, links, coupons, agencies, agency brands, newsletter issues. */
async function unused(urls: string[]): Promise<Set<string>> {
  if (urls.length === 0) return new Set();
  const rows = await db.$queryRaw<{ u: string }[]>`
    SELECT u FROM unnest(${urls}::text[]) AS u
    WHERE NOT EXISTS (SELECT 1 FROM pages WHERE photo_url = u OR logo_url = u)
      AND NOT EXISTS (SELECT 1 FROM licenses WHERE file_url = u)
      AND NOT EXISTS (SELECT 1 FROM brand_logos WHERE logo_url = u)
      AND NOT EXISTS (SELECT 1 FROM portfolio_items WHERE video_url = u OR thumb_url = u)
      AND NOT EXISTS (SELECT 1 FROM page_links WHERE image_url = u)
      AND NOT EXISTS (SELECT 1 FROM coupons WHERE logo_url = u)
      AND NOT EXISTS (SELECT 1 FROM agencies WHERE logo_url = u)
      AND NOT EXISTS (SELECT 1 FROM agency_brands WHERE logo_url = u)
      AND NOT EXISTS (SELECT 1 FROM testimonials WHERE photo_url = u)
      AND NOT EXISTS (SELECT 1 FROM newsletter_campaigns WHERE cta_url = u OR strpos(body_ar, u) > 0 OR strpos(body_en, u) > 0)
      AND NOT EXISTS (SELECT 1 FROM articles WHERE cover_url = u OR strpos(body, u) > 0)
      AND NOT EXISTS (SELECT 1 FROM ad_report_posts WHERE thumb_url = u)`;
  return new Set(rows.map((r) => r.u));
}

/**
 * Deletes files in the public `media` bucket that no row has used for 7 days (replaced photos the save didn't
 * remove, uploads from forms that were never saved). Runs once a day from the hourly job, on a slice of the owner
 * folders. Verification screenshots (private bucket) are not touched. Returns how many files were removed.
 */
export async function cleanOrphanUploads(now = new Date()): Promise<number> {
  // Never against a local database: it doesn't know the real files in Supabase Storage and would delete them.
  if (/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "")) return 0;
  if (!(await rateLimit(`storage-cleanup:${now.toISOString().slice(0, 10)}`, 1, 2 * 86_400))) return 0;
  const started = Date.now();
  const bucket = createSupabaseAdmin().storage.from(MEDIA_BUCKET);

  const folders: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await bucket.list("", { limit: 1000, offset });
    if (error || !data?.length) break;
    folders.push(...data.filter((f) => !f.id).map((f) => f.name)); // folders have no id
    if (data.length < 1000) break;
  }
  if (folders.length === 0) return 0;
  folders.sort();
  const day = Math.floor(now.getTime() / 86_400_000);
  const start = (day * FOLDERS_PER_DAY) % folders.length;
  const slice = Array.from({ length: Math.min(FOLDERS_PER_DAY, folders.length) }, (_, i) => folders[(start + i) % folders.length]);

  const cutoff = now.getTime() - MIN_AGE_DAYS * 86_400_000;
  let removed = 0;
  for (const owner of slice) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    const old: string[] = [];
    for (const kind of MEDIA_KINDS) {
      const { data } = await bucket.list(`${owner}/${kind}`, { limit: 1000 });
      for (const f of data ?? []) {
        const created = Date.parse(f.created_at ?? "");
        if (f.id && Number.isFinite(created) && created < cutoff) old.push(`${owner}/${kind}/${f.name}`);
      }
    }
    if (old.length === 0) continue;
    const byUrl = new Map(old.map((p) => [publicFileUrl(p), p]));
    const orphans = [...(await unused([...byUrl.keys()]))].map((u) => byUrl.get(u)!);
    if (orphans.length) {
      const { error } = await bucket.remove(orphans);
      if (error) console.error("[storage-cleanup]", owner, error.message);
      else removed += orphans.length;
    }
  }
  if (removed) console.log(`[storage-cleanup] removed ${removed} unused files`);
  return removed;
}
