import { metaCallbacks } from "@/lib/connect/meta";

/** Meta: the creator removed Wsool in Threads' settings (Threads use case → Uninstall callback URL). */
export const POST = (req: Request) => metaCallbacks("threads", () => process.env.THREADS_APP_SECRET).deauthorize(req);
