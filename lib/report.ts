// Сборка отчёта не зависит от сервера: источник данных передаётся снаружи.
// На сервере это Livedune или демо (lib/server-report.ts), в статическом демо — генератор прямо в браузере.
import { addDays, eachDay, type Period } from "./dates";
import type { RawAccount, RawHistoryRow, RawPost } from "./livedune/types";
import {
  engagementOf, median, pct, totalsOf,
  type Day, type PostRow, type Totals,
} from "./metrics";
import { NETWORKS, networkBySlug, type NetworkConfig, type Slug } from "./networks";

export type Source = {
  listAccounts: () => Promise<RawAccount[]>;
  getHistory: (id: number, from: string, to: string) => Promise<RawHistoryRow[]>;
  getPosts: (id: number, from: string, to: string) => Promise<RawPost[]>;
  project?: string; // проект в Livedune; пусто — все аккаунты
  stampOf?: (data: unknown) => { at: number; stale: boolean } | null; // когда получены данные
};

export type NetworkReport = {
  slug: Slug;
  label: string;
  brand: string;
  hasReach: boolean;
  parts: NetworkConfig["parts"];
  account: { id: number; name: string; url: string; img: string | null };
  period: Period;
  totals: Totals;
  prevTotals: Totals;
  days: Day[];
  prevDays: Day[];
  posts: PostRow[];
  medianViews: number | null;
  fetchedAt: number | null; // когда получены данные
  stale: boolean; // источник не ответил, показаны прошлые данные из кэша
};


const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
const z = (v: unknown) => n(v) ?? 0;

export async function projectAccounts(src: Source) {
  const all = await src.listAccounts();
  return src.project ? all.filter((a) => a.project === src.project) : all;
}

function toPost(raw: RawPost): Omit<PostRow, "er" | "vsMedian"> {
  const r = raw.reactions ?? {};
  const counts = {
    views: z(raw.impressions?.total),
    reach: n(raw.reach?.total),
    likes: z(r.likes),
    comments: z(r.comments),
    // репосты, «поделились» и пересылки — одно действие «распространить»
    shares: z(r.reposts) + z(r.shares) + z(r.forwards),
    saves: z(r.saved),
  };
  const engagement = engagementOf(counts);
  const created = raw.created ?? "";
  return {
    id: String(raw.post_id),
    url: raw.url ?? null,
    created,
    date: created.slice(0, 10),
    type: raw.type ?? "post",
    text: (raw.text ?? "").trim(),
    follows: n(raw.follows),
    ...counts,
    engagement,
    erv: pct(engagement, counts.views),
    err: pct(engagement, counts.reach),
  };
}

type BasePost = Omit<PostRow, "er" | "vsMedian">;

function buildDays(dates: string[], history: Map<string, RawHistoryRow>, posts: BasePost[], prevFollowers: number | null): Day[] {
  const byDate = new Map<string, BasePost[]>();
  for (const p of posts) byDate.set(p.date, [...(byDate.get(p.date) ?? []), p]);

  let last = prevFollowers;
  return dates.map((date) => {
    const h = history.get(date);
    const followers = n(h?.followers);
    const followersDelta = followers != null && last != null ? followers - last : null;
    if (followers != null) last = followers;

    const ps = byDate.get(date) ?? [];
    const c = {
      views: ps.reduce((s, p) => s + p.views, 0),
      reach: ps.some((p) => p.reach != null) ? ps.reduce((s, p) => s + (p.reach ?? 0), 0) : null,
      likes: ps.reduce((s, p) => s + p.likes, 0),
      comments: ps.reduce((s, p) => s + p.comments, 0),
      shares: ps.reduce((s, p) => s + p.shares, 0),
      saves: ps.reduce((s, p) => s + p.saves, 0),
    };
    const engagement = engagementOf(c);
    return {
      date,
      followers,
      followersDelta,
      gained: n(h?.gained),
      lost: n(h?.lost),
      accReach: n(h?.reach?.total),
      accImpressions: n(h?.impressions),
      profileViews: n(h?.profile_views),
      avgViews: n(h?.avg_views),
      posts: ps.length,
      ...c,
      engagement,
      erv: ps.length ? pct(engagement, c.views) : null,
      err: ps.length ? pct(engagement, c.reach) : null,
      er: ps.length ? pct(engagement / ps.length, followers ?? last) : null,
    };
  });
}

