import { requestOrigin } from "@/lib/connect";
import { metaCallbacks } from "@/lib/connect/meta";

const meta = metaCallbacks("instagram", () => process.env.INSTAGRAM_APP_SECRET);

/** Meta's data deletion request (Business login settings → Data deletion request URL). */
export const POST = (req: Request) => meta.deletion(req, requestOrigin(req));
/** Status page Meta links the creator to. */
export const GET = (req: Request) => meta.status(req);
