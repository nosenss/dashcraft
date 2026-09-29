// Какие аккаунты показывать и как их называть: дашборд подстраивается под то, что подключено в Livedune.
// Чистые функции — работают и на сервере, и в браузере (статическое демо, переключатель проектов).
import type { RawAccount } from "./livedune/types";
import { NETWORKS, networkForType, type Slug } from "./networks";

// Минимум об аккаунте, который нужен шапке в браузере
export type AccountBrief = Pick<RawAccount, "id" | "type" | "name" | "project">;

export type AccountTab = {
  id: number;
  slug: Slug;
  network: string; // название соцсети: «Telegram»
  name: string; // название аккаунта в Livedune
  label: string; // подпись вкладки: «Telegram», а если каналов несколько — название канала
  href: string; // первый аккаунт сети — /telegram, остальные — /telegram/<id>
  shared: boolean; // в этой сети больше одного аккаунта
};

export function accountHref(slug: Slug, id: number, first: boolean) {
  return first ? `/${slug}` : `/${slug}/${id}`;
}

const order = (slug: Slug) => {
  const i = NETWORKS.findIndex((n) => n.slug === slug);
  return i < 0 ? NETWORKS.length : i;
};

// Вкладки: сначала известные сети в привычном порядке, потом остальные — в порядке Livedune
export function listTabs(accounts: Pick<RawAccount, "id" | "type" | "name">[]): AccountTab[] {
  const groups = new Map<Slug, typeof accounts>();
  for (const a of accounts) {
    const slug = networkForType(a.type).slug;
    groups.set(slug, [...(groups.get(slug) ?? []), a]);
  }
  const slugs = [...groups.keys()].sort((a, b) => order(a) - order(b));
  return slugs.flatMap((slug) => {
    const own = groups.get(slug)!;
    return own.map((a, i) => ({
      id: a.id,
      slug,
      network: networkForType(a.type).label,
      name: a.name,
      label: own.length > 1 ? a.name : networkForType(a.type).label,
      href: accountHref(slug, a.id, i === 0),
      shared: own.length > 1,
    }));
  });
}

// Аккаунт по адресу: /telegram — первый канал, /telegram/<id> — конкретный
export function pickAccount<T extends Pick<RawAccount, "id" | "type">>(accounts: T[], slug: Slug, id?: number | null) {
  const own = accounts.filter((a) => networkForType(a.type).slug === slug);
  return id == null ? own[0] ?? null : own.find((a) => a.id === id) ?? null;
}

// Фильтр: какие проекты и аккаунты показывать
export type Scope = {
  projects: string[]; // пусто — все проекты
  ids: number[]; // пусто — все аккаунты
};

export const ALL: Scope = { projects: [], ids: [] };

// Названия проектов сравниваем без учёта регистра и пробелов: Livedune отдаёт то «Default», то «default»,
// а человек в .env может написать как угодно
export const sameProject = (a?: string | null, b?: string | null) =>
  (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

export function inScope<T extends Pick<RawAccount, "id" | "project">>(accounts: T[], scope: Scope) {
  return accounts.filter(
    (a) =>
      (!scope.projects.length || scope.projects.some((p) => sameProject(p, a.project))) &&
      (!scope.ids.length || scope.ids.includes(a.id)),
  );
}

// Проекты в порядке Livedune, без повторов
export function projectsOf(accounts: Pick<RawAccount, "project">[]) {
  const out: string[] = [];
  for (const a of accounts) if (a.project && !out.some((p) => sameProject(p, a.project))) out.push(a.project);
  return out;
}

// «Проект А, Проект Б» из .env или ?project= → список
export const splitList = (v?: string | null) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
