import { cached } from "./cache";
import type { Paginated, RawAccount, RawHistoryRow, RawPost } from "./types";

const BASE = "https://api.livedune.com";
const MIN = 60_000;

type Params = Record<string, string | number | undefined>;

function token() {
  const value = process.env.LIVEDUNE_TOKEN;
  if (!value) throw new Error("Нет LIVEDUNE_TOKEN в .env.local");
  return value;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request<T>(pathname: string, params: Params = {}, retries = 4): Promise<T> {
  const url = new URL(pathname, BASE);
  url.searchParams.set("access_token", token());
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") url.searchParams.set(k, String(v));
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Livedune ${res.status}`);
        await sleep(500 * (attempt + 1) ** 2);
        continue;
      }
      if (!res.ok) throw new LiveduneError(res.status, (await res.text()).slice(0, 200));
      return (await res.json()) as T;
    } catch (error) {
      lastError = error;
      if (error instanceof LiveduneError) break; // 4xx повторять бессмысленно
      if (attempt < retries - 1) await sleep(500 * (attempt + 1) ** 2);
    }
  }
  if (lastError instanceof LiveduneError) throw lastError;
  if (lastError instanceof Error && /Livedune (429|5)/.test(lastError.message)) {
    throw new Error("Livedune сейчас перегружен и не отвечает. Попробуйте через минуту");
  }
  throw new Error("Нет связи с Livedune. Проверьте интернет и попробуйте ещё раз");
}

// Понятный текст вместо «Livedune 403: {...}»
export class LiveduneError extends Error {
  constructor(public status: number, body: string) {
    super(
      status === 401 || status === 403
        ? "Livedune не принял API-ключ: проверьте LIVEDUNE_TOKEN или срок тарифа"
        : status === 402
          ? "В Livedune закончилась квота запросов на этот месяц"
          : status === 404
            ? "Livedune не нашёл аккаунт. Возможно, его удалили из дашборда"
            : `Livedune вернул ошибку ${status}: ${body}`,
    );
  }
}

// Livedune отдаёт до 100 строк, дальше — курсор after (unix-время последней строки).
async function paginate<T>(pathname: string, params: Params = {}) {
  const rows: T[] = [];
  let after: number | undefined;
  for (let page = 0; page < 30; page++) {
    const data = await request<Paginated<T>>(pathname, { ...params, after });
    const batch = data.response ?? [];
    rows.push(...batch);
    if (batch.length < 100 || !data.after || data.after === after) break;
    after = data.after;
  }
  return rows;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Закрытые периоды почти не меняются, свежие — обновляем каждые полчаса.
function ttlFor(to: string) {
  return to < todayISO() ? 24 * 60 * MIN : 30 * MIN;
}

export function listAccounts() {
  return cached("accounts", 24 * 60 * MIN, () => paginate<RawAccount>("/accounts"));
}

export function getHistory(accountId: number, from: string, to: string) {
  return cached(`history:${accountId}:${from}:${to}`, ttlFor(to), async () => {
    const rows = await paginate<RawHistoryRow>(`/accounts/${accountId}/history`, {
      date_from: from,
      date_to: to,
    });
    const byDate = new Map(rows.filter((r) => r.created).map((r) => [r.created, r]));
    return [...byDate.values()].sort((a, b) => a.created.localeCompare(b.created));
  });
}

export function getPosts(accountId: number, from: string, to: string) {
  return cached(`posts:${accountId}:${from}:${to}`, ttlFor(to), async () => {
    const rows = await paginate<RawPost>(`/accounts/${accountId}/posts`, {
      date_from: from,
      date_to: to,
    });
    const byId = new Map(rows.map((p) => [String(p.post_id), p]));
    return [...byId.values()].filter((p) => !p.deleted);
  });
}

export type TariffInfo = {
  total: { requests: number; used: number; left: number };
  tariff: { end_date: string };
  period: { from: string; to: string };
};

export function getInfo() {
  return request<TariffInfo>("/info");
}
