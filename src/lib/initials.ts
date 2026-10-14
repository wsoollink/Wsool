/** Avatar letters: "إب" for Arabic names (a lone إ reads like "!"), the first letter otherwise. */
export function initials(name: string) {
  const chars = Array.from(name.trim().replace(/^@/, ""));
  return /[؀-ۿ]/.test(chars[0] ?? "") ? chars.slice(0, 2).join("") : (chars[0] ?? "").toUpperCase();
}
