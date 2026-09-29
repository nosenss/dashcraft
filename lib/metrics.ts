// Чистые функции и типы: используются и на сервере, и в браузере.
import { monthStart, weekStart } from "./dates";

export type Counts = {
  views: number;
  reach: number | null; // охват постов, только Instagram
  likes: number;
  comments: number;
  shares: number;
  saves: number;
};

export type PostRow = Counts & {
  id: string;
  url: string | null;
  created: string; // "YYYY-MM-DD HH:MM:SS"
  date: string;
  type: string;
  text: string;
  follows: number | null;
  engagement: number;
  erv: number | null;
  err: number | null;
  er: number | null;
  vsMedian: number | null; // просмотры / медиана просмотров за период
};

export type Day = {
  date: string;
  followers: number | null;
  followersDelta: number | null;
  gained: number | null;
  lost: number | null;
  accReach: number | null; // охват аккаунта за день (Instagram)
  accImpressions: number | null;
  profileViews: number | null;
  avgViews: number | null; // скользящее среднее просмотров на пост (Livedune)
  posts: number;
} & Counts & {
  engagement: number;
  erv: number | null;
  err: number | null;
  er: number | null;
  // Медиана за 7 дней — типичный уровень без дней без постов и одиночных выбросов
  er7?: number | null;
  erv7?: number | null;
  err7?: number | null;
};

export type Totals = Counts & {
  followers: number | null;
  followersDelta: number | null;
  gained: number | null;
  lost: number | null;
  accReach: number | null;
  profileViews: number | null;
  posts: number;
  engagement: number;
  avgViews: number | null;
  avgReach: number | null;
  avgEngagement: number | null;
  viewRate: number | null; // средние просмотры поста / подписчики
  reachRate: number | null; // средний охват поста / подписчики
  uniqueShare: number | null; // охват / просмотры: доля уникальных среди просмотров
  erv: number | null; // вовлечение / просмотры
  err: number | null; // вовлечение / охват
  er: number | null; // среднее вовлечение на пост / подписчики
};

export const pct = (a: number | null, b: number | null) =>
  a == null || b == null || b <= 0 ? null : (a / b) * 100;

export const sum = (xs: (number | null | undefined)[]) => {
  let s = 0;
  let any = false;
  for (const x of xs) if (x != null) { s += x; any = true; }
  return any ? s : null;
};

export function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function engagementOf(c: Pick<Counts, "likes" | "comments" | "shares" | "saves">) {
  return c.likes + c.comments + c.shares + c.saves;
}

// Итоги по набору постов и дней: формулы как в Livedune
export function totalsOf(posts: PostRow[], days: Day[], followersBefore: number | null): Totals {
  const n = posts.length;
  const views = posts.reduce((s, p) => s + p.views, 0);
  const reachVals = posts.map((p) => p.reach).filter((r): r is number => r != null);
  const reach = reachVals.length ? reachVals.reduce((a, b) => a + b, 0) : null;
  const likes = posts.reduce((s, p) => s + p.likes, 0);
  const comments = posts.reduce((s, p) => s + p.comments, 0);
  const shares = posts.reduce((s, p) => s + p.shares, 0);
  const saves = posts.reduce((s, p) => s + p.saves, 0);
  const engagement = likes + comments + shares + saves;

  const withFollowers = days.filter((d) => d.followers != null);
  const followers = withFollowers.at(-1)?.followers ?? null;
  // Как в Livedune: разница между первым и последним днём периода
  const start = withFollowers[0]?.followers ?? followersBefore;
  const avgViews = n ? views / n : null;
  const avgReach = n && reach != null ? reach / n : null;
  const avgEngagement = n ? engagement / n : null;

  return {
    views, reach, likes, comments, shares, saves, engagement,
    followers,
    followersDelta: followers != null && start != null ? followers - start : null,
    gained: sum(days.map((d) => d.gained)),
    lost: sum(days.map((d) => d.lost)),
    accReach: sum(days.map((d) => d.accReach)),
    profileViews: sum(days.map((d) => d.profileViews)),
    posts: n,
    avgViews, avgReach, avgEngagement,
    viewRate: pct(avgViews, followers),
    reachRate: pct(avgReach, followers),
    uniqueShare: pct(reach, views),
    erv: pct(engagement, views),
    err: pct(engagement, reach),
    er: pct(avgEngagement, followers),
  };
}

