/** Smooth SVG path (horizontal cubic curves) through values spread over width w, height h. */
export function smoothPath(values: number[], w: number, h: number, max: number, pad = 2) {
  const n = values.length;
  const x = (i: number) => (n === 1 ? w / 2 : (i * w) / (n - 1));
  const y = (v: number) => pad + (h - 2 * pad) * (1 - (max > 0 ? v / max : 0));
  let d = `M${x(0)},${y(values[0] ?? 0)}`;
  for (let i = 1; i < n; i++) {
    const cx = (x(i - 1) + x(i)) / 2;
    d += ` C${cx},${y(values[i - 1])} ${cx},${y(values[i])} ${x(i)},${y(values[i])}`;
  }
  return { line: d, area: `${d} L${x(n - 1)},${h} L${x(0)},${h} Z`, x, y };
}
