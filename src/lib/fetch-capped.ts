import "server-only";

/**
 * Reads a response body up to `maxBytes` (null when it is bigger), without
 * loading more than that into memory. Checks Content-Length first when sent.
 */
export async function readCapped(res: Response, maxBytes: number): Promise<Buffer | null> {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await res.body?.cancel().catch(() => {});
    return null;
  }
  if (!res.body) return Buffer.alloc(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/**
 * Fetches an image for the PDF / link-preview image: images only, at most
 * `maxBytes` (default 10 MB), with a timeout. Null on anything else.
 */
export async function fetchImage(url: string | URL, maxBytes = 10 * 1024 * 1024, timeoutMs = 8000): Promise<{ bytes: Buffer; type: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!res.ok || !type.startsWith("image/")) {
      await res.body?.cancel().catch(() => {});
      return null;
    }
    const bytes = await readCapped(res, maxBytes);
    return bytes && bytes.length ? { bytes, type } : null;
  } catch {
    return null;
  }
}
