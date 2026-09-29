"use client";

import { IconAlert, IconCheck, IconRefresh } from "./icons";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { addDays, resolvePeriod, todayMSK } from "@/lib/dates";
import { NETWORKS } from "@/lib/networks";
import { describeUrl, fmtStamp, periodText, useLoading } from "./Loading";
import { NetworkIcon } from "./NetworkIcon";

function presets() {
  const today = todayMSK();
  const monthFrom = today.slice(0, 8) + "01";
  const prevMonthTo = addDays(monthFrom, -1);
  return [
    { label: "7 дней", from: addDays(today, -6), to: today },
    { label: "30 дней", from: addDays(today, -29), to: today },
    { label: "90 дней", from: addDays(today, -89), to: today },
    { label: "Этот месяц", from: monthFrom, to: today },
    { label: "Прошлый месяц", from: prevMonthTo.slice(0, 8) + "01", to: prevMonthTo },
  ];
}

type RefreshState = { kind: "idle" } | { kind: "busy"; since: number; phase: "bust" | "reload" } | { kind: "done" } | { kind: "failed"; message: string };

export function Header({ brand, canRefresh }: { brand: string; canRefresh: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const { task, start, stop, info, infoRef } = useLoading();
  const [refresh, setRefresh] = useState<RefreshState>({ kind: "idle" });
  const period = resolvePeriod(search.get("from"), search.get("to"));
  const qs = search.toString() ? `?${search.toString()}` : "";
  const busy = pending || refresh.kind === "busy";

  // Поля дат: применяем по Enter, уходу фокуса или паузе, а не на каждую цифру
  const [draft, setDraft] = useState({ from: period.from, to: period.to });
  useEffect(() => setDraft({ from: period.from, to: period.to }), [period.from, period.to]);

  const go = (fromRaw: string, toRaw: string) => {
    const today = todayMSK();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromRaw) || !/^\d{4}-\d{2}-\d{2}$/.test(toRaw)) return;
    let [from, to] = fromRaw <= toRaw ? [fromRaw, toRaw] : [toRaw, fromRaw];
    if (to > today) to = today;
    if (from > to) from = to;
    if (from === period.from && to === period.to) return; // тот же период — ничего не грузим
    const next = new URLSearchParams(search);
    next.set("from", from);
    next.set("to", to);
    const href = `${pathname}?${next.toString()}`;
    const d = describeUrl(new URL(href, location.href));
    start(d.title, d.detail, href);
    startTransition(() => router.push(href));
  };

  useEffect(() => {
    if (draft.from === period.from && draft.to === period.to) return;
    const id = setTimeout(() => go(draft.from, draft.to), 900);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const lock = useRef(false); // двойной клик не должен отправить два запроса
  const onRefresh = async () => {
    if (busy || task || lock.current) return;
    lock.current = true;
    const since = Date.now();
    setRefresh({ kind: "busy", since, phase: "bust" });
    start("Обновляем данные из Livedune", periodText(period.from, period.to));
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      if (!res.ok) throw new Error(`Сервер ответил ${res.status}`);
      setRefresh({ kind: "busy", since, phase: "reload" });
      startTransition(() => router.refresh());
    } catch (e) {
      lock.current = false;
      stop();
      setRefresh({ kind: "failed", message: e instanceof Error && !/fetch/i.test(e.message) ? e.message : "Нет связи с сервером дашборда" });
    }
  };

  // Обновление закончилось: смотрим, пришли ли свежие данные или Livedune не ответил
  useEffect(() => {
    if (refresh.kind !== "busy" || refresh.phase !== "reload" || pending) return;
    const since = refresh.since;
    const id = setTimeout(() => {
      lock.current = false;
      stop();
      const fresh = infoRef.current;
      if (fresh.stale) setRefresh({ kind: "failed", message: "Livedune не ответил, показаны прошлые данные" });
      else if (fresh.fetchedAt != null && fresh.fetchedAt < since) setRefresh({ kind: "failed", message: "Не удалось получить свежие данные" });
      else setRefresh({ kind: "done" });
    }, 60);
    return () => clearTimeout(id);
  }, [pending, refresh, stop, infoRef]);

  // «Обновлено ✓» и ошибка гаснут сами
  useEffect(() => {
    if (refresh.kind !== "done" && refresh.kind !== "failed") return;
    const id = setTimeout(() => setRefresh({ kind: "idle" }), refresh.kind === "done" ? 2500 : 8000);
    return () => clearTimeout(id);
  }, [refresh]);

  const tabs = [{ href: "/", label: "Все сети", slug: null }, ...NETWORKS.map((n) => ({ href: `/${n.slug}`, label: n.label, slug: n.slug }))];

  return (
    <header className="z-20 sm:sticky sm:top-0 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
          <div className="mr-auto font-display text-[15px] font-bold tracking-tight">
            {brand} <span className="ml-1 font-medium text-ink-3">соцсети</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {presets().map((p) => {
              const active = p.from === period.from && p.to === period.to;
              return (
                <button
                  key={p.label}
                  onClick={() => go(p.from, p.to)}
                  aria-pressed={active}
                  className={`min-h-8 rounded-full px-3 text-[13px] font-medium transition-[color,background-color,scale] active:scale-[0.96] ${
                    active ? "bg-ink text-white" : "bg-surface text-ink-2 ring-1 ring-line hover:text-ink"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
            <div className="flex min-h-8 items-center gap-1 rounded-full bg-surface px-2 text-[13px] ring-1 ring-line focus-within:ring-2 focus-within:ring-accent">
              <input
                type="date"
                value={draft.from}
                max={todayMSK()}
                onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                onBlur={() => go(draft.from, draft.to)}
                onKeyDown={(e) => e.key === "Enter" && go(draft.from, draft.to)}
                name="from"
                className="bg-transparent tabular focus-visible:outline-none"
                aria-label="Начало периода"
              />
              <span className="text-ink-3">—</span>
              <input
                type="date"
                value={draft.to}
                max={todayMSK()}
                onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                onBlur={() => go(draft.from, draft.to)}
                onKeyDown={(e) => e.key === "Enter" && go(draft.from, draft.to)}
                name="to"
                className="bg-transparent tabular focus-visible:outline-none"
                aria-label="Конец периода"
              />
            </div>
            {canRefresh && <RefreshButton state={refresh} disabled={busy || !!task} onClick={onRefresh} fetchedAt={info.fetchedAt} />}
          </div>
        </div>
        <nav className="-mb-px mt-2 flex gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href + qs}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[14px] font-medium transition-colors ${
                  active ? "border-ink text-ink" : "border-transparent text-ink-2 hover:text-ink"
                }`}
              >
                {t.slug && <NetworkIcon slug={t.slug} size={18} />}
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function RefreshButton({
  state,
  disabled,
  onClick,
  fetchedAt,
}: {
  state: RefreshState;
  disabled: boolean;
  onClick: () => void;
  fetchedAt: number | null;
}) {
  const label =
    state.kind === "busy" ? "Обновляем…" : state.kind === "done" ? "Обновлено" : state.kind === "failed" ? "Не обновилось" : "Обновить";
  const note =
    state.kind === "failed" ? state.message : fetchedAt ? `Данные загружены ${fmtStamp(fetchedAt)}` : null;
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        aria-busy={state.kind === "busy"}
        title="Заново запросить данные в Livedune. Если Livedune не ответит, останутся прежние данные"
        className={`flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ring-1 transition-[color,background-color,scale] active:scale-[0.96] disabled:cursor-not-allowed disabled:active:scale-100 ${
          state.kind === "done"
            ? "bg-good/10 text-good ring-good/30"
            : state.kind === "failed"
              ? "bg-bad/10 text-bad ring-bad/30"
              : "bg-surface text-ink-2 ring-line hover:text-ink disabled:opacity-60"
        }`}
      >
        {state.kind === "done" ? (
          <IconCheck size={15} />
        ) : state.kind === "failed" ? (
          <IconAlert size={15} />
        ) : (
          <IconRefresh size={15} className={state.kind === "busy" ? "loading-spinner" : ""} />
        )}
        {label}
      </button>
      {note && (
        <span className={`hidden max-w-[220px] text-[11px] leading-tight lg:block ${state.kind === "failed" ? "text-bad" : "text-ink-3"}`} role={state.kind === "failed" ? "alert" : undefined}>
          {note}
        </span>
      )}
    </div>
  );
}
