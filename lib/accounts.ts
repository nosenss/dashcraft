// Какие аккаунты показывать и как их называть: дашборд подстраивается под то, что подключено в Livedune.
// Чистые функции — работают и на сервере, и в браузере (статическое демо).
import type { RawAccount } from "./livedune/types";
import { NETWORKS, type Slug } from "./networks";

export type AccountTab = {
  id: number;
  slug: Slug;
  name: string; // название аккаунта в Livedune
  label: string; // подпись вкладки: «Telegram», а если каналов несколько — название канала
  href: string; // первый аккаунт сети — /telegram, остальные — /telegram/<id>
  shared: boolean; // в этой сети больше одного аккаунта
};

export type Unsupported = { id: number; name: string; type: string };

export type AccountList = { tabs: AccountTab[]; unsupported: Unsupported[] };

export function accountHref(slug: Slug, id: number, first: boolean) {
  return first ? `/${slug}` : `/${slug}/${id}`;
}

export function listTabs(accounts: RawAccount[]): AccountList {
  const tabs: AccountTab[] = [];
  for (const net of NETWORKS) {
    const own = accounts.filter((a) => a.type === net.type);
    own.forEach((a, i) =>
      tabs.push({
        id: a.id,
        slug: net.slug,
        name: a.name,
        label: own.length > 1 ? a.name : net.label,
        href: accountHref(net.slug, a.id, i === 0),
        shared: own.length > 1,
      }),
    );
  }
  const known = new Set(NETWORKS.map((n) => n.type));
  const unsupported = accounts.filter((a) => !known.has(a.type)).map((a) => ({ id: a.id, name: a.name, type: a.type }));
  return { tabs, unsupported };
}

// Аккаунт по адресу: /telegram — первый канал, /telegram/<id> — конкретный
export function pickAccount(accounts: RawAccount[], type: string, id?: number | null) {
  const own = accounts.filter((a) => a.type === type);
  return id == null ? own[0] ?? null : own.find((a) => a.id === id) ?? null;
}
