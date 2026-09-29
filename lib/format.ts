const int = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 });

export function fmtInt(v: number | null | undefined) {
  return v == null || !Number.isFinite(v) ? "—" : int.format(v);
}

export function fmtCompact(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  return Math.abs(v) < 10_000 ? int.format(v) : compact.format(v);
}

export function fmtPct(v: number | null | undefined, digits = 2) {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits }) + "%";
}

export function fmtSigned(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  return (v > 0 ? "+" : v < 0 ? "−" : "") + int.format(Math.abs(v));
}

export function fmtX(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  return "×" + v.toLocaleString("ru-RU", { maximumFractionDigits: v >= 10 ? 0 : 1 });
}

const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export function fmtDay(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

export function fmtDayYear(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// Относительное изменение, % (null если сравнивать не с чем)
export function change(cur: number | null | undefined, prev: number | null | undefined) {
  if (cur == null || prev == null || !Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  const word = m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
  return `${fmtInt(n)} ${word}`;
}

// Мелкие доли (0,016%) не округляем до нуля
export function fmtRate(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  return fmtPct(v, v > 0 && v < 0.1 ? 3 : v < 1 ? 2 : 1);
}
