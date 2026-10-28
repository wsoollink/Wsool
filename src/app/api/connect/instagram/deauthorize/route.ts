import { metaCallbacks } from "@/lib/connect/meta";

/** Meta: the creator removed Wsool in Instagram's settings (Business login settings → Deauthorize callback URL). */
export const POST = (req: Request) => metaCallbacks("instagram", () => process.env.INSTAGRAM_APP_SECRET).deauthorize(req);
