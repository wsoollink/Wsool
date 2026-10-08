// Fails the deploy build early, naming any required variable that is missing.
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
];

const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  console.error("Add them in Netlify: Project configuration > Environment variables (scope: Builds).");
  process.exit(1);
}
console.log("All required environment variables are set.");
