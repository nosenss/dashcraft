import type { ReactNode } from "react";
import { change, fmtPct, fmtRate } from "@/lib/format";
import { IconDown, IconInfo, IconUp } from "./icons";

export function Card({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`scroll-mt-32 rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-6 ${className}`}>{children}</section>;
}

// Изменение к прошлому периоду: стрелка + текст, не только цвет.
// Доли (ER, ERV…) сравниваем в процентных пунктах, большой рост — в разах.
export function Delta({
  cur,
  prev,
  abs,
  pp = false,
  invert = false,
  suffix = "",
}: {
  cur: number | null | undefined;
  prev?: number | null;
  abs?: string; // готовая абсолютная разница, напр. «+19»
  pp?: boolean;
  invert?: boolean;
  suffix?: string;
}) {
  let sign: number | null;
  let text: string;
  if (abs != null) {
    sign = abs.startsWith("+") ? 1 : abs.startsWith("−") ? -1 : 0;
    text = abs;
  } else if (pp) {
    if (cur == null || prev == null) return <span className="text-[12px] text-ink-3">—</span>;
    const d = cur - prev;
    sign = Math.abs(d) < 0.005 ? 0 : Math.sign(d);
    text = `${sign > 0 ? "+" : sign < 0 ? "−" : ""}${Math.abs(d).toLocaleString("ru-RU", { maximumFractionDigits: Math.abs(d) >= 10 ? 0 : 2 })} п.п.`;
  } else {
    const v = change(cur, prev);
    if (v == null) return <span className="text-[12px] text-ink-3">—</span>;
    sign = Math.abs(v) < 0.05 ? 0 : Math.sign(v);
    const ratio = cur! / prev!;
    text = ratio >= 2 ? `×${ratio.toLocaleString("ru-RU", { maximumFractionDigits: ratio >= 10 ? 0 : 1 })}` : fmtPct(Math.abs(v), 1);
  }
  const good = invert ? sign < 0 : sign > 0;
  const color = sign === 0 ? "text-ink-3" : good ? "text-good" : "text-bad";
  return (
    <span className={`inline-flex items-center gap-0.5 whitespace-nowrap text-[12px] font-medium tabular ${color}`}>
      {sign > 0 && <IconUp size={13} />}
      {sign < 0 && <IconDown size={13} />}
      <span className="sr-only">{sign > 0 ? "рост " : sign < 0 ? "падение " : ""}</span>
      {text}
      {suffix && <span className="font-normal text-ink-3"> {suffix}</span>}
    </span>
  );
}

// Подсказка к метрике: видна по наведению и по фокусу с клавиатуры
export function Hint({ text, label }: { text: string; label: string }) {
  return (
    <span className="group/hint relative inline-flex">
      <button
        type="button"
        aria-label={`Что такое «${label}»`}
        className="-m-1.5 inline-flex rounded-full p-1.5 text-ink-3 transition-colors hover:text-ink-2 focus-visible:text-ink-2"
      >
        <IconInfo size={13} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-1 w-64 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-[12px] font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-focus-within/hint:visible group-focus-within/hint:opacity-100 group-hover/hint:visible group-hover/hint:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

// Метрика: подпись, значение, изменение. Все значения одной высоты — строки выравниваются
export function Kpi({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: ReactNode;
  big?: boolean; // оставлено для совместимости: размер у всех метрик теперь один
}) {
  return (
    <div className="min-w-0">
      <div className="flex h-5 items-center gap-1 text-[12px] font-medium text-ink-2">
        <span className="truncate">{label}</span>
        {hint && <Hint text={hint} label={label} />}
      </div>
      <div className="mt-1 truncate font-display text-[26px] font-bold leading-8 tracking-tight tabular">{value}</div>
      <div className="mt-0.5 h-5">{delta}</div>
    </div>
  );
}

export function StageHead({ step, title, sub }: { step: number; title: string; sub?: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[13px] font-bold text-white">
        {step}
      </span>
      <div>
        <h2 className="font-display text-[20px] font-bold leading-tight tracking-tight">{title}</h2>
        {sub && <p className="mt-0.5 text-[13px] text-ink-2">{sub}</p>}
      </div>
    </div>
  );
}

// Переход между ступенями воронки: коэффициент конверсии
export function Connector({ items }: { items: { label: string; value: number | null; prev: number | null; hint: string }[] }) {
  return (
    <div className="relative flex justify-center py-3">
      <div className="absolute inset-y-0 left-1/2 w-px bg-line" />
      <div className="relative flex flex-wrap justify-center gap-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 ring-1 ring-line">
            <span className="flex items-center gap-1 text-[12px] font-medium text-ink-2">
              {it.label}
              <Hint text={it.hint} label={it.label} />
            </span>
            <span className="font-display text-[16px] font-bold tabular">{fmtRate(it.value)}</span>
            {it.prev != null && <Delta pp cur={it.value} prev={it.prev} />}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`min-h-8 rounded-full px-3 text-[12px] font-medium transition-[color,background-color,scale] active:scale-[0.96] ${
            value === o.value ? "bg-ink text-white" : "bg-bg text-ink-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
