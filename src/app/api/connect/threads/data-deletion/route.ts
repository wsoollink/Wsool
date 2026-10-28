import { requestOrigin } from "@/lib/connect";
import { metaCallbacks } from "@/lib/connect/meta";

const meta = metaCallbacks("threads", () => process.env.THREADS_APP_SECRET);

/** Meta's data deletion request for Threads (Threads use case → Delete callback URL). */
export const POST = (req: Request) => meta.deletion(req, requestOrigin(req));
/** Status page Meta links the creator to. */
export const GET = (req: Request) => meta.status(req);
