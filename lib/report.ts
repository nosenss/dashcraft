// Сборка отчёта не зависит от сервера: источник данных передаётся снаружи.
// На сервере это Livedune или демо (lib/server-report.ts), в статическом демо — генератор прямо в браузере.
import { ALL, inScope, listTabs, pickAccount, sameProject, type AccountTab, type Scope } from "./accounts";
import { addDays, eachDay, type Period } from "./dates";
import type { RawAccount, RawHistoryRow, RawPost } from "./livedune/types";
import {
  engagementOf, median, pct, totalsOf,
  type Day, type PostRow, type Totals,
} from "./metrics";
import { GENERIC_PARTS, networkForType, type Part, type Parts, type Slug } from "./networks";

export type Source = {
  listAccounts: () => Promise<RawAccount[]>;
  getHistory: (id: number, from: string, to: string) => Promise<RawHistoryRow[]>;
  getPosts: (id: number, from: string, to: string) => Promise<RawPost[]>;
  scope?: Scope; // какие проекты и аккаунты показывать (LIVEDUNE_PROJECT, LIVEDUNE_ACCOUNTS)
  stampOf?: (data: unknown) => { at: number; stale: boolean } | null; // когда получены данные
};

export type NetworkReport = {
  slug: Slug;
  label: string;
  brand: string;
  hasReach: boolean;
  parts: Parts;
  generic: boolean; // сеть не из списка Дашкрафта — показана по общим метрикам
  verified: boolean; // формат данных этой сети сверен на живых ответах Livedune
  account: { id: number; name: string; url: string; img: string | null };
  href: string; // адрес страницы аккаунта
  shared: boolean; // в сети несколько аккаунтов — в подписях нужно название аккаунта
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

// Аккаунты в рамках настроек (.env) и выбранного в шапке проекта
export async function scopedAccounts(src: Source, project?: string | null) {
  const all = inScope(await src.listAccounts(), src.scope ?? ALL);
  return project ? all.filter((a) => sameProject(a.project, project)) : all;
}

// Первое число из нескольких возможных названий поля: сети называют одно и то же по-разному
const first = (r: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) if (n(r[k]) != null) return n(r[k])!;
  return 0;
};
const total = (r: Record<string, unknown>, keys: string[]) => keys.reduce((s, k) => s + z(r[k]), 0);

function toPost(raw: RawPost): Omit<PostRow, "er" | "vsMedian"> {
  const r = raw.reactions ?? {};
  const counts = {
    views: z(raw.impressions?.total),
    reach: n(raw.reach?.total),
    likes: first(r, ["likes", "klass", "class", "reactions", "like"]),
    comments: first(r, ["comments", "replies"]),
    // репосты, «поделились», пересылки и ретвиты — одно действие «распространить»
    shares: total(r, ["reposts", "shares", "forwards", "retweets", "reshares"]),
    saves: first(r, ["saved", "saves", "bookmarks"]),
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

// Отчёт по аккаунту. Без accountId — первый аккаунт сети (адрес /telegram), иначе конкретный (/telegram/<id>)
export async function buildReport(
  src: Source,
  slug: Slug,
  period: Period,
  accountId?: number | null,
  project?: string | null,
): Promise<NetworkReport | null> {
  const accounts = await scopedAccounts(src, project);
  const acc = pickAccount(accounts, slug, accountId);
  const tab = acc && listTabs(accounts).find((t) => t.id === acc.id);
  if (!acc || !tab) return null;
  return reportFor(src, tab, acc, period);
}

async function reportFor(src: Source, tab: AccountTab, acc: RawAccount, period: Period): Promise<NetworkReport> {
  const net = networkForType(acc.type);

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

  // Виды реакций: из настроек сети плюс те, что реально пришли в данных (для сетей, не сверенных вживую)
  const parts: Parts = { ...net.parts };
  for (const k of Object.keys(GENERIC_PARTS) as Part[]) {
    if (!parts[k] && allPosts.some((p) => p[k] > 0)) parts[k] = GENERIC_PARTS[k];
  }

  return {
    slug: net.slug,
    label: net.label,
    brand: net.brand,
    hasReach: net.hasReach || allPosts.some((p) => p.reach != null),
    parts,
    generic: !!net.generic,
    verified: net.verified,
    account: { id: acc.id, name: acc.name, url: acc.url, img: acc.img ?? null },
    href: tab.href,
    shared: tab.shared,
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

export type FailedNetwork = { id: number; slug: Slug; label: string; error: string };

// Сводка по всем подключённым аккаунтам: несколько Telegram-каналов — несколько карточек
export async function buildOverview(src: Source, period: Period, project?: string | null) {
  const accounts = await scopedAccounts(src, project);
  const tabs = listTabs(accounts);
  const reports: NetworkReport[] = [];
  const failed: FailedNetwork[] = [];
  // По два аккаунта параллельно, чтобы не ловить 429
  for (let i = 0; i < tabs.length; i += 2) {
    const batch = await Promise.all(
      tabs.slice(i, i + 2).map((tab) =>
        reportFor(src, tab, accounts.find((a) => a.id === tab.id)!, period).catch((e: unknown) => {
          // Один аккаунт упал — остальные показываем, а про этот говорим прямо
          failed.push({ id: tab.id, slug: tab.slug, label: tab.label, error: e instanceof Error ? e.message : "Не удалось загрузить" });
          return null;
        }),
      ),
    );
    for (const r of batch) if (r) reports.push(r);
  }
  return { reports, failed };
}

// Аккаунты для шапки: вкладки и переключатель проектов собираются в браузере
export async function buildAccountList(src: Source) {
  return (await scopedAccounts(src)).map(({ id, type, name, project }) => ({ id, type, name, project }));
}