function followersOn(history: Map<string, RawHistoryRow>, date: string) {
  // последнее известное значение на дату или раньше (до 7 дней назад)
  for (let i = 0; i < 7; i++) {
    const v = n(history.get(addDays(date, -i))?.followers);
    if (v != null) return v;
  }
  return null;
}

export async function buildReport(src: Source, slug: Slug, period: Period, account?: RawAccount): Promise<NetworkReport | null> {
  const net = networkBySlug(slug);
  if (!net) return null;
  const acc = account ?? (await projectAccounts(src)).find((a) => a.type === net.type);
  if (!acc) return null;

  // Одним запросом берём и текущий, и прошлый период (плюс неделя до — для базы подписчиков)
  const [historyRows, rawPosts] = await Promise.all([
    src.getHistory(acc.id, addDays(period.prevFrom, -7), period.to),
    src.getPosts(acc.id, period.prevFrom, period.to),
  ]);
  const history = new Map(historyRows.map((r) => [r.created, r]));
  const allPosts = rawPosts.map(toPost);

  const inRange = (from: string, to: string) => allPosts.filter((p) => p.date >= from && p.date <= to);

  const make = (from: string, to: string) => {
    const base = inRange(from, to).sort((a, b) => b.created.localeCompare(a.created));
    const before = followersOn(history, addDays(from, -1));
    const days = buildDays(eachDay(from, to), history, base, before);
    const med = median(base.map((p) => p.views));
    const posts: PostRow[] = base.map((p) => {
      const f = followersOn(history, p.date);
      return { ...p, er: pct(p.engagement, f), vsMedian: med ? p.views / med : null };
    });
    return { posts, days, totals: totalsOf(posts, days, before), med };
  };

  const cur = make(period.from, period.to);
  const prev = make(period.prevFrom, period.prevTo);

  return {
    slug: net.slug,
    label: net.label,
    brand: net.brand,
    hasReach: net.hasReach,
    parts: net.parts,
    account: { id: acc.id, name: acc.name, url: acc.url, img: acc.img ?? null },
    period,
    totals: cur.totals,
    prevTotals: prev.totals,
    days: cur.days,
    prevDays: prev.days,
    posts: cur.posts,
    medianViews: cur.med,
    fetchedAt: Math.min(...[historyRows, rawPosts].map((d) => src.stampOf?.(d)?.at ?? Date.now())),
    stale: [historyRows, rawPosts].some((d) => src.stampOf?.(d)?.stale ?? false),
  };
}

export type FailedNetwork = { slug: Slug; label: string; error: string };

export async function buildOverview(src: Source, period: Period) {
  const accounts = await projectAccounts(src);
  const reports: NetworkReport[] = [];
  const failed: FailedNetwork[] = [];
  // По две сети параллельно, чтобы не ловить 429
  const queue = NETWORKS.filter((net) => accounts.some((a) => a.type === net.type));
  for (let i = 0; i < queue.length; i += 2) {
    const batch = await Promise.all(
      queue.slice(i, i + 2).map((net) =>
        buildReport(src, net.slug, period, accounts.find((a) => a.type === net.type)).catch((e: unknown) => {
          // Одна сеть упала — остальные показываем, а про эту говорим прямо
          failed.push({ slug: net.slug, label: net.label, error: e instanceof Error ? e.message : "Не удалось загрузить" });
          return null;
        }),
      ),
    );
    for (const r of batch) if (r) reports.push(r);
  }
  return { reports, failed };
}
