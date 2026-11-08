/**
 * Discount codes "for specific people" (owner, Nov 2026): a list pasted or read from a .txt / .csv file, one person per
 * line: a name, an email, or "name, email" (comma, Arabic comma, semicolon or tab). Pure, so it runs in the browser.
 */
export type PersonRow = { note: string; email: string };

const EMAIL = /^[^\s@,;،]+@[^\s@,;،]+\.[^\s@,;،]+$/;
const HEADER = /^(name|names|الاسم|اسم|الأسماء)(\s|[,;،\t]|$)/i;

export function parsePeopleList(text: string, room: number): { rows: PersonRow[]; duplicates: number; overLimit: number } {
  const seen = new Set<string>();
  const rows: PersonRow[] = [];
  let duplicates = 0, overLimit = 0;
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length && HEADER.test(lines[0])) lines.shift();
  for (const line of lines) {
    const parts = line.split(/[,;،\t]/).map((p) => p.trim().replace(/^"(.*)"$/, "$1").trim()).filter(Boolean);
    const email = parts.find((p) => EMAIL.test(p)) ?? "";
    const note = parts.filter((p) => p !== email).join(" ").slice(0, 120);
    if (!note && !email) continue;
    const key = `${note.toLowerCase()}|${email.toLowerCase()}`;
    if (seen.has(key)) { duplicates++; continue; }
    seen.add(key);
    if (rows.length >= room) { overLimit++; continue; }
    rows.push({ note, email: email.toLowerCase() });
  }
  return { rows, duplicates, overLimit };
}

/** The created codes as a CSV file (name, code, email), with a BOM so Excel shows Arabic correctly. */
export function codesCsv(codes: { code: string; note?: string | null; email?: string | null }[], header: [string, string, string]): string {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return "﻿" + [header, ...codes.map((c) => [c.note ?? "", c.code, c.email ?? ""])].map((r) => r.map(cell).join(",")).join("\r\n");
}
