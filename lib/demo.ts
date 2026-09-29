// Демо-данные: вымышленная сеть кофеен «Зерно». Отдаём их в том же виде, что и Livedune API,
// поэтому весь остальной код (метрики, графики, таблицы) работает без изменений.
// Всё детерминировано: одна и та же дата всегда даёт те же посты и тех же подписчиков.
import { addDays, todayMSK } from "./dates";
import type { RawAccount, RawHistoryRow, RawPost } from "./livedune/types";

type Profile = {
  id: number;
  type: string;
  name: string;
  short: string;
  url: string;
  followers: number; // на старт истории
  growth: number; // чистый прирост в день
  postsPerDay: number;
  viewRate: number; // просмотры поста ÷ подписчики
  likes: number; // доли от просмотров
  comments: number;
  shares: number;
  saves: number;
  types: string[];
};

const PROFILES: Profile[] = [
  { id: 101, type: "instagram_new", name: "Кофейня «Зерно»", short: "zerno.coffee", url: "https://example.com/instagram", followers: 14200, growth: 11, postsPerDay: 0.8, viewRate: 0.42, likes: 0.045, comments: 0.004, shares: 0.007, saves: 0.011, types: ["reels", "reels", "carousel", "photo"] },
  { id: 102, type: "telegram", name: "Зерно · кофе и люди", short: "zerno_coffee", url: "https://example.com/telegram", followers: 4800, growth: 4, postsPerDay: 1.1, viewRate: 0.48, likes: 0.028, comments: 0.003, shares: 0.009, saves: 0, types: ["post", "post", "photo", "poll"] },
  { id: 103, type: "vk_group", name: "Кофейня Зерно", short: "zerno", url: "https://example.com/vk", followers: 8300, growth: 2.5, postsPerDay: 0.7, viewRate: 0.27, likes: 0.021, comments: 0.002, shares: 0.004, saves: 0, types: ["post", "photo", "video"] },
  { id: 104, type: "youtube", name: "Зерно Coffee", short: "@zernocoffee", url: "https://example.com/youtube", followers: 2600, growth: 3.5, postsPerDay: 0.25, viewRate: 1.3, likes: 0.04, comments: 0.005, shares: 0, saves: 0, types: ["short", "short", "video"] },
  { id: 105, type: "tiktok", name: "zerno.coffee", short: "zerno.coffee", url: "https://example.com/tiktok", followers: 9400, growth: 22, postsPerDay: 0.6, viewRate: 1.9, likes: 0.062, comments: 0.004, shares: 0.005, saves: 0, types: ["clip"] },
  { id: 106, type: "dzen", name: "Зерно: истории о кофе", short: "zerno", url: "https://example.com/dzen", followers: 1700, growth: 1.8, postsPerDay: 0.3, viewRate: 0.9, likes: 0.016, comments: 0.003, shares: 0.002, saves: 0, types: ["article", "article", "post"] },
];

const TEXTS = [
  "Новый сезонный раф с тыквой и пряностями уже в меню. Кто попробовал — пишите, как вам",
  "Как мы выбираем зерно: съездили к обжарщику и показываем весь путь от мешка до чашки",
  "Бариста Аня отвечает на вопросы: почему капучино в разных кофейнях такой разный",
  "Открываем третью точку — на Садовой. Первые три дня фильтр-кофе в подарок к любому десерту",
  "Рецепт домашней воронки: 15 г кофе, 250 мл воды, 93 градуса. Сохраняйте",
  "Утро в кофейне за 30 секунд",
  "Опрос: какой десерт вернуть в меню?",
  "Латте-арт челлендж: наши бариста рисуют лебедя на скорость",
  "Бизнес-ланч теперь до 16:00 — суп, салат и любой напиток",
  "Как мы сократили очередь по утрам вдвое: предзаказ в приложении",
  "Пять ошибок при хранении кофе дома",
  "Гость дня: Сергей ходит к нам каждое утро уже три года",
  "Колд брю вернулся! Настаиваем 18 часов",
  "За кадром: как проходит утренняя калибровка эспрессо",
  "Новая обжарка: Эфиопия, ноты черники и жасмина",
  "Мастер-класс по альтернативе в субботу, 12:00. Мест осталось шесть",
  "Почему мы отказались от пластиковых крышек",
  "Круассаны теперь печём сами. Смотрите, как это выглядит в 6 утра",
  "Лучшие комментарии недели и ответы на них",
  "Скидка 20% на зерно для дома до конца недели",
  "Вакансия: ищем бариста в команду на Садовой",
  "Кофе и сыр — неожиданное сочетание, которое работает",
  "Ставим эксперимент: одинаковое зерно, три способа заваривания",
  "История нашего логотипа",
  "Как приготовить айс-латте дома без кофемашины",
];

