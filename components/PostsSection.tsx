"use client";

import { IconDown, IconUp } from "./icons";
import { Fragment, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { median, type PostRow } from "@/lib/metrics";
import type { NetworkReport } from "@/lib/report";
import { postTypeLabel } from "@/lib/networks";
import { fmtCompact, fmtDay, fmtInt, fmtPct, fmtX } from "@/lib/format";
import { CapNote, zoneFor } from "./charts";
import { Card, Chips } from "./ui";

type MetricKey = "views" | "reach" | "engagement" | "likes" | "comments" | "shares" | "saves" | "erv" | "er" | "follows";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function metricDefs(report: NetworkReport) {
  const parts = report.parts;
  const defs: { key: MetricKey; label: string; pct?: boolean }[] = [
    { key: "views", label: "Просмотры" },
    ...(report.hasReach ? [{ key: "reach" as const, label: "Охват" }] : []),
    { key: "engagement", label: "Все реакции" },
    ...(Object.keys(parts) as (keyof typeof parts)[]).map((k) => ({ key: k as MetricKey, label: parts[k]! })),
    { key: "erv", label: "ERV", pct: true },
    { key: "er", label: "ER", pct: true },
    ...(report.hasReach ? [{ key: "follows" as const, label: "Подписки с поста" }] : []),
  ];
  return defs;
}

const fmtMetric = (v: number | null, pct?: boolean) => (pct ? fmtPct(v, 2) : fmtInt(v));

function shortText(text: string, n = 70) {
  const line = text.replace(/\s+/g, " ").trim();
  if (!line) return "Без текста";
  return line.length > n ? line.slice(0, n - 1) + "…" : line;
}

// Цвет ячейки относительно медианы метрики: заметно лучше — зелёный, хуже — красный
function heat(v: number | null, med: number | null) {
  if (v == null || med == null || med <= 0) return undefined;
  const r = v / med;
  if (r >= 2) return "rgba(19,130,74,0.18)";
  if (r >= 1.3) return "rgba(19,130,74,0.09)";
  if (r <= 0.5) return "rgba(210,59,58,0.13)";
  if (r <= 0.75) return "rgba(210,59,58,0.06)";
  return undefined;
}

export function PostsSection({ report }: { report: NetworkReport }) {
  const defs = metricDefs(report);
  const [metric, setMetric] = useState<MetricKey>("views");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState<{ key: MetricKey | "created"; dir: 1 | -1 }>({ key: "views", dir: -1 });
  const [open, setOpen] = useState<string | null>(null);

  const types = useMemo(() => [...new Set(report.posts.map((p) => p.type))], [report.posts]);
  const posts = useMemo(() => report.posts.filter((p) => type === "all" || p.type === type), [report.posts, type]);
  const medians = useMemo(() => {
    const m: Partial<Record<MetricKey, number | null>> = {};
    for (const d of defs) m[d.key] = median(posts.map((p) => p[d.key]).filter((v): v is number => v != null));
    return m;
  }, [posts, defs]);

  const sorted = useMemo(() => {
    const k = sort.key;
    return [...posts].sort((a, b) => {
      const av = k === "created" ? a.created : a[k] ?? -Infinity;
      const bv = k === "created" ? b.created : b[k] ?? -Infinity;
      return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
    });
  }, [posts, sort]);

  const def = defs.find((d) => d.key === metric) ?? defs[0];
  const top = useMemo(
    () =>
      [...posts]
        .filter((p) => p[metric] != null)
        .sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0))
        .slice(0, 10)
        .map((p) => ({ ...p, label: `${fmtDay(p.date)}, ${shortText(p.text, 34)}`, v: p[metric] })),
    [posts, metric],
  );
  // Виральный пост не должен сплющивать остальные девять столбцов
  const topZone = zoneFor(top.map((p) => p.v), 4);
  const topRows = top.map((p) => {
    const over = topZone != null && (p.v ?? 0) > topZone.cap;
    return { ...p, shown: over ? topZone!.at : p.v, over };
  });
  const TopLabel = (props: unknown) => {
    const { x, y, width, height, index } = props as { x?: number | string; y?: number | string; width?: number | string; height?: number | string; index?: number };
    const r = topRows[index ?? -1];
    if (!r) return <g />;
    return (
      <text x={Number(x) + Number(width) + 6} y={Number(y) + Number(height) / 2} dominantBaseline="central" fontSize={11} fontWeight={r.over ? 600 : 400} fill={r.over ? "var(--ink)" : "var(--ink-2)"}>
        {fmtMetric(r.v, def.pct)}
      </text>
    );
  };

  // Что заходит: типичный пост (медиана) по типу контента и дню недели.
  // Медиана, а не среднее: один виральный пост не делает весь тип «лучшим».
  const groups = (keyOf: (p: PostRow) => string, order?: string[]) => {
    const map = new Map<string, PostRow[]>();
    for (const p of posts) map.set(keyOf(p), [...(map.get(keyOf(p)) ?? []), p]);
    const keys = order ? order.filter((k) => map.has(k)) : [...map.keys()];
    return keys.map((k) => {
      const ps = map.get(k)!;
      const vals = ps.map((p) => p[metric]).filter((v): v is number => v != null);
      return {
        name: k,
        count: ps.length,
        v: median(vals),
        mean: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
      };
    });
  };
  const byType = groups((p) => postTypeLabel(p.type));
  const byWeekday = groups((p) => WEEKDAYS[(new Date(p.date + "T00:00:00Z").getUTCDay() + 6) % 7], WEEKDAYS);

  if (!report.posts.length) {
    return (
      <Card className="mt-6">
        <h2 className="font-display text-[20px] font-bold">Публикации</h2>
        <p className="mt-2 text-ink-2">За выбранный период публикаций нет.</p>
      </Card>
    );
  }

  const cols: { key: MetricKey; label: string; pct?: boolean }[] = defs;

  return (
    <Card className="mt-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[22px] font-bold tracking-tight">Публикации за период: {posts.length}</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">Что заходит лучше: выберите метрику, по ней строятся топ и сравнения</p>
        </div>
        {types.length > 1 && (
          <Chips
            value={type}
            onChange={setType}
            options={[{ value: "all", label: "Все типы" }, ...types.map((t) => ({ value: t, label: postTypeLabel(t) }))]}
          />
        )}
      </div>
      <div className="mt-4">
        <Chips value={metric} onChange={(m) => { setMetric(m); setSort({ key: m, dir: -1 }); }} options={defs.map((d) => ({ value: d.key, label: d.label }))} />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div>
          <div className="mb-2 text-[13px] font-semibold">Топ-10 по «{def.label}»</div>
          <ResponsiveContainer width="100%" height={Math.max(160, top.length * 34)}>
            <BarChart data={topRows} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }}>
              <XAxis type="number" hide domain={topZone ? [0, topZone.top] : [0, "auto"]} allowDataOverflow={topZone != null} />
              <YAxis type="category" dataKey="label" width={230} tick={{ fontSize: 11, fill: "var(--ink-2)" }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as PostRow;
                  return <PostTip p={p} report={report} />;
                }}
              />
              <Bar
                dataKey="shown"
                fill="var(--s1)"
                radius={[0, 4, 4, 0]}
                maxBarSize={22}
                isAnimationActive={false}
                label={TopLabel}
                onClick={(d) => {
                  const url = (d as unknown as { payload?: PostRow }).payload?.url;
                  if (url) window.open(url, "_blank");
                }}
                cursor="pointer"
              />
            </BarChart>
          </ResponsiveContainer>
          {topZone && <CapNote />}
        </div>
        <div className="grid gap-6">
          <GroupBars title={`Типичный пост по типу: «${def.label}», медиана`} data={byType} pct={def.pct} />
          <GroupBars title={`Типичный пост по дню недели: «${def.label}», медиана`} data={byWeekday} pct={def.pct} />
        </div>
      </div>

      <div className="mt-8 -mx-4 overflow-x-auto sm:-mx-6">
        <table className="w-full min-w-[900px] border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-line text-left text-[12px] text-ink-2">
              <Th label="Дата" active={sort.key === "created"} dir={sort.dir} onClick={() => setSort((s) => ({ key: "created", dir: s.key === "created" ? (-s.dir as 1 | -1) : -1 }))} className="pl-4 sm:pl-6" />
              <th className="px-2 py-2 font-medium">Пост</th>
              {cols.map((c) => (
                <Th key={c.key} label={c.label} right active={sort.key === c.key} dir={sort.dir} onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (-s.dir as 1 | -1) : -1 }))} />
              ))}
              <th className="px-2 py-2 pr-4 text-right font-medium sm:pr-6" title="Просмотры поста ÷ медиана просмотров за период">× медианы</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <Fragment key={p.id}>
                <tr className="cursor-pointer border-b border-line/70 hover:bg-bg/60" onClick={() => setOpen(open === p.id ? null : p.id)}>
                  <td className="whitespace-nowrap py-2 pl-4 pr-2 tabular text-ink-2 sm:pl-6">
                    {fmtDay(p.date)} <span className="text-ink-3">{p.created.slice(11, 16)}</span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex w-[300px] items-center gap-1.5">
                      <span className="shrink-0 rounded bg-bg px-1.5 py-0.5 text-[11px] text-ink-2">{postTypeLabel(p.type)}</span>
                      <span className="truncate" title={p.text}>{shortText(p.text, 90)}</span>
                    </div>
                  </td>
                  {cols.map((c) => (
                    <td key={c.key} className="whitespace-nowrap px-2 py-2 text-right tabular" style={{ background: heat(p[c.key], medians[c.key] ?? null) }}>
                      {fmtMetric(p[c.key], c.pct)}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-2 py-2 pr-4 text-right font-semibold tabular sm:pr-6">{fmtX(p.vsMedian)}</td>
                </tr>
                {open === p.id && (
                  <tr className="border-b border-line bg-bg/50">
                    <td colSpan={cols.length + 3} className="px-4 py-3 sm:px-6">
                      <p className="max-w-3xl whitespace-pre-line text-[13px] text-ink">{p.text || "Без текста"}</p>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[13px] font-medium text-accent hover:underline">
                          Открыть пост
                          <IconUp size={13} className="ml-0.5 inline" />
                        </a>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12px] text-ink-3">
        Зелёная ячейка — метрика в 1,3+ раза выше медианы по постам периода, красная — в 1,3+ раза ниже. Клик по строке открывает полный текст.
      </p>
    </Card>
  );
}

function Th({ label, active, dir, onClick, right, className = "" }: { label: string; active: boolean; dir: 1 | -1; onClick: () => void; right?: boolean; className?: string }) {
  return (
    <th className={`px-2 py-2 font-medium ${right ? "text-right" : ""} ${className}`}>
      <button onClick={onClick} className={`whitespace-nowrap hover:text-ink ${active ? "text-ink" : ""}`}>
        <span className="inline-flex items-center gap-0.5">
          {label}
          {active && (dir === -1 ? <IconDown size={12} /> : <IconUp size={12} />)}
        </span>
      </button>
    </th>
  );
}

function GroupBars({ title, data, pct }: { title: string; data: { name: string; count: number; v: number | null; mean: number | null }[]; pct?: boolean }) {
  const best = Math.max(...data.map((d) => d.v ?? 0));
  const zone = zoneFor(data.map((d) => d.v), 3);
  const rows = data.map((d) => ({ ...d, shown: zone && d.v != null && d.v > zone.cap ? zone.at : d.v }));
  const fmtV = (v: number | null) => (pct ? fmtPct(v, 1) : fmtCompact(v));
  const Label = (props: unknown) => {
    const { x, y, width, index } = props as { x?: number | string; y?: number | string; width?: number | string; index?: number };
    const r = rows[index ?? -1];
    if (!r || r.v == null) return <g />;
    const over = zone != null && r.v > zone.cap;
    return (
      <text x={Number(x) + Number(width) / 2} y={Number(y) - 4} textAnchor="middle" fontSize={10} fontWeight={over ? 600 : 400} fill={over ? "var(--ink)" : "var(--ink-2)"}>
        {fmtV(r.v)}
      </text>
    );
  };
  return (
    <div>
      <div className="mb-2 text-[13px] font-semibold">{title}</div>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={rows} margin={{ top: 16, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--ink-2)" }} tickLine={false} axisLine={{ stroke: "var(--line)" }} interval={0} />
          <YAxis hide domain={zone ? [0, zone.top] : [0, "auto"]} allowDataOverflow={zone != null} />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof data)[number];
              return (
                <div className="rounded-xl bg-surface px-3 py-2 text-[12px] shadow-lg ring-1 ring-line tabular">
                  <b>{d.name}</b>, {d.count} шт.
                  <div>Типичный пост (медиана): <b>{pct ? fmtPct(d.v) : fmtInt(d.v)}</b></div>
                  <div className="text-ink-2">В среднем: {pct ? fmtPct(d.mean) : fmtInt(d.mean)}</div>
                </div>
              );
            }}
          />
          <Bar dataKey="shown" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} label={Label}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.v === best ? "var(--s1)" : "#9ec5f4"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PostTip({ p, report }: { p: PostRow; report: NetworkReport }) {
  const rows: [string, string][] = [
    ["Просмотры", fmtInt(p.views)],
    ...(report.hasReach ? [["Охват", fmtInt(p.reach)] as [string, string]] : []),
    ...(Object.keys(report.parts) as (keyof typeof report.parts)[]).map((k) => [report.parts[k]!, fmtInt(p[k])] as [string, string]),
    ["ERV", fmtPct(p.erv)],
    ["ER", fmtPct(p.er)],
  ];
  return (
    <div className="max-w-[300px] rounded-xl bg-surface px-3 py-2.5 text-[12px] shadow-lg ring-1 ring-line">
      <div className="font-semibold">{postTypeLabel(p.type)}, {fmtDay(p.date)}</div>
      <div className="mt-1 text-ink-2">{shortText(p.text, 120)}</div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 tabular">
        {rows.map(([l, v]) => (
          <Fragment key={l}>
            <span className="text-ink-3">{l}</span>
            <span className="text-right font-medium">{v}</span>
          </Fragment>
        ))}
      </div>
      {p.url && <div className="mt-1.5 text-[11px] text-ink-3">Клик — открыть пост</div>}
    </div>
  );
}
