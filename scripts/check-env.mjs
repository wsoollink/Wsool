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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
if (supabaseUrl && !/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(supabaseUrl)) {
  problems.push("NEXT_PUBLIC_SUPABASE_URL: should look like https://<project-id>.supabase.co (no db. prefix)");
}
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
if (publishable && !publishable.startsWith("sb_publishable_")) {
  problems.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: should start with sb_publishable_");
}
const secret = process.env.SUPABASE_SECRET_KEY?.trim();
if (secret && !secret.startsWith("sb_secret_")) problems.push("SUPABASE_SECRET_KEY: should start with sb_secret_");

checkDatabaseUrl("DATABASE_URL", "6543");
checkDatabaseUrl("DIRECT_URL", "5432");

// Supabase's pooler needs the user "postgres.<project-id>" of the same project as
// NEXT_PUBLIC_SUPABASE_URL, and both database URLs must carry the same password.
const projectId = supabaseUrl?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
const parsed = {};
for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
  try {
    parsed[name] = new URL(process.env[name]?.trim() ?? "");
  } catch {}
}
for (const [name, url] of Object.entries(parsed)) {
  const user = decodeURIComponent(url.username);
  if (!user.startsWith("postgres.")) problems.push(`${name}: user should be postgres.<project-id>, not "${user}"`);
  else if (projectId && user !== `postgres.${projectId}`) {
    problems.push(`${name}: belongs to a different Supabase project than NEXT_PUBLIC_SUPABASE_URL`);
  }
  if (!url.password) problems.push(`${name}: has no password`);
}
if (parsed.DATABASE_URL && parsed.DIRECT_URL && parsed.DATABASE_URL.password !== parsed.DIRECT_URL.password) {
  problems.push("DATABASE_URL and DIRECT_URL have different passwords");
}

if (problems.length > 0) {
  console.error("Environment variable problems:");
  for (const p of problems) console.error(`  - ${p}`);
  console.error("Fix them in Netlify: Project configuration > Environment variables.");
  process.exit(1);
}
console.log("All required environment variables are set.");
