/**
 * Creates (or recreates) the demo creator page at /demo (data: src/lib/demo-page.ts).
 * On the live site the owner uses "Refresh demo page" in the admin overview instead.
 * Local development:  DATABASE_URL=<local db> npx tsx scripts/seed-demo.ts
 * "demo" is a reserved username, so no creator can claim it.
 *
 * Optional args for local template previews (never use in production):
 *   npx tsx scripts/seed-demo.ts <username> <template> [custom colors, e.g. "#e63946,#1d3557:dark"] [free]
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Template } from "../src/generated/prisma/enums";
import { buildDemoPage } from "../src/lib/demo-page";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const [username = "demo", template = "white", custom, plan] = process.argv.slice(2);
const customColors = custom
  ? { colors: custom.split(":")[0].split(","), mode: custom.split(":")[1] === "dark" ? ("dark" as const) : ("light" as const) }
  : undefined;

buildDemoPage(db, { username, template: template as Template, customColors, free: plan === "free" })
  .then((name) => console.log(`Demo page ready at /${name} (${template}, ${plan === "free" ? "free" : "pro"})`))
  .finally(() => db.$disconnect());
