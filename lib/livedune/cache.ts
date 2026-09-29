import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.join(process.cwd(), ".cache", "livedune");
const BUST = path.join(DIR, "_bust.json");
const inflight = new Map<string, Promise<unknown>>();

// Когда получены данные и не устарели ли они (Livedune не ответил — отдали старое)
export type Stamp = { at: number; stale: boolean };
const stamps = new WeakMap<object, Stamp>();
export const stampOf = (data: unknown): Stamp | null =>
  data && typeof data === "object" ? stamps.get(data) ?? null : null;

function fileFor(key: string) {
  return path.join(DIR, createHash("sha1").update(key).digest("hex") + ".json");
}

async function bustAt() {
  try {
    return (JSON.parse(await readFile(BUST, "utf8")) as { at: number }).at;
  } catch {
    return 0;
  }
}

function stamp<T>(data: T, s: Stamp): T {
  if (data && typeof data === "object") stamps.set(data as object, s);
  return data;
}

// Дисковый кэш: переживает перезапуск и экономит квоту API.
// Если Livedune упал, а в кэше есть старая копия — отдаём её с пометкой stale.
export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const file = fileFor(key);
  let old: { at: number; data: T } | null = null;
  try {
    old = JSON.parse(await readFile(file, "utf8")) as { at: number; data: T };
  } catch {
    // нет файла или битый
  }
  if (old && Date.now() - old.at < ttlMs && old.at > (await bustAt())) {
    return stamp(old.data, { at: old.at, stale: false });
  }

  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const promise = (async () => {
    try {
      const data = await load();
      const at = Date.now();
      try {
        await mkdir(DIR, { recursive: true });
        await writeFile(file, JSON.stringify({ at, key, data }));
      } catch {
        // диск только для чтения (Vercel и т. п.) — работаем без кэша
      }
      return stamp(data, { at, stale: false });
    } catch (error) {
      if (old) return stamp(old.data, { at: old.at, stale: true });
      throw error;
    }
  })().finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

// «Обновить»: не удаляем кэш, а помечаем всё устаревшим — старые данные остаются запасными
export async function bustCache() {
  const at = Date.now();
  try {
    await mkdir(DIR, { recursive: true });
    await writeFile(BUST, JSON.stringify({ at }));
  } catch {
    // без записи на диск кэша и так нет
  }
  return at;
}
