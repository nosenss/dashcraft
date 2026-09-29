const DAY = 86_400_000;

export function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function parseISO(iso: string) {
  return new Date(iso + "T00:00:00Z");
}

export function addDays(iso: string, n: number) {
  return toISO(new Date(parseISO(iso).getTime() + n * DAY));
}

export function daysBetween(from: string, to: string) {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / DAY) + 1;
}

export function eachDay(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

// Текущая дата по Москве: так же считает Livedune
export function todayMSK() {
  return toISO(new Date(Date.now() + 3 * 3_600_000));
}

// Понедельник недели, в которую попадает дата
export function weekStart(iso: string) {
  const dow = (parseISO(iso).getUTCDay() + 6) % 7;
  return addDays(iso, -dow);
}

export function monthStart(iso: string) {
  return iso.slice(0, 8) + "01";
}

const valid = (v?: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export type Period = { from: string; to: string; prevFrom: string; prevTo: string; days: number };

export function resolvePeriod(fromParam?: string | null, toParam?: string | null): Period {
  const today = todayMSK();
  let to = valid(toParam) ?? today;
  if (to > today) to = today;
  let from = valid(fromParam) ?? addDays(to, -29);
  if (from > to) from = to;
  const days = daysBetween(from, to);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(days - 1));
  return { from, to, prevFrom, prevTo, days };
}
