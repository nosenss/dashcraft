"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { resolvePeriod } from "@/lib/dates";
import { fmtDay, fmtDayYear } from "@/lib/format";
import { networkBySlug } from "@/lib/networks";

type Task = { title: string; detail: string; startedAt: number; href: string | null };
type Info = { fetchedAt: number | null; stale: boolean };

type Ctx = {
  task: Task | null;
  start: (title: string, detail: string, href?: string | null) => void;
  stop: () => void;
  info: Info;
  infoRef: React.RefObject<Info>;
  setInfo: (info: Info) => void;
};

const LoadingCtx = createContext<Ctx | null>(null);

export function useLoading() {
  const ctx = useContext(LoadingCtx);
  if (!ctx) throw new Error("useLoading вне LoadingProvider");
  return ctx;
}

// Страница сообщает, когда получены её данные — шапка показывает «Данные на 14:32»
export function useReportInfo(fetchedAt: number | null, stale: boolean) {
  const { setInfo } = useLoading();
  useEffect(() => setInfo({ fetchedAt, stale }), [fetchedAt, stale, setInfo]);
}

export function periodText(from: string, to: string) {
  return from.slice(0, 4) === to.slice(0, 4) ? `${fmtDay(from)} — ${fmtDayYear(to)}` : `${fmtDayYear(from)} — ${fmtDayYear(to)}`;
}

// Что грузится по этой ссылке — для понятной подписи
export function describeUrl(url: URL) {
  const p = resolvePeriod(url.searchParams.get("from"), url.searchParams.get("to"));
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const path = base && url.pathname.startsWith(base) ? url.pathname.slice(base.length) : url.pathname;
  const slug = path.replace(/^\//, "").split("/")[0];
  const net = networkBySlug(slug);
  return {
    title: net ? `Загружаем ${net.label}` : "Загружаем все соцсети",
    detail: periodText(p.from, p.to),
  };
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const url = `${pathname}?${search.toString()}`;
  const [task, setTask] = useState<Task | null>(null);
  const [info, setInfoState] = useState<Info>({ fetchedAt: null, stale: false });
  const infoRef = useRef<Info>(info);

  const start = useCallback((title: string, detail: string, href: string | null = null) => {
    setTask({ title, detail, startedAt: Date.now(), href });
  }, []);
  const stop = useCallback(() => setTask(null), []);
  const setInfo = useCallback((next: Info) => {
    infoRef.current = next;
    setInfoState(next);
  }, []);

  // Новая страница отрисована — загрузка закончилась (в том числе ошибкой)
  useEffect(() => setTask((t) => (t?.href ? null : t)), [url]);

  // Любая внутренняя ссылка запускает индикатор; якоря, новые вкладки и та же страница — нет
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || u.pathname.startsWith("/api")) return;
      if (u.pathname + u.search === location.pathname + location.search) return;
      const d = describeUrl(u);
      start(d.title, d.detail, u.pathname + u.search);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  const value = useMemo(() => ({ task, start, stop, info, infoRef, setInfo }), [task, start, stop, info, setInfo]);
  return (
    <LoadingCtx.Provider value={value}>
      {children}
      <LoadingOverlay />
    </LoadingCtx.Provider>
  );
}

function LoadingOverlay() {
  const { task, stop } = useLoading();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!task) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [task]);
  if (!task) return null;

  const sec = Math.floor((now - task.startedAt) / 1000);
  const visible = now - task.startedAt > 300; // быстрые загрузки из кэша не мигают карточкой
  const hint =
    sec < 6
      ? "Если данные уже загружались, это займёт секунду. Впервые за период — до 10–20 секунд."
      : sec < 25
        ? "Livedune отдаёт историю по дням и все посты за период. Для длинных периодов это дольше."
        : sec < 60
          ? "Livedune отвечает медленнее обычного. Подождите ещё немного."
          : "Livedune так и не ответил.";

  return (
    <>
      {/* Полоса сверху — сразу, чтобы клик не казался потерянным */}
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-accent/15" role="progressbar" aria-label={task.title}>
        <div className="loading-bar h-full w-1/3 bg-accent" />
      </div>
      {visible && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-start justify-center bg-bg/40 pt-40">
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex w-[min(420px,calc(100vw-32px))] gap-4 rounded-2xl bg-surface p-5 shadow-xl ring-1 ring-line"
          >
            <span className="loading-spinner mt-0.5 h-6 w-6 shrink-0 rounded-full border-[3px] border-accent/20 border-t-accent" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-display text-[16px] font-bold">{task.title}</div>
                <div className="text-[12px] tabular text-ink-3">{sec} с</div>
              </div>
              {task.detail && <div className="text-[13px] text-ink-2">{task.detail}</div>}
              <p className="mt-2 text-[12px] leading-snug text-ink-3">{hint}</p>
              {sec >= 60 && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => (task.href ? (location.href = task.href) : location.reload())}
                    className="rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold text-white"
                  >
                    Попробовать ещё раз
                  </button>
                  <button onClick={stop} className="rounded-full px-3 py-1.5 text-[12px] font-medium text-ink-2 hover:text-ink">
                    Скрыть
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Livedune не ответил — показываем прошлые данные и честно об этом говорим
export function StaleBanner() {
  const { info } = useLoading();
  if (!info.stale || !info.fetchedAt) return null;
  return (
    <div className="mt-4 rounded-xl bg-[#fff6e0] px-4 py-3 text-[13px] text-[#7a5200]">
      Livedune сейчас не отвечает, поэтому показаны данные, загруженные {fmtStamp(info.fetchedAt)}. Нажмите «Обновить» чуть позже.
    </div>
  );
}

export function fmtStamp(ts: number) {
  const d = new Date(ts);
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const today = new Date().toDateString() === d.toDateString();
  return today ? `в ${time}` : `${d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} в ${time}`;
}