export type Grain = "day" | "week" | "month";

// Сворачиваем дни в недели/месяцы: суммы складываем, подписчиков берём на конец, доли пересчитываем
export function bucketDays(days: Day[], grain: Grain): Day[] {
  if (grain === "day") return days;
  const keyOf = grain === "week" ? weekStart : monthStart;
  const groups = new Map<string, Day[]>();
  for (const d of days) {
    const k = keyOf(d.date);
    groups.set(k, [...(groups.get(k) ?? []), d]);
  }
  return [...groups.entries()].map(([date, ds]) => {
    const followers = ds.filter((d) => d.followers != null).at(-1)?.followers ?? null;
    const posts = ds.reduce((s, d) => s + d.posts, 0);
    const c = {
      views: ds.reduce((s, d) => s + d.views, 0),
      reach: sum(ds.map((d) => d.reach)),
      likes: ds.reduce((s, d) => s + d.likes, 0),
      comments: ds.reduce((s, d) => s + d.comments, 0),
      shares: ds.reduce((s, d) => s + d.shares, 0),
      saves: ds.reduce((s, d) => s + d.saves, 0),
    };
    const engagement = engagementOf(c);
    const avgs = ds.map((d) => d.avgViews).filter((v): v is number => v != null);
    return {
      date,
      followers,
      followersDelta: sum(ds.map((d) => d.followersDelta)),
      gained: sum(ds.map((d) => d.gained)),
      lost: sum(ds.map((d) => d.lost)),
      accReach: sum(ds.map((d) => d.accReach)),
      accImpressions: sum(ds.map((d) => d.accImpressions)),
      profileViews: sum(ds.map((d) => d.profileViews)),
      avgViews: avgs.length ? avgs.at(-1)! : null,
      posts,
      ...c,
      engagement,
      erv: posts ? pct(engagement, c.views) : null,
      err: posts ? pct(engagement, c.reach) : null,
      er: posts ? pct(engagement / posts, followers) : null,
    };
  });
}

// Добавляет er7/erv7/err7: медиана долей по дням с постами за последние 7 дней.
// Медиана, а не среднее: один виральный пост не должен задирать линию на всю неделю.
export function withRolling(days: Day[], before: Day[], window = 7): Day[] {
  const all = [...before, ...days];
  const offset = before.length;
  const med = (w: Day[], k: "er" | "erv" | "err") => median(w.map((x) => x[k]).filter((v): v is number => v != null));
  return days.map((d, i) => {
    const w = all.slice(Math.max(0, offset + i - window + 1), offset + i + 1);
    return { ...d, er7: med(w, "er"), erv7: med(w, "erv"), err7: med(w, "err") };
  });
}

function quantile(sorted: number[], q: number) {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  return sorted[lo] + (sorted[Math.ceil(pos)] - sorted[lo]) * (pos - lo);
}

// Порог обрезки шкалы: если один-два значения в разы больше остальных (виральный пост),
// шкалу строим по обычным значениям, а выброс рисуем упёртым в край и подписываем.
// Возвращает null, если выбросов нет.
export function outlierCap(values: (number | null | undefined)[], minCount = 5) {
  const vals = values
    .filter((v): v is number => v != null && Number.isFinite(v))
    .map(Math.abs)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  if (vals.length < minCount) return null;
  const q = quantile(vals, 0.85);
  const max = vals.at(-1)!;
  return q > 0 && max > q * 4 ? q * 2 : null;
}
