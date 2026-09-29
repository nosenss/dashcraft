"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { outlierCap, type Day, type Grain } from "@/lib/metrics";
import { fmtCompact, fmtDay, fmtDayYear } from "@/lib/format";

export type Series = {
  key: keyof Day;
  label: string;
  color: string;
  kind: "line" | "bar";
};

// ——— Выбросы ———
// Обычные значения занимают шкалу 0…cap. Над ней, за пунктиром «разрыва», своя полоса:
// выбросы рисуются там, а не прижимаются к потолку, и подписываются настоящим значением.
const ZONE_AT = 1.16; // где рисуем выброс (в долях cap)
const ZONE_TOP = 1.3; // верх оси
const BREAK_AT = 1.05; // линия разрыва

function niceTicks(max: number, count = 4) {
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((st) => st >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += step) ticks.push(Number(v.toPrecision(12)));
  return ticks;
}

export type Zone = { cap: number; at: number; top: number; brk: number; ticks: number[] };

export function zoneFor(values: (number | null | undefined)[], minCount?: number): Zone | null {
  const cap = outlierCap(values, minCount);
  if (cap == null) return null;
  const ticks = niceTicks(cap);
  const edge = ticks.at(-1)!; // шкала заканчивается на круглом делении
  return { cap: edge, at: edge * ZONE_AT, top: edge * ZONE_TOP, brk: edge * BREAK_AT, ticks };
}

// Подписываем только самый большой выброс в каждой группе соседних — иначе подписи наезжают
export function labelledOverflows(values: (number | null)[], cap: number, minGap = 3) {
  const over = values.map((v) => v != null && Math.abs(v) > cap);
  const picks: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (!over[i]) continue;
    let best = i;
    while (i + 1 < values.length && over[i + 1]) {
      i++;
      if (Math.abs(values[i]!) > Math.abs(values[best]!)) best = i;
    }
    picks.push(best);
  }
  const kept: number[] = [];
  for (const idx of [...picks].sort((a, b) => Math.abs(values[b]!) - Math.abs(values[a]!))) {
    if (kept.every((k) => Math.abs(k - idx) >= minGap)) kept.push(idx);
  }
  return new Set(kept);
}

// Подпись у края графика не должна вылезать наружу
function anchorFor(index: number, total: number) {
  return index <= 1 ? "start" : index >= total - 2 ? "end" : "middle";
}

const axisNumber = new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 });
// До миллиона — целиком: иначе при узкой шкале (28 350 и 28 400) подписи сливаются в «28,4 тыс.»
export function fmtAxis(v: number) {
  if (Math.abs(v) < 1_000_000) return Math.round(v).toLocaleString("ru-RU");
  return axisNumber.format(v);
}

function ZoneBreak({ zone }: { zone: Zone }) {
  return (
    <ReferenceLine
      y={zone.brk}
      stroke="var(--ink-3)"
      strokeDasharray="2 4"
      label={{ value: "выше шкалы", position: "insideTopLeft", fontSize: 10, fill: "var(--ink-3)", dy: -12 }}
    />
  );
}

const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export function tickLabel(iso: string, grain: Grain) {
  if (grain === "month") return `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(2, 4)}`;
  return fmtDay(iso);
}

function headLabel(iso: string, grain: Grain) {
  if (grain === "week") return `неделя с ${fmtDayYear(iso)}`;
  if (grain === "month") return tickLabel(iso, grain);
  return fmtDayYear(iso);
}

type Row = Record<string, number | string | null>;

type TipProps = {
  active?: boolean;
  payload?: { payload: Row }[];
  series: Series[];
  grain: Grain;
  fmt: (v: number | null) => string;
  showPrev: boolean;
  extra?: (row: Row) => React.ReactNode;
};