// Детерминированный генератор: одинаковый ключ — одинаковая последовательность
function rng(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Логнормальный шум вокруг 1
const noise = (r: () => number, spread: number) => Math.exp((r() + r() + r() - 1.5) * spread);

const EPOCH = "2024-01-01";

function dow(iso: string) {
  return (new Date(iso + "T00:00:00Z").getUTCDay() + 6) % 7; // 0 — понедельник
}

// Подписчики и приход/отток по дням с EPOCH до сегодня, считаем один раз
const series = new Map<number, Map<string, { followers: number; gained: number; lost: number }>>();

function followerSeries(p: Profile) {
  const today = todayMSK();
  const cached = series.get(p.id);
  if (cached?.has(today)) return cached;
  const out = new Map<string, { followers: number; gained: number; lost: number }>();
  let followers = p.followers;
  for (let d = EPOCH, i = 0; d <= today; d = addDays(d, 1), i++) {
    const r = rng(`f:${p.id}:${d}`);
    const season = 1 + 0.3 * Math.sin((i / 365) * 2 * Math.PI); // растём неравномерно по сезонам
    const spike = r() < 0.03 ? 4 + r() * 6 : 1; // вирусный пост или розыгрыш
    const net = p.growth * season * spike * noise(r, 0.8);
    const lost = Math.round(p.growth * (0.6 + r() * 0.8));
    const gained = Math.max(0, Math.round(net + lost));
    followers += gained - lost;
    out.set(d, { followers, gained, lost });
  }
  series.set(p.id, out);
  return out;
}

function postsOn(p: Profile, date: string, followers: number): RawPost[] {
  const r = rng(`p:${p.id}:${date}`);
  const weekday = dow(date);
  const rate = p.postsPerDay * (weekday >= 5 ? 0.6 : 1.1);
  let count = 0;
  for (let x = rate; x > 0; x--) if (r() < Math.min(1, x)) count++;

  // Свежие посты ещё набирают просмотры
  const age = (Date.parse(todayMSK()) - Date.parse(date)) / 86_400_000 + 0.5;
  const matured = 1 - Math.exp(-age / 1.5);

  const posts: RawPost[] = [];
  for (let k = 0; k < count; k++) {
    const type = p.types[Math.floor(r() * p.types.length)];
    const viral = r() < 0.04 ? 3 + r() * 5 : 1;
    const typeBoost = type === "reels" || type === "clip" || type === "short" ? 1.6 : type === "poll" ? 0.7 : 1;
    const views = Math.round(followers * p.viewRate * typeBoost * viral * noise(r, 0.7) * matured);
    const eng = noise(r, 0.5);
    const hh = String(8 + Math.floor(r() * 13)).padStart(2, "0");
    const mm = String(Math.floor(r() * 60)).padStart(2, "0");
    const id = `${p.id}${date.replaceAll("-", "")}${k}`;
    const shares = Math.round(views * p.shares * eng * noise(r, 0.6));
    const reactions: Record<string, number> = {
      likes: Math.round(views * p.likes * eng),
      comments: Math.round(views * p.comments * eng * noise(r, 0.8)),
    };
    if (p.type === "telegram") reactions.forwards = shares;
    else if (p.type === "instagram_new") reactions.shares = shares;
    else reactions.reposts = shares;
    if (p.saves) reactions.saved = Math.round(views * p.saves * eng * noise(r, 0.6));

    posts.push({
      post_id: id,
      type,
      created: `${date} ${hh}:${mm}:00`,
      text: TEXTS[Math.floor(r() * TEXTS.length)],
      url: null,
      reactions,
      impressions: { total: views },
      reach: p.type === "instagram_new" ? { total: Math.round(views * (0.72 + r() * 0.15)) } : null,
      follows: p.type === "instagram_new" ? Math.round(views * 0.002 * noise(r, 0.8)) : null,
    });
  }
  return posts;
}

const profileOf = (accountId: number) => {
  const p = PROFILES.find((x) => x.id === accountId);
  if (!p) throw new Error("Нет такого демо-аккаунта");
  return p;
};

const clampRange = (from: string, to: string) => {
  const today = todayMSK();
  return { from: from < EPOCH ? EPOCH : from, to: to > today ? today : to };
};

export async function listAccounts(): Promise<RawAccount[]> {
  return PROFILES.map((p) => ({
    id: p.id,
    social_id: String(p.id),
    is_linked: true,
    type: p.type,
    project: "Демо",
    name: p.name,
    short_name: p.short,
    url: p.url,
  }));
}

export async function getPosts(accountId: number, from: string, to: string): Promise<RawPost[]> {
  const p = profileOf(accountId);
  const s = followerSeries(p);
  const range = clampRange(from, to);
  const out: RawPost[] = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) out.push(...postsOn(p, d, s.get(d)!.followers));
  return out;
}

export async function getHistory(accountId: number, from: string, to: string): Promise<RawHistoryRow[]> {
  const p = profileOf(accountId);
  const s = followerSeries(p);
  const range = clampRange(from, to);
  const rows: RawHistoryRow[] = [];
  // Скользящее среднее просмотров на пост за 14 дней — как avg_views в Livedune
  const window: number[] = [];
  for (let d = addDays(range.from, -14); d <= range.to; d = addDays(d, 1)) {
    const day = s.get(d);
    if (!day) continue;
    const posts = postsOn(p, d, day.followers);
    window.push(...posts.map((x) => x.impressions?.total ?? 0));
    while (window.length > 12) window.shift();
    if (d < range.from) continue;
    const row: RawHistoryRow = {
      created: d,
      followers: day.followers,
      posts: posts.length,
      avg_views: window.length ? Math.round(window.reduce((a, b) => a + b, 0) / window.length) : null,
    };
    if (p.type === "instagram_new") {
      const r = rng(`h:${p.id}:${d}`);
      const reach = Math.round(day.followers * (0.18 + r() * 0.08) * (posts.length ? 1.4 : 1));
      Object.assign(row, {
        gained: day.gained,
        lost: day.lost,
        reach: { total: reach },
        impressions: Math.round(reach * (1.6 + r() * 0.5)),
        profile_views: Math.round(reach * (0.04 + r() * 0.03)),
      });
    }
    rows.push(row);
  }
  return rows;
}
