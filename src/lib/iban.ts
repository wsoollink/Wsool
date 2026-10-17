/** IBAN check (ISO 13616 mod-97); Saudi IBANs are SA + 22 digits. */
export function validIban(raw: string) {
  const iban = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return null;
  if (iban.startsWith("SA") && !/^SA\d{22}$/.test(iban)) return null;
  const moved = iban.slice(4) + iban.slice(0, 4);
  const digits = moved.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const d of digits) rem = (rem * 10 + Number(d)) % 97;
  return rem === 1 ? iban : null;
}