function Tip({ active, payload, series, grain, fmt, showPrev, extra }: TipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="min-w-[180px] rounded-xl bg-surface px-3 py-2.5 text-[12px] shadow-lg ring-1 ring-line">
      <div className="mb-1.5 font-semibold text-ink">{headLabel(String(row.date), grain)}</div>
      {series.map((s) => (
        <div key={s.key} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-ink-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
          <span className="font-semibold tabular text-ink">{fmt(row[s.key] as number | null)}</span>
        </div>
      ))}
      {showPrev && row.prevDate && (
        <div className="mt-1.5 border-t border-line pt-1.5">
          <div className="mb-0.5 text-ink-3">Прошлый период, {headLabel(String(row.prevDate), grain)}</div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-4 py-0.5">
              <span className="text-ink-3">{s.label}</span>
              <span className="tabular text-ink-2">{fmt(row[`prev_${s.key}`] as number | null)}</span>
            </div>
          ))}
        </div>
      )}
      {extra?.(row)}
    </div>
  );
}

function buildRows(data: Day[], prev: Day[], series: Series[]) {
  return data.map((d, i) => {
    const row: Row = { date: d.date, prevDate: prev[i]?.date ?? null, posts: d.posts };
    for (const s of series) {
      row[s.key] = d[s.key] as number | null;
      row[`prev_${s.key}`] = (prev[i]?.[s.key] as number | null) ?? null;
    }
    return row;
  });
}

