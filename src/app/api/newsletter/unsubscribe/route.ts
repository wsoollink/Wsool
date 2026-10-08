import { unsubscribe, verifyLink } from "@/lib/newsletter";

/**
 * One-click unsubscribe (RFC 8058) for mail apps: POST to the List-Unsubscribe
 * URL. The same link opened in a browser shows the /newsletter/unsubscribe page.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "", token = url.searchParams.get("t") ?? "";
  if (!verifyLink("unsubscribe", id, token)) return new Response("Invalid", { status: 400 });
  await unsubscribe(id);
  return new Response("ok");
}
