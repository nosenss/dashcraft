"use client";

import { IconChevron } from "./icons";
import { useMemo, useState } from "react";
import { bucketDays, median, withRolling, type Day, type Grain } from "@/lib/metrics";
import type { NetworkReport } from "@/lib/report";
import { fmtCompact, fmtDay, fmtDayYear, fmtInt, fmtPct, fmtRate, fmtSigned } from "@/lib/format";
import { DeltaBars, TimeChart, type Series } from "./charts";
import { NetworkIcon } from "./NetworkIcon";
import { partsText } from "@/lib/networks";
import { PostsSection } from "./PostsSection";
import { useReportInfo } from "./Loading";
import { Card, Chips, Connector, Delta, Kpi, StageHead } from "./ui";

const PART_COLORS = { likes: "var(--s1)", comments: "var(--s2)", shares: "var(--s3)", saves: "var(--s4)" } as const;

const HINT = {
  viewRate: "Средние просмотры поста ÷ подписчики × 100. Какая доля аудитории в среднем видит пост.",
  reachRate: "Средний охват поста ÷ подписчики × 100. Больше 100% — пост выходит за пределы подписчиков.",
  erv: "ERV = реакции ÷ просмотры × 100. Какая доля просмотров закончилась лайком, комментарием, репостом или сохранением.",
  err: "ERR = реакции ÷ охват × 100. Какая доля увидевших пост людей отреагировала.",
  unique: "Охват ÷ просмотры × 100. Доля уникальных людей среди всех просмотров; остальное — повторные просмотры.",
  er: "ER = реакций в среднем на пост ÷ подписчики × 100 (формула Livedune).",
};