export function TimeChart({
  data,
  prev = [],
  series,
  grain,
  fmt = fmtCompact,
  stacked = false,
  showPrev = true,
  refLine,
  height = 240,
  zero = true,
  clip = true,
  axisFmt,
}: {
  data: Day[];
  prev?: Day[];
  series: Series[];
  grain: Grain;
  fmt?: (v: number | null) => string;
  stacked?: boolean;
  showPrev?: boolean;
  refLine?: { value: number | null; label: string };
  height?: number;
  zero?: boolean; // ось Y от нуля; для подписчиков — по диапазону данных
  clip?: boolean; // обрезать шкалу по выбросам
  axisFmt?: (v: number) => string; // подписи оси Y (по умолчанию компактные числа)
}) {
  const raw = buildRows(data, prev, series);
  const withPrev = showPrev && series.length === 1 && prev.length > 0;
  const barSize = Math.max(3, Math.min(28, 640 / Math.max(raw.length, 1)));

  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  // Шкалу подбираем по столбцам, если они есть: линия-медиана не должна влиять на обрезку
  const scaleSeries = series.some((s) => s.kind === "bar") ? series.filter((s) => s.kind === "bar") : series;
  const totals = raw.map((r) =>
    stacked ? series.reduce((a, s) => a + (num(r[s.key]) ?? 0), 0) : Math.max(0, ...scaleSeries.map((s) => num(r[s.key]) ?? 0)),
  );
  const zone = clip ? zoneFor(totals) : null;
  const cap = zone?.cap ?? null;
  const labelled = zone ? labelledOverflows(totals, zone.cap) : new Set<number>();
  // Значение выше шкалы уходит в полосу выбросов; в подсказке остаётся настоящее
  const place = (v: number | null) => (v == null || !zone ? v : v > zone.cap ? zone.at : v);

  const rows = raw.map((r, i) => {
    const over = zone != null && totals[i] > zone.cap;
    const out: Row = { ...r, overflow: over ? totals[i] : null, overflowAt: labelled.has(i) ? zone!.at : null };
    const k = over && stacked ? zone!.at / totals[i] : 1;
    for (const s of series) {
      const v = num(r[s.key]);
      out[`d_${s.key}`] = v == null ? null : stacked ? v * k : place(v);
      out[`dprev_${s.key}`] = place(num(r[`prev_${s.key}`]));
    }
    return out;
  });
  const hasRef = refLine?.value != null;

  // Подпись выброса над столбцом / точкой, прижатой к верху
  const OverflowLabel = (p: unknown) => {
    const props = p as { x?: number | string; y?: number | string; width?: number | string; index?: number };
    const index = props.index ?? -1;
    const row = rows[index];
    if (!row?.overflow || !labelled.has(index) || props.x == null || props.y == null) return <g />;
    const cx = Number(props.x) + Number(props.width ?? 0) / 2;
    const y = Number(props.y);
    return (
      <text x={cx} y={y - 8} textAnchor={anchorFor(index, rows.length)} fontSize={11} fontWeight={600} fill="var(--ink)">
        {fmt(row.overflow as number)}
      </text>
    );
  };

  return (
    <div>
      {(series.length > 1 || withPrev || hasRef) && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              {s.kind === "line" ? (
                <span className="h-0.5 w-4 rounded" style={{ background: s.color }} />
              ) : (
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              )}
              {s.label}
            </span>
          ))}
          {withPrev && (
            <span className="flex items-center gap-1.5">
              <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: "var(--prev)" }} />
              прошлый период
            </span>
          )}
          {hasRef && (
            <span className="flex items-center gap-1.5">
              <span className="h-0 w-4 border-t border-dashed" style={{ borderColor: "var(--ink-3)" }} />
              {refLine!.label}: <b className="font-semibold text-ink tabular">{fmt(refLine!.value)}</b>
            </span>
          )}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={rows} margin={{ top: zone ? 18 : 6, right: 12, bottom: 0, left: 0 }} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => tickLabel(v, grain)}
            tick={{ fontSize: 11, fill: "var(--ink-3)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--line)" }}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v) => (axisFmt ? axisFmt(v) : fmtAxis(v))}
            tick={{ fontSize: 11, fill: "var(--ink-3)" }}
            tickLine={false}
            axisLine={false}
            width={56}
            domain={zone ? [0, zone.top] : zero ? [0, "auto"] : ["auto", "auto"]}
            ticks={zone?.ticks}
            allowDataOverflow={zone != null}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)", stroke: "var(--line)" }}
            content={(p) => (
              <Tip {...(p as unknown as TipProps)} series={series} grain={grain} fmt={fmt} showPrev={withPrev} />
            )}
          />
          {withPrev && (
            <Line
              dataKey={`dprev_${series[0].key}`}
              stroke="var(--prev)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          )}
          {series.map((s, i) =>
            s.kind === "bar" ? (
              <Bar
                key={s.key}
                dataKey={`d_${s.key}`}
                fill={s.color}
                stackId={stacked ? "a" : undefined}
                maxBarSize={barSize}
                radius={stacked && i < series.length - 1 ? 0 : [4, 4, 0, 0]}
                stroke={stacked ? "var(--surface)" : undefined}
                strokeWidth={stacked ? 1 : 0}
                isAnimationActive={false}
              />
            ) : (
              <Line
                key={s.key}
                dataKey={`d_${s.key}`}
                stroke={s.color}
                strokeWidth={2}
                dot={raw.length <= 45 ? { r: 3, strokeWidth: 2, fill: "var(--surface)" } : false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }}
                connectNulls
                isAnimationActive={false}
              />
            ),
          )}
          {zone && <ZoneBreak zone={zone} />}
          {zone && (
            <Line dataKey="overflowAt" stroke="none" dot={false} activeDot={false} isAnimationActive={false} label={OverflowLabel} legendType="none" />
          )}
          {hasRef && <ReferenceLine y={refLine!.value!} stroke="var(--ink-3)" strokeDasharray="3 3" ifOverflow="extendDomain" />}
        </ComposedChart>
      </ResponsiveContainer>
      {zone && <CapNote />}
    </div>
  );
}

