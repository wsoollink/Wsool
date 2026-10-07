import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Real environment variables win; .env.local is only a fallback for local dev.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Migrations need a session (non-pgbouncer) connection.
  datasource: { url: process.env.DIRECT_URL ?? "" },
});