export function NetworkView({ report }: { report: NetworkReport }) {
  useReportInfo(report.fetchedAt, report.stale);
  const [grain, setGrain] = useState<Grain>(report.period.days > 120 ? "week" : "day");
  const days = useMemo(() => bucketDays(report.days, grain), [report.days, grain]);
  const prevDays = useMemo(() => bucketDays(report.prevDays, grain), [report.prevDays, grain]);
  const t = report.totals;
  const p = report.prevTotals;
  const { period } = report;
  const ig = report.hasReach;
  let step = 0;

  return (
    <div className="pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <NetworkIcon slug={report.slug} size={40} />
          <div>
            <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight">{report.shared ? report.account.name : report.label}</h1>
            <p className="text-[13px] text-ink-2">
              <a href={report.account.url} target="_blank" rel="noreferrer" className="hover:text-ink hover:underline">
                {report.shared ? report.label : report.account.name}
              </a>
              <br />
              {fmtDayYear(period.from)} — {fmtDayYear(period.to)}
              <span className="text-ink-3">, сравниваем с {fmtDayYear(period.prevFrom)} — {fmtDayYear(period.prevTo)}</span>
            </p>
          </div>
        </div>
        <Chips<Grain>
          value={grain}
          onChange={setGrain}
          options={[
            { value: "day", label: "По дням" },
            { value: "week", label: "По неделям" },
            { value: "month", label: "По месяцам" },
          ]}
        />
      </div>

      {!report.verified && (
        <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-[13px] text-ink-2 ring-1 ring-line">
          {report.generic
            ? `Дашкрафт пока не знает соцсеть «${report.label}» и показывает её по общим метрикам Livedune.`
            : `Данные «${report.label}» ещё не сверены на живых ответах Livedune.`}{" "}
          Если цифры расходятся с кабинетом Livedune, напишите в Issues на GitHub — поправим.
        </p>
      )}

      <FunnelStrip report={report} />

      {/* 1. Аудитория */}
      <Card className="mt-6" id="stage-audience">
        <StageHead step={++step} title="Аудитория" sub="Подписчики на конец каждого дня и изменение за день" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Kpi big label="Подписчики" value={fmtInt(t.followers)} delta={<Delta cur={t.followers} abs={fmtSigned(t.followersDelta)} suffix="за период" />} />
          <Kpi label="На начало периода" value={fmtInt(t.followers != null && t.followersDelta != null ? t.followers - t.followersDelta : null)} />
          {t.gained != null && <Kpi label="Пришло" value={fmtInt(t.gained)} delta={<Delta cur={t.gained} prev={p.gained} />} />}
          {t.lost != null && <Kpi label="Ушло" value={fmtInt(t.lost)} delta={<Delta cur={t.lost} prev={p.lost} invert />} />}
        </div>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-1 text-[12px] font-medium text-ink-2">Подписчики</div>
            <FollowersLine days={days} grain={grain} />
          </div>
          <div>
            <div className="mb-1 text-[12px] font-medium text-ink-2">Изменение за {grain === "day" ? "день" : grain === "week" ? "неделю" : "месяц"}</div>
            <DeltaBars data={days} grain={grain} height={220} />
          </div>
        </div>
      </Card>

      <Connector items={[{ label: "View Rate", value: t.viewRate, prev: p.viewRate, hint: HINT.viewRate }]} />

      {/* Просмотры */}
      <Card id="stage-views">
        <StageHead step={++step} title="Просмотры" sub="Все просмотры, в том числе повторные. Просмотры постов считаются по дню публикации: столбец — всё, что набрали посты этого дня" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Kpi big label="Просмотры" value={fmtCompact(t.views)} delta={<Delta cur={t.views} prev={p.views} />} />
          <Kpi label="Публикаций" value={fmtInt(t.posts)} delta={<Delta cur={t.posts} prev={p.posts} />} />
          <Kpi label="Средние просмотры поста" value={fmtInt(t.avgViews)} delta={<Delta cur={t.avgViews} prev={p.avgViews} />} />
          <Kpi label="Медиана просмотров" hint="Типичный пост: половина постов набрала больше, половина меньше" value={fmtInt(report.medianViews)} />
        </div>
        <SwitchChart
          className="mt-5"
          days={days}
          prevDays={prevDays}
          grain={grain}
          options={[
            { value: "views", label: "Просмотры постов", kind: "bar" },
            { value: "avgViews", label: "Среднее на пост (скользящее, Livedune)", kind: "line" },
            { value: "posts", label: "Публикации", kind: "bar" },
          ]}
        />
      </Card>

      {/* Охват (Instagram): уже просмотров, это уникальные люди */}
      {ig && (
        <>
          <Connector items={[{ label: "Уникальный охват", value: t.uniqueShare, prev: p.uniqueShare, hint: HINT.unique }]} />
          <Card id="stage-reach">
            <StageHead step={++step} title="Охват" sub="Уникальные люди: один человек может посмотреть пост несколько раз, в охват он попадёт один раз" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <Kpi label="Reach Rate" hint={HINT.reachRate} value={fmtPct(t.reachRate)} delta={<Delta pp cur={t.reachRate} prev={p.reachRate} />} />
              <Kpi big label="Охват постов" hint="Сумма охватов постов, опубликованных за период" value={fmtCompact(t.reach)} delta={<Delta cur={t.reach} prev={p.reach} />} />
              <Kpi label="Средний охват поста" value={fmtInt(t.avgReach)} delta={<Delta cur={t.avgReach} prev={p.avgReach} />} />
              <Kpi label="Охват аккаунта" hint="Сумма дневных охватов аккаунта (включая сторис и профиль), люди могут повторяться" value={fmtCompact(t.accReach)} delta={<Delta cur={t.accReach} prev={p.accReach} />} />
              <Kpi label="Просмотры профиля" value={fmtInt(t.profileViews)} delta={<Delta cur={t.profileViews} prev={p.profileViews} />} />
            </div>
            <SwitchChart
              className="mt-5"
              days={days}
              prevDays={prevDays}
              grain={grain}
              options={[
                { value: "accReach", label: "Охват аккаунта за день", kind: "line" },
                { value: "reach", label: "Охват постов по дате публикации", kind: "bar" },
                { value: "accImpressions", label: "Показы аккаунта", kind: "line" },
                { value: "profileViews", label: "Просмотры профиля", kind: "line" },
              ]}
            />
          </Card>
        </>
      )}

      <Connector
        items={[
          ...(ig ? [{ label: "ERR", value: t.err, prev: p.err, hint: HINT.err }] : []),
          { label: "ERV", value: t.erv, prev: p.erv, hint: HINT.erv },
        ]}
      />

      {/* Реакции на посты */}
      <Card id="stage-reactions">
        <StageHead step={++step} title="Реакции на посты" sub={`Что люди сделали с постами: ${partsText(report.parts)}. Считаются по дню публикации поста`} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Kpi big label="Всего реакций" value={fmtInt(t.engagement)} delta={<Delta cur={t.engagement} prev={p.engagement} />} />
          {(Object.keys(report.parts) as (keyof typeof report.parts)[]).map((k) => (
            <Kpi key={k} label={report.parts[k]!} value={fmtInt(t[k])} delta={<Delta cur={t[k]} prev={p[k]} />} />
          ))}
        </div>
        <div className="mt-5">
          <TimeChart
            data={days}
            prev={prevDays}
            grain={grain}
            stacked
            fmt={fmtInt}
            series={(Object.keys(report.parts) as (keyof typeof report.parts)[]).map((k) => ({
              key: k,
              label: report.parts[k]!,
              color: PART_COLORS[k],
              kind: "bar" as const,
            }))}
          />
        </div>
      </Card>

      <Connector items={[{ label: "ER", value: t.er, prev: p.er, hint: HINT.er }]} />

      {/* Эффективность */}
      <Card id="stage-er">
        <StageHead step={++step} title="Доля реагирующих (ER, ERV)" sub="Какой процент аудитории реагирует на посты. Столбцы — посты, вышедшие в этот день, линия — типичный уровень за последние 7 дней" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Kpi big label="ER" hint={HINT.er} value={fmtPct(t.er)} delta={<Delta pp cur={t.er} prev={p.er} />} />
          <Kpi label="ERV" hint={HINT.erv} value={fmtPct(t.erv)} delta={<Delta pp cur={t.erv} prev={p.erv} />} />
          {ig && <Kpi label="ERR" hint={HINT.err} value={fmtPct(t.err)} delta={<Delta pp cur={t.err} prev={p.err} />} />}
          <Kpi label="Реакций на пост" value={fmtInt(t.avgEngagement)} delta={<Delta cur={t.avgEngagement} prev={p.avgEngagement} />} />
        </div>
        <RateChart grain={grain} report={report} />
      </Card>


      <PostsSection report={report} />
    </div>
  );
}

