"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Unsupported } from "@/lib/accounts";
import type { Period } from "@/lib/dates";
import type { FailedNetwork, NetworkReport } from "@/lib/report";
import { useReportInfo } from "./Loading";
import { partsText, postTypeLabel } from "@/lib/networks";
import { plural, fmtCompact, fmtDay, fmtDayYear, fmtInt, fmtPct, fmtSigned, fmtX } from "@/lib/format";
import { Sparkline } from "./charts";
import { NetworkIcon } from "./NetworkIcon";
import { Card, Delta, Kpi } from "./ui";

type Props = { reports: NetworkReport[]; failed: FailedNetwork[]; unsupported: Unsupported[]; period: Period };

export function Overview({ reports, failed, unsupported, period }: Props) {
  useReportInfo(
    reports.length ? Math.min(...reports.map((r) => r.fetchedAt ?? Date.now())) : null,
    reports.some((r) => r.stale),
  );
  const search = useSearchParams();
  const qs = search.toString() ? `?${search.toString()}` : "";
  const total = (f: (r: NetworkReport["totals"]) => number | null) => reports.reduce((s, r) => s + (f(r.totals) ?? 0), 0);
  const prevTotal = (f: (r: NetworkReport["totals"]) => number | null) => reports.reduce((s, r) => s + (f(r.prevTotals) ?? 0), 0);

  // Лучшие посты по всем аккаунтам — по отношению к медиане своего аккаунта, чтобы TikTok и Telegram были сравнимы
  const best = reports
    .flatMap((r) => r.posts.map((p) => ({ ...p, slug: r.slug, accountId: r.account.id, source: r.shared ? r.account.name : r.label })))
    .filter((p) => p.vsMedian != null)
    .sort((a, b) => (b.vsMedian ?? 0) - (a.vsMedian ?? 0))
    .slice(0, 8);

  return (
    <div className="pt-6">
      <h1 className="font-display text-[28px] font-bold tracking-tight">Все соцсети</h1>
      <p className="text-[13px] text-ink-2">
        {fmtDayYear(period.from)} — {fmtDayYear(period.to)}
        <span className="text-ink-3">, сравниваем с {fmtDayYear(period.prevFrom)} — {fmtDayYear(period.prevTo)}</span>
      </p>

      <Card className="mt-5">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Kpi
            big
            label="Подписчики"
            hint={reports.length > 1 ? "Сумма по всем аккаунтам. Один человек может быть подписан на несколько, поэтому людей может быть меньше" : undefined}
            value={fmtInt(total((t) => t.followers))} delta={<Delta cur={0} abs={fmtSigned(total((t) => t.followersDelta))} suffix="за период" />} />
          <Kpi big label="Просмотры постов" value={fmtCompact(total((t) => t.views))} delta={<Delta cur={total((t) => t.views)} prev={prevTotal((t) => t.views)} />} />
          <Kpi big label="Реакции на посты" hint="Лайки, комментарии, репосты и сохранения на постах за период, по всем сетям" value={fmtInt(total((t) => t.engagement))} delta={<Delta cur={total((t) => t.engagement)} prev={prevTotal((t) => t.engagement)} />} />
          <Kpi big label="Публикаций" value={fmtInt(total((t) => t.posts))} delta={<Delta cur={total((t) => t.posts)} prev={prevTotal((t) => t.posts)} />} />
        </div>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {failed.map((f) => (
          <div key={f.id} className="rounded-2xl border border-dashed border-bad/40 bg-surface p-5">
            <div className="flex items-center gap-2.5">
              <NetworkIcon slug={f.slug} size={28} />
              <div className="font-display text-[17px] font-bold">{f.label}</div>
            </div>
            <p className="mt-3 text-[13px] text-bad">Не загрузилось: {f.error}</p>
            <p className="mt-1 text-[12px] text-ink-3">Остальные аккаунты посчитаны без него. Нажмите «Обновить», чтобы попробовать снова.</p>
          </div>
        ))}
        {reports.map((r) => {
          const t = r.totals;
          const p = r.prevTotals;
          const rows = [
            { label: "Просмотры", sub: "", v: fmtCompact(t.views), cur: t.views, prev: p.views, pp: false },
            ...(r.hasReach ? [{ label: "Охват постов", sub: "уникальные люди", v: fmtCompact(t.reach), cur: t.reach, prev: p.reach, pp: false }] : []),
            { label: "Реакции на посты", sub: partsText(r.parts), v: fmtInt(t.engagement), cur: t.engagement, prev: p.engagement, pp: false },
            { label: "ERV", sub: "реакции ÷ просмотры", v: fmtPct(t.erv), cur: t.erv, prev: p.erv, pp: true },
            { label: "ER", sub: "реакции на пост ÷ подписчики", v: fmtPct(t.er), cur: t.er, prev: p.er, pp: true },
          ];
          return (
            <Link key={r.account.id} href={`${r.href}${qs}`} className="group rounded-2xl bg-surface p-5 ring-1 ring-line transition-shadow hover:ring-ink/30">
              <div className="flex items-center gap-2.5">
                <NetworkIcon slug={r.slug} size={28} />
                <div className="min-w-0">
                  <div className="truncate font-display text-[17px] font-bold leading-tight">{r.shared ? r.account.name : r.label}</div>
                  <div className="truncate text-[12px] text-ink-3">{r.shared ? r.label : r.account.name}</div>
                </div>
                <span className="ml-auto shrink-0 text-[13px] text-ink-3 group-hover:text-ink">Открыть воронку</span>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[12px] text-ink-2">Подписчики</div>
                  <div className="font-display text-[26px] font-bold leading-tight tabular">{fmtInt(t.followers)}</div>
                  <Delta cur={t.followers} abs={fmtSigned(t.followersDelta)} suffix="за период" />
                </div>
                <div className="text-right text-[12px] text-ink-2">
                  {plural(t.posts, "публикация", "публикации", "публикаций")}
                </div>
              </div>
              <div className="mt-3 divide-y divide-line/70 border-t border-line/70">
                {rows.map((row) => (
                  <div key={row.label} className="flex items-center gap-2 py-1.5 text-[13px]">
                    <span className="min-w-0 text-ink-2">
                      {row.label}
                      {row.sub && <span className="block text-[11px] leading-tight text-ink-3">{row.sub}</span>}
                    </span>
                    <span className="ml-auto font-semibold tabular">{row.v}</span>
                    <span className="w-[84px] text-right">
                      <Delta pp={row.pp} cur={row.cur} prev={row.prev} />
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <div className="text-[11px] text-ink-3">Просмотры постов по дням публикации</div>
                <Sparkline data={r.days} dataKey="views" />
              </div>
            </Link>
          );
        })}
      </div>

      {!reports.length && !failed.length && (
        <div className="mt-6 rounded-2xl bg-surface p-6 text-center text-[13px] text-ink-2 ring-1 ring-line">
          В Livedune нет подключённых аккаунтов Instagram, Telegram, ВКонтакте, YouTube, TikTok или Дзена. Добавьте их в дашборд Livedune.
        </div>
      )}

      {unsupported.length > 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-surface px-5 py-4 text-[13px] text-ink-2">
          <span className="font-semibold text-ink">Не показаны: </span>
          {unsupported.map((u, i) => (
            <span key={u.id}>
              {i > 0 && ", "}
              {u.name} <span className="text-ink-3">({u.type})</span>
            </span>
          ))}
          . Эти соцсети Дашкрафт пока не поддерживает.
        </div>
      )}

      {best.length > 0 && (
        <Card className="mt-6">
          <h2 className="font-display text-[20px] font-bold tracking-tight">Выстрелившие посты</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">Во сколько раз просмотры поста выше обычного (медианы) в своём аккаунте</p>
          <div className="mt-4 divide-y divide-line/70">
            {best.map((p) => (
              <a key={`${p.accountId}:${p.id}`} href={p.url ?? "#"} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-2.5 text-[13px] hover:bg-bg/60">
                <span title={p.source} className="shrink-0"><NetworkIcon slug={p.slug} size={22} /></span>
                <span className="w-16 shrink-0 tabular text-ink-2">{fmtDay(p.date)}</span>
                <span className="hidden w-20 shrink-0 text-ink-3 sm:block">{postTypeLabel(p.type)}</span>
                <span className="min-w-0 flex-1 truncate">{p.text.replace(/\s+/g, " ") || "Без текста"}</span>
                <span className="shrink-0 tabular text-ink-2">{fmtCompact(p.views)} просм.</span>
                <span className="w-14 shrink-0 text-right font-display font-bold tabular">{fmtX(p.vsMedian)}</span>
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
