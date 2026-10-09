/** Commas, quotes or line breaks → quoted; a leading = + - @ is neutralised (spreadsheet formulas). */
export function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** A CSV download (BOM so Excel reads UTF-8 Arabic), never cached. */
export function csvResponse(name: string, header: string, rows: string[][]) {
  const lines = [header, ...rows.map((r) => r.map(csvCell).join(","))];
  const day = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="wsool-${name}-${day}.csv"`,
      "cache-control": "no-store",
    },
  });
}
