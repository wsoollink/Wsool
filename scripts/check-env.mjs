// Fails the deploy build early with a clear reason. Never prints secret values.
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
];

const problems = [];

for (const name of required) {
  if (!process.env[name]?.trim()) problems.push(`${name}: missing`);
}

/** Common copy/paste mistakes in a Postgres connection string. */
function checkDatabaseUrl(name, expectedPort) {
  const value = process.env[name];
  if (!value) return;
  if (value !== value.trim()) problems.push(`${name}: has spaces or line breaks at the start/end`);
  if (/["']/.test(value)) problems.push(`${name}: contains quote marks (remove " and ')`);
  if (/YOUR-PASSWORD|[[\]]/.test(value)) problems.push(`${name}: still has [YOUR-PASSWORD] or [ ] brackets`);
  const atCount = (value.match(/@/g) ?? []).length;
  if (atCount !== 1) problems.push(`${name}: has ${atCount} "@" signs, expected 1 (a symbol in the password?)`);
  try {
    const url = new URL(value.trim());
    if (!url.protocol.startsWith("postgres")) problems.push(`${name}: should start with postgresql://`);
    if (url.port !== expectedPort) problems.push(`${name}: port is "${url.port}", expected ${expectedPort}`);
    if (!url.hostname.endsWith(".pooler.supabase.com")) problems.push(`${name}: host should end with .pooler.supabase.com`);
  } catch {
    problems.push(`${name}: not a valid URL`);
  }
}

checkDatabaseUrl("DATABASE_URL", "6543");
checkDatabaseUrl("DIRECT_URL", "5432");

if (problems.length > 0) {
  console.error("Environment variable problems:");
  for (const p of problems) console.error(`  - ${p}`);
  console.error("Fix them in Netlify: Project configuration > Environment variables.");
  process.exit(1);
}
console.log("All required environment variables are set.");