function FollowersLine({ days, grain }: { days: Day[]; grain: Grain }) {
  const vals = days.map((d) => d.followers).filter((v): v is number => v != null);
  return (
    <TimeChart
      data={days}
      grain={grain}
      fmt={fmtInt}
      showPrev={false}
      height={220}
      zero={false}
      clip={false}
      series={[{ key: "followers", label: "Подписчики", color: "var(--s1)", kind: "line" }]}
      key={vals.length}
    />
  );
}

function SwitchChart({
  days,
  prevDays,
  grain,
  options,
  className = "",
}: {
  days: Day[];
  prevDays: Day[];
  grain: Grain;
  options: { value: keyof Day & string; label: string; kind: Series["kind"] }[];
  className?: string;
}) {
  const [metric, setMetric] = useState(options[0].value);
  const opt = options.find((o) => o.value === metric) ?? options[0];
  return (
    <div className={className}>
      <div className="mb-3">
        <Chips value={metric} onChange={setMetric} options={options} />
      </div>
      <TimeChart
        data={days}
        prev={prevDays}
        grain={grain}
        fmt={fmtCompact}
        series={[{ key: opt.value, label: opt.label, color: "var(--s1)", kind: opt.kind }]}
      />
    </div>
  );
}

function RateChart({ grain, report }: { grain: Grain; report: NetworkReport }) {
  type K = "er" | "erv" | "err";
  const [k, setK] = useState<K>("er");
  const labels: Record<K, string> = { er: "ER", erv: "ERV", err: "ERR" };
  const opts = (["er", "erv", ...(report.hasReach ? ["err"] : [])] as K[]).map((v) => ({ value: v, label: labels[v] }));
  // По дням: столбец — посты этого дня, линия — те же посты за 7 дней; по неделям/месяцам — только столбцы
  const data = useMemo(
    () => (grain === "day" ? withRolling(report.days, report.prevDays.slice(-6)) : bucketDays(report.days, grain)),
    [report.days, report.prevDays, grain],
  );
  const daily = data.map((d) => d[k]).filter((v): v is number => v != null);
  const unit = grain === "day" ? "дня" : grain === "week" ? "недели" : "месяца";
  return (
    <div className="mt-5">
      <div className="mb-3">
        <Chips value={k} onChange={setK} options={opts} />
      </div>
      <TimeChart
        data={data}
        grain={grain}
        showPrev={false}
        fmt={(v) => fmtPct(v, 1)}
        axisFmt={(v) => fmtPct(v, v < 1 ? 1 : 0)}
        refLine={{ value: median(daily), label: `медиана за период` }}
        series={[
          { key: k, label: `${labels[k]} постов ${unit}`, color: "#9ec5f4", kind: "bar" },
          ...(grain === "day" ? [{ key: `${k}7` as keyof Day, label: `типичный ${labels[k]} (медиана за 7 дней)`, color: "var(--s1)", kind: "line" as const }] : []),
        ]}
      />
    </div>
  );
}