// Прирост/отток по дням: столбцы вверх — синие, вниз — красные
export function DeltaBars({ data, grain, height = 200 }: { data: Day[]; grain: Grain; height?: number }) {
  const values = data.map((d) => d.followersDelta);
  const zone = zoneFor(values);
  const labelled = zone ? labelledOverflows(values, zone.cap) : new Set<number>();
  const rows = data.map((d, i) => {
    const v = d.followersDelta;
    const over = zone != null && v != null && Math.abs(v) > zone.cap;
    return { date: d.date, v, shown: over ? Math.sign(v!) * zone!.at : v, over, label: labelled.has(i), gained: d.gained, lost: d.lost };
  });
  const OverLabel = (p: unknown) => {
    const { x, y, width, height: h, index } = p as { x?: number | string; y?: number | string; width?: number | string; height?: number | string; index?: number };
    const r = rows[index ?? -1];
    if (!r?.over || !r.label || r.v == null) return <g />;
    const up = r.v > 0;
    const cx = Number(x) + Number(width ?? 0) / 2;
    // у отрицательного столбца y — это верх (ноль), подпись ставим под его низом
    const ty = up ? Number(y) - 6 : Number(y) + Number(h ?? 0) + 13;
    return (
      <text x={cx} y={ty} textAnchor={anchorFor(index ?? 0, rows.length)} fontSize={11} fontWeight={600} fill="var(--ink)">
        {up ? "+" : "−"}{Math.abs(r.v)}
      </text>
    );
  };
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} margin={{ top: zone ? 18 : 6, right: 12, bottom: zone ? 14 : 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="date" tickFormatter={(v) => tickLabel(v, grain)} tick={{ fontSize: 11, fill: "var(--ink-3)" }} tickLine={false} axisLine={{ stroke: "var(--line)" }} minTickGap={24} />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--ink-3)" }}
            tickLine={false}
            axisLine={false}
            width={40}
            allowDecimals={false}
            domain={zone ? [-zone.top, zone.top] : ["auto", "auto"]}
            ticks={zone ? [...zone.ticks.slice(1).reverse().map((t) => -t), ...zone.ticks] : undefined}
            allowDataOverflow={zone != null}
          />
          <ReferenceLine y={0} stroke="var(--ink-3)" />
          {zone && <ReferenceLine y={zone.brk} stroke="var(--ink-3)" strokeDasharray="2 4" />}
          {zone && <ReferenceLine y={-zone.brk} stroke="var(--ink-3)" strokeDasharray="2 4" />}
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as (typeof rows)[number];
              return (
                <div className="rounded-xl bg-surface px-3 py-2 text-[12px] shadow-lg ring-1 ring-line">
                  <div className="mb-1 font-semibold">{headLabel(r.date, grain)}</div>
                  <div className="tabular">
                    Изменение: <b>{r.v == null ? "—" : (r.v > 0 ? "+" : "") + r.v}</b>
                  </div>
                  {r.gained != null && <div className="tabular text-ink-2">Пришло: {r.gained}</div>}
                  {r.lost != null && <div className="tabular text-ink-2">Ушло: {r.lost}</div>}
                </div>
              );
            }}
          />
          <Bar dataKey="shown" maxBarSize={24} isAnimationActive={false} radius={[3, 3, 3, 3]} label={zone ? OverLabel : undefined}>
            {rows.map((r) => (
              <Cell key={r.date} fill={(r.v ?? 0) < 0 ? "var(--neg)" : "var(--s1)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {zone && <CapNote />}
    </div>
  );
}

export function CapNote() {
  return (
    <p className="mt-1 text-[11px] text-ink-3">
      Шкала подобрана по обычным значениям. Выбросы нарисованы за пунктиром и подписаны настоящим значением.
    </p>
  );
}

// Мини-график: выброс прижат к верху и выделен тёмным, настоящее значение — в подсказке
export function Sparkline({ data, dataKey, height = 48 }: { data: Day[]; dataKey: keyof Day; height?: number }) {
  const zone = zoneFor(data.map((d) => d[dataKey] as number | null));
  const rows = data.map((d) => {
    const v = d[dataKey] as number | null;
    const over = zone != null && v != null && v > zone.cap;
    return { ...d, shown: over ? zone!.at : v, over };
  });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <YAxis hide domain={zone ? [0, zone.top] : [0, "auto"]} allowDataOverflow={zone != null} />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.05)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as Day;
            return (
              <div className="rounded-lg bg-surface px-2 py-1 text-[11px] shadow ring-1 ring-line tabular">
                {fmtDay(d.date)}: <b>{fmtCompact(d[dataKey] as number)}</b>
              </div>
            );
          }}
        />
        <Bar dataKey="shown" radius={[2, 2, 0, 0]} isAnimationActive={false}>
          {rows.map((r) => (
            <Cell key={r.date} fill={r.over ? "var(--s1-dark)" : "var(--s1)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