// Сводка воронки одной строкой: ступени и конверсии между ними
function FunnelStrip({ report }: { report: NetworkReport }) {
  const t = report.totals;
  const p = report.prevTotals;
  const steps: Step[] = [
    { label: "Подписчики", value: fmtInt(t.followers), cur: t.followers, prev: p.followers, href: "#stage-audience" },
    { label: "Просмотры", value: fmtCompact(t.views), cur: t.views, prev: p.views, href: "#stage-views", rate: { label: "View Rate", value: t.viewRate } },
    ...(report.hasReach
      ? [{ label: "Охват постов", value: fmtCompact(t.reach), cur: t.reach, prev: p.reach, href: "#stage-reach", rate: { label: "Уникальных", value: t.uniqueShare } }]
      : []),
    {
      label: "Реакции на посты",
      value: fmtInt(t.engagement),
      cur: t.engagement,
      prev: p.engagement,
      href: "#stage-reactions",
      rate: report.hasReach ? { label: "ERR", value: t.err } : { label: "ERV", value: t.erv },
    },
    { label: "ER", value: fmtPct(t.er), cur: t.er, prev: p.er, href: "#stage-er", pp: true },
  ];
  return (
    <div className="mt-5">
      <StripRow steps={steps} t={t} />
    </div>
  );
}

type Step = {
  label: string;
  value: string;
  cur: number | null;
  prev: number | null;
  href: string;
  pp?: boolean;
  rate?: { label: string; value: number | null };
};

function StripRow({ steps, t }: { steps: Step[]; t: NetworkReport["totals"] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-stretch">
      {steps.map((s, i) => (
        <div key={s.label} className="flex flex-1 items-stretch gap-2">
          {i > 0 && (
            <div className="hidden w-16 shrink-0 flex-col items-center justify-center text-center sm:flex">
              <IconChevron size={18} className="text-ink-3" />
              {s.rate && (
                <span className="mt-1 text-[11px] leading-tight text-ink-2">
                  {s.rate.label}
                  <br />
                  <b className="tabular text-ink">{fmtRate(s.rate.value)}</b>
                </span>
              )}
            </div>
          )}
          <a href={s.href} className="min-w-0 flex-1 rounded-2xl bg-surface p-4 ring-1 ring-line transition-shadow hover:ring-ink/30">
            <div className="truncate text-[12px] font-medium text-ink-2">{s.label}</div>
            <div className="truncate font-display text-[24px] font-bold tracking-tight tabular">{s.value}</div>
            {s.label === "Подписчики" ? (
              <Delta cur={t.followers} abs={fmtSigned(t.followersDelta)} suffix="за период" />
            ) : (
              <Delta pp={s.pp} cur={s.cur} prev={s.prev} />
            )}
          </a>
        </div>
      ))}
    </div>
  );
}
