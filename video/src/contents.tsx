import React from "react";
import { Easing, interpolate } from "remotion";
import { NETS, NetIcon } from "./icons";
import { C, DISPLAY, clamp, ease, fmt, noise, pop, track } from "./theme";
import { Cursor, Delta, cardStyle } from "./ui";

type P = { f: number; vh: number };

// ——— Боль: пустой конструктор, который всё время ломается ———

export const BUILDER_W = 1200;

export function Builder({ f, vh }: P) {
  const top = 70, side = 230, pad = 28;
  const slotW = (BUILDER_W - side - pad * 3) / 2;
  const slotH = (vh - top - pad * 3) / 2;
  const slot = (i: number) => ({ left: side + pad + (i % 2) * (slotW + pad), top: top + pad + Math.floor(i / 2) * (slotH + pad), width: slotW, height: slotH });
  const s0 = slot(0);
  // Перетаскиваем виджет из списка в первую ячейку
  const drag = ease(f, 12, 46, Easing.inOut(Easing.cubic));
  const gx = interpolate(drag, [0, 1], [24, s0.left + 30]);
  const gy = interpolate(drag, [0, 1], [top + 110, s0.top + 40]);
  const dropped = f >= 46;
  const tab2 = pop(f, 105, 12, 200);
  const widgets = ["Таблица", "Линейный график", "Столбцы", "Воронка", "KPI-карточка", "Круговая"];

  return (
    <div style={{ position: "absolute", inset: 0, background: "#fbfbfc" }}>
      <div style={{ height: top, borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 14, background: C.surface }}>
        <Tab label="Новый дашборд (без названия)" active />
        <div style={{ transform: `scale(${tab2})`, transformOrigin: "left center" }}>
          <Tab label="Клиент №2 · новый дашборд" />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <Btn>Источник данных ▾</Btn>
          <Btn>Сохранить</Btn>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, top, bottom: 0, width: side, borderRight: `1px solid ${C.line}`, padding: 20, background: C.surface }}>
        <div style={{ fontSize: 15, color: C.ink3, fontWeight: 600, marginBottom: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>Виджеты</div>
        {widgets.map((w, i) => (
          <div key={w} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 10px", borderRadius: 10, fontSize: 18, color: C.ink2, background: i === 1 && f > 8 && !dropped ? C.bg : undefined }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: C.line }} />
            {w}
          </div>
        ))}
      </div>
      {/* Пустые ячейки с пунктиром */}
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ position: "absolute", ...slot(i), border: `2px dashed ${C.line}`, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", color: C.ink3, fontSize: 18 }}>
          Перетащите виджет сюда
        </div>
      ))}
      {/* 1: график без источника, встал криво */}
      {dropped && (
        <Widget rect={s0} title="Линейный график" f={f} at={46} tilt={-1.6} offset={[16, 10]}>
          <div style={{ color: C.ink3, fontSize: 18, textAlign: "center", marginTop: slotH * 0.22 }}>Выберите источник данных</div>
          <div style={{ margin: "14px auto 0", width: 240, padding: "10px 14px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 16, color: C.ink3 }}>Не выбрано ▾</div>
        </Widget>
      )}
      {/* 2: таблица с формулами и ошибками */}
      {f >= 75 && (
        <Widget rect={slot(1)} title="Сводная · Лист3" f={f} at={75}>
          <div style={{ fontFamily: "monospace", fontSize: 14, color: C.ink2, background: C.bg, borderRadius: 8, padding: "8px 10px", whiteSpace: "nowrap", overflow: "hidden" }}>
            fx =СУММЕСЛИ('Выгрузка TG'!C:C;"&gt;0")/Лист3!B2
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginTop: 10 }}>
            {Array.from({ length: 16 }, (_, i) => {
              const err = [2, 5, 7, 10, 13, 15].includes(i);
              return (
                <div key={i} style={{ height: Math.max(20, (slotH - 150) / 4), borderRadius: 4, background: err ? "#fde8e8" : C.bg, color: err ? C.bad : C.ink2, fontSize: 15, fontWeight: err ? 700 : 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {err ? (i % 3 ? "#ЗНАЧ!" : "#ДЕЛ/0!") : fmt(Math.round(noise(i, 4) * 9000))}
                </div>
              );
            })}
          </div>
        </Widget>
      )}
      {/* 3: график «нет данных» */}
      {f >= 90 && (
        <Widget rect={slot(2)} title="Охват по неделям" f={f} at={90} tilt={1.2}>
          <svg width={slotW - 40} height={slotH - 110} style={{ marginTop: 8 }}>
            <line x1={30} y1={10} x2={30} y2={slotH - 130} stroke={C.line} strokeWidth={2} />
            <line x1={30} y1={slotH - 130} x2={slotW - 50} y2={slotH - 130} stroke={C.line} strokeWidth={2} />
            <line x1={30} y1={slotH - 140} x2={slotW - 50} y2={slotH - 140} stroke={C.prev} strokeWidth={3} strokeDasharray="8 8" />
            <text x={(slotW - 40) / 2} y={(slotH - 110) / 2} textAnchor="middle" fontSize={19} fill={C.ink3}>⚠ Нет данных для отображения</text>
          </svg>
        </Widget>
      )}
      {/* 4: вечная загрузка */}
      {f >= 105 && (
        <Widget rect={slot(3)} title="Вовлечённость" f={f} at={105}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: slotH * 0.18, gap: 12, color: C.ink3, fontSize: 18 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: `5px solid ${C.line}`, borderTopColor: C.s1, transform: `rotate(${f * 14}deg)` }} />
            Загрузка…
          </div>
        </Widget>
      )}
      {/* Ошибка импорта */}
      {f >= 60 && (
        <div style={{
          position: "absolute", right: 28, bottom: 28, width: 470, ...cardStyle, borderRadius: 16, borderLeft: `6px solid ${C.bad}`,
          padding: "16px 20px", boxShadow: "0 18px 40px rgba(22,21,26,0.16)",
          transform: `translateY(${(1 - pop(f, 60, 12, 220)) * 120}px)`, zIndex: 5,
        }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>instagram_export_final_v3 (2).csv</div>
          <div style={{ fontSize: 16, color: C.bad, marginTop: 4 }}>Ошибка импорта: неверный разделитель</div>
        </div>
      )}
      {!dropped && f > 10 && (
        <div style={{ position: "absolute", left: gx, top: gy, width: 200, padding: "12px 14px", ...cardStyle, borderRadius: 12, boxShadow: "0 16px 30px rgba(22,21,26,0.18)", fontSize: 18, transform: "rotate(-3deg)", zIndex: 6 }}>
          Линейный график
        </div>
      )}
      <Cursor
        f={f}
        path={[[0, 700, 500], [4, 60, top + 128], [12, 60, top + 128], [16, s0.left + 60, s0.top + 60], [52, 900, vh - 110], [66, s0.left + 400, s0.top + 90], [80, 780, 300], [94, 380, vh - 200], [108, 1000, 200]]}
        clicks={[10, 46, 62, 82, 96]}
      />
    </div>
  );
}

function Tab({ label, active }: { label: string; active?: boolean }) {
  return (
    <div style={{ padding: "10px 16px", borderRadius: 10, background: active ? C.bg : "transparent", fontSize: 18, fontWeight: 600, color: active ? C.ink : C.ink3, whiteSpace: "nowrap", border: active ? `1px solid ${C.line}` : "1px dashed #d8d7dc" }}>
      {label}
    </div>
  );
}

function Btn({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 17, color: C.ink2, whiteSpace: "nowrap" }}>{children}</div>;
}

function Widget({ rect, title, f, at, tilt = 0, offset = [0, 0], children }: { rect: React.CSSProperties; title: string; f: number; at: number; tilt?: number; offset?: [number, number]; children: React.ReactNode }) {
  const p = pop(f, at, 10, 220);
  return (
    <div style={{
      position: "absolute", ...rect, ...cardStyle, borderRadius: 18, padding: 20, overflow: "hidden",
      boxShadow: "0 10px 26px rgba(22,21,26,0.08)",
      transform: `translate(${offset[0]}px, ${offset[1]}px) rotate(${tilt}deg) scale(${0.7 + 0.3 * p})`, opacity: Math.min(1, p * 2),
    }}>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

// ——— Livedune: все соцсети уже подключены ———

export const LIVEDUNE_W = 720;

export function LiveduneCard({ f, vh }: P) {
  const count = Math.round(interpolate(f, [186, 212], [0, 9], clamp));
  return (
    <div style={{ position: "absolute", inset: 0, padding: 44, display: "flex", flexDirection: "column", justifyContent: "center", gap: 34 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 48, letterSpacing: "-0.03em" }}>Livedune</div>
        <div style={{ padding: "6px 14px", borderRadius: 999, background: "#e3f3ea", color: C.good, fontSize: 19, fontWeight: 600, opacity: ease(f, 212, 220) }}>● подключено</div>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {NETS.map((n, i) => {
          const p = pop(f, 186 + i * 3, 10, 220);
          return (
            <div key={n.slug} style={{ transform: `translateY(${(1 - p) * (vh * 0.6)}px) scale(${0.4 + 0.6 * p})` }}>
              <NetIcon net={n} size={62} />
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 28, color: C.ink2, fontWeight: 500 }}>
        2 проекта · <span style={{ color: C.ink, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{count}</span> аккаунтов
      </div>
    </div>
  );
}

// ——— Чат с ИИ-агентом ———

export const CHAT_W = 1100;
const MSG = "Установи Дашкрафт: github.com/nosenss/dashcraft\nМой ключ Livedune: ••••••••••••••••";
const STEPS = ["Скачал Дашкрафт", "Проверил ключ Livedune", "Нашёл 2 проекта и 9 аккаунтов", "Запустил дашборд"];
const SEND = 305;

export function Chat({ f, vh }: P) {
  const typed = Math.floor(interpolate(f, [250, 300], [0, MSG.length], clamp));
  const sent = f >= SEND;
  const bubble = pop(f, SEND, 14, 170);
  const inputH = 150;
  return (
    <div style={{ position: "absolute", inset: 0, background: C.surface }}>
      <div style={{ height: 84, borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 16, padding: "0 32px" }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${C.s1}, ${C.s1Dark})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>✦</div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>ИИ-агент</div>
          <div style={{ fontSize: 17, color: C.ink3 }}>работает на вашем компьютере</div>
        </div>
      </div>
      {/* Лента сообщений */}
      <div style={{ position: "absolute", left: 32, right: 32, top: 110, bottom: inputH + 20, display: "flex", flexDirection: "column", gap: 22 }}>
        {sent && (
          <div style={{ alignSelf: "flex-end", maxWidth: 760, background: C.s1, color: "#fff", borderRadius: "26px 26px 8px 26px", padding: "20px 26px", fontSize: 25, lineHeight: 1.4, whiteSpace: "pre-wrap", transform: `translateY(${(1 - bubble) * 200}px) scale(${0.9 + 0.1 * bubble})`, transformOrigin: "right bottom", opacity: Math.min(1, bubble * 2) }}>
            {MSG}
          </div>
        )}
        {f >= 314 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, ...cardStyle, borderRadius: "26px 26px 26px 8px", padding: "22px 26px", maxWidth: 720, opacity: pop(f, 314), transform: `translateY(${(1 - pop(f, 314)) * 40}px)` }}>
            {STEPS.map((s, i) => {
              const at = 320 + i * 15;
              if (f < at) return null;
              const done = f >= at + 8;
              const check = pop(f, at + 8, 9, 240);
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 25, fontWeight: 500, opacity: ease(f, at, at + 5), color: done ? C.ink : C.ink2 }}>
                  {done ? (
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.good, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, transform: `scale(${check})` }}>✓</div>
                  ) : (
                    <div style={{ width: 34, height: 34, borderRadius: "50%", border: `4px solid ${C.line}`, borderTopColor: C.s1, transform: `rotate(${f * 24}deg)` }} />
                  )}
                  {s}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Поле ввода */}
      <div style={{ position: "absolute", left: 32, right: 32, bottom: 28, height: inputH - 28, ...cardStyle, borderRadius: 26, background: C.bg, display: "flex", alignItems: "center", padding: "0 26px", gap: 20 }}>
        <div style={{ flex: 1, fontSize: 24, lineHeight: 1.4, color: sent || typed === 0 ? C.ink3 : C.ink, whiteSpace: "pre-wrap" }}>
          {sent || typed === 0 ? "Напишите сообщение…" : MSG.slice(0, typed)}
          {!sent && typed > 0 && <span style={{ color: C.s1, opacity: Math.floor(f / 8) % 2 ? 1 : 0.2 }}>|</span>}
        </div>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: typed > 0 && !sent ? C.s1 : C.line, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, flexShrink: 0 }}>↑</div>
      </div>
      <Cursor f={f} path={[[276, 900, vh - 30], [284, 900, vh - 30], [290, CHAT_W - 112, vh - 96]]} clicks={[SEND]} />
    </div>
  );
}

// ——— Дашборд ———

export const DASH_W = 1200;
const TABS = [
  { label: "Все сети", w: 128 },
  { label: "Instagram", w: 170, net: 0 },
  { label: "Telegram", w: 190, net: 1, n: 3 },
  { label: "ВКонтакте", w: 210, net: 2, n: 2 },
  { label: "YouTube", w: 160, net: 3 },
  { label: "TikTok", w: 140, net: 4 },
  { label: "Дзен", w: 120, net: 5 },
];
const TAB_CLICK = 450;
const tabX = (i: number) => 28 + TABS.slice(0, i).reduce((s, t) => s + t.w, 0);

export function Dashboard({ f, vh }: P) {
  const head = 40 + 44 + 76 + 62;
  // Индикатор вкладки: передний край быстрее заднего — растягивается
  const lead = track(f, [[0, tabX(0) + TABS[0].w], [TAB_CLICK, tabX(1) + TABS[1].w]], 16, 260, 0.5);
  const trailL = track(f, [[0, tabX(0)], [TAB_CLICK + 2, tabX(1)]], 20, 120, 0.8);
  const insta = ease(f, TAB_CLICK, TAB_CLICK + 8);
  const scroll = track(f, [[0, 0], [510, 300], [570, 760]], 20, 90, 0.9);
  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg, overflow: "hidden" }}>
      {/* Окно браузера: дашборд открыт локально */}
      <div style={{ height: 40, background: C.surface, borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 8, padding: "0 16px" }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 13, height: 13, borderRadius: "50%", background: c }} />)}
        <div style={{ marginLeft: 16, padding: "4px 18px", borderRadius: 8, background: C.bg, fontSize: 16, color: C.ink2 }}>localhost:3000</div>
      </div>
      <div style={{ height: 44, background: C.ink, color: "#fff", fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center" }}>
        Демо Дашкрафта: проекты и все цифры вымышленные
      </div>
      <div style={{ height: 76, display: "flex", alignItems: "center", padding: "0 28px", gap: 10, background: C.surface }}>
        <div style={{ ...cardStyle, borderRadius: 999, padding: "10px 20px", fontSize: 19, fontWeight: 600 }}>Все проекты ▾</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {["7 дней", "30 дней", "90 дней", "Этот месяц"].map((l) => (
            <div key={l} style={{ padding: "10px 18px", borderRadius: 999, fontSize: 17, background: l === "30 дней" ? C.ink : C.surface, color: l === "30 дней" ? "#fff" : C.ink2, border: `1px solid ${l === "30 дней" ? C.ink : C.line}` }}>{l}</div>
          ))}
        </div>
      </div>
      <div style={{ height: 62, position: "relative", display: "flex", alignItems: "center", paddingLeft: 28, background: C.surface, borderBottom: `1px solid ${C.line}` }}>
        {TABS.map((t, i) => (
          <div key={t.label} style={{ width: t.w, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 19, fontWeight: 500, color: (i === 0 ? 1 - insta : i === 1 ? insta : 0) > 0.5 ? C.ink : C.ink2 }}>
            {t.net !== undefined && <NetIcon net={NETS[t.net]} size={24} />}
            {t.label}
            {t.n && <span style={{ fontSize: 14, background: C.bg, borderRadius: 999, padding: "1px 8px", color: C.ink2 }}>{t.n}</span>}
          </div>
        ))}
        <div style={{ position: "absolute", bottom: 0, height: 4, borderRadius: 2, background: C.ink, left: Math.min(trailL, lead - 40), width: Math.max(40, lead - trailL) }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: head, bottom: 0, overflow: "hidden" }}>
        {insta < 1 && (
          <div style={{ position: "absolute", inset: 0, opacity: 1 - insta, filter: insta > 0 ? `blur(${insta * 10}px)` : undefined }}>
            <OverviewBody f={f} />
          </div>
        )}
        {insta > 0 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: -scroll, opacity: insta, filter: insta < 1 ? `blur(${(1 - insta) * 10}px)` : undefined }}>
            <InstagramBody f={f} />
          </div>
        )}
      </div>
      <Cursor f={f} path={[[412, 900, vh + 40], [420, 700, vh - 150], [436, tabX(1) + 80, head - 26], [462, 820, 420], [505, 760, 520], [565, 760, 520]]} clicks={[TAB_CLICK]} />
    </div>
  );
}

function Counter({ f, at, to, render }: { f: number; at: number; to: number; render: (v: number) => string }) {
  return <>{render(to * ease(f, at, at + 36, Easing.out(Easing.poly(5))))}</>;
}

function OverviewBody({ f }: { f: number }) {
  const kpis = [
    { k: "Подписчики", to: 125332, r: (v: number) => fmt(v), d: "+1 513" },
    { k: "Просмотры постов", to: 2.8, r: (v: number) => `${fmt(v, 1)} млн`, d: "14,6%" },
    { k: "Реакции на посты", to: 183549, r: (v: number) => fmt(v), d: "6,3%" },
    { k: "Публикаций", to: 184, r: (v: number) => fmt(v), d: "2,8%" },
  ];
  const accs = [
    { net: 0, name: "Кофейня «Зерно»", v: 28397, d: "+264" },
    { net: 1, name: "Зерно · кофе и люди", v: 10170, d: "+140" },
    { net: 2, name: "Пекарня «Мука»", v: 41820, d: "+612" },
  ];
  return (
    <div style={{ padding: "30px 28px" }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 44, letterSpacing: "-0.02em", opacity: pop(f, 396) }}>Все соцсети</div>
      <div style={{ fontSize: 18, color: C.ink3, marginTop: 4 }}>1 сен — 30 сен 2026, сравниваем с августом</div>
      <div style={{ ...cardStyle, marginTop: 22, padding: "26px 30px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, transform: `translateY(${(1 - pop(f, 396, 16)) * 60}px)` }}>
        {kpis.map((k, i) => (
          <div key={k.k}>
            <div style={{ fontSize: 18, color: C.ink2 }}>{k.k}</div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 44, fontVariantNumeric: "tabular-nums", marginTop: 4 }}>
              <Counter f={f} at={398 + i * 4} to={k.to} render={k.r} />
            </div>
            <div style={{ marginTop: 4, opacity: pop(f, 416 + i * 4) }}><Delta text={k.d} /></div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginTop: 20 }}>
        {accs.map((a, i) => {
          const p = pop(f, 408 + i * 5, 15);
          return (
            <div key={a.name} style={{ ...cardStyle, padding: 22, transform: `translateY(${(1 - p) * 80}px)`, opacity: Math.min(1, p * 2) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <NetIcon net={NETS[a.net]} size={40} />
                <div style={{ fontSize: 19, fontWeight: 600 }}>{a.name}</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 14 }}>
                <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 36 }}>{fmt(a.v)}</span>
                <Delta text={a.d} size={16} />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 70, marginTop: 14 }}>
                {Array.from({ length: 22 }, (_, j) => (
                  <div key={j} style={{ flex: 1, borderRadius: 3, background: C.s1, height: (0.2 + noise(j, i + 7) * 0.8) * 70 * pop(f, 414 + i * 4 + j * 0.6, 12, 200) }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const N = 30;
const CUR = Array.from({ length: N }, (_, i) => 28133 + (264 * i) / (N - 1) + (noise(i, 1) - 0.5) * 14);
const PREV = Array.from({ length: N }, (_, i) => 27983 + (150 * i) / (N - 1) + (noise(i, 2) - 0.5) * 12);
const POSTS = [
  { t: "Рецепт домашней воронки", type: "Reels", v: 40191 },
  { t: "Бизнес-ланч теперь до 16:00", type: "Reels", v: 26120 },
  { t: "Новая обжарка: Эфиопия", type: "Reels", v: 23943 },
  { t: "Как мы выбираем зерно", type: "Фото", v: 22751 },
  { t: "Открываем третью точку", type: "Reels", v: 22579 },
];

function InstagramBody({ f }: { f: number }) {
  const funnel = [
    { k: "Подписчики", v: "28 397", d: "+264" },
    { k: "Просмотры", v: "389,6 тыс.", d: "0,9%", conv: "54,9%" },
    { k: "Охват", v: "310,5 тыс.", d: "1,2%", conv: "79,7%" },
    { k: "Реакции", v: "28 613", d: "11,6%", conv: "9,2%" },
    { k: "ER", v: "4,03%", d: "+0,23 п.п.", conv: "" },
  ];
  // График
  const cw = 1080, ch = 230, lo = 27960, hi = 28430;
  const px = (i: number) => (i / (N - 1)) * cw;
  const py = (v: number) => ch - ((v - lo) / (hi - lo)) * ch;
  const path = (a: number[]) => a.map((v, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const draw = ease(f, 506, 548, Easing.inOut(Easing.cubic));
  const maxW = 640, MED = 17100;
  return (
    <div style={{ padding: "28px 28px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <NetIcon net={NETS[0]} size={60} />
        <div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 42, letterSpacing: "-0.02em" }}>Instagram</div>
          <div style={{ fontSize: 18, color: C.ink2 }}>Кофейня «Зерно» · 1–30 сен 2026</div>
        </div>
      </div>
      {/* Воронка, как в приложении: карточки со стрелками и конверсиями между ними */}
      <div style={{ display: "flex", alignItems: "center", marginTop: 26, height: 150 }}>
        {funnel.map((s, i) => {
          const p = pop(f, 456 + i * 4, 13, 200);
          return (
            <React.Fragment key={s.k}>
              {i > 0 && (
                <div style={{ width: 52, textAlign: "center", fontSize: 14, fontWeight: 600, color: C.ink2, opacity: pop(f, 466 + i * 4) }}>
                  <div style={{ fontSize: 22, color: C.ink3 }}>›</div>
                  {s.conv}
                </div>
              )}
              <div style={{ ...cardStyle, width: 180, height: 150, padding: "18px 18px", borderRadius: 20, transform: `translateY(${(1 - p) * 70}px) scale(${0.85 + 0.15 * p})`, opacity: Math.min(1, p * 2) }}>
                <div style={{ fontSize: 16, color: C.ink2 }}>{s.k}</div>
                <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 30, marginTop: 8, whiteSpace: "nowrap" }}>{s.v}</div>
                <div style={{ marginTop: 8 }}><Delta text={s.d} size={16} /></div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      {/* Аудитория */}
      <div style={{ ...cardStyle, marginTop: 30, padding: "26px 30px", height: 430 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontSize: 22, fontWeight: 600 }}>Подписчики</span>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 36 }}>28 397</span>
          <Delta text="+264 за период" />
          <span style={{ marginLeft: "auto", fontSize: 16, color: C.ink3 }}><b style={{ color: C.s1 }}>━</b> сентябрь &nbsp; <b style={{ color: C.prev }}>┅</b> август</span>
        </div>
        <svg width={cw} height={ch + 10} style={{ marginTop: 24, overflow: "visible" }}>
          {[0, 1, 2, 3].map((g) => <line key={g} x1={0} x2={cw} y1={(g * ch) / 3} y2={(g * ch) / 3} stroke={C.grid} strokeWidth={2} />)}
          <path d={path(PREV)} fill="none" stroke={C.prev} strokeWidth={4} strokeDasharray="10 10" opacity={ease(f, 500, 512)} />
          <defs>
            <linearGradient id="dashFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.s1} stopOpacity={0.22} />
              <stop offset="100%" stopColor={C.s1} stopOpacity={0} />
            </linearGradient>
            <clipPath id="dashReveal"><rect x={0} y={-20} width={cw * draw} height={ch + 40} /></clipPath>
          </defs>
          <path d={`${path(CUR)} L${cw},${ch} L0,${ch} Z`} fill="url(#dashFill)" clipPath="url(#dashReveal)" />
          <path d={path(CUR)} fill="none" stroke={C.s1} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1000} strokeDasharray={1000} strokeDashoffset={1000 * (1 - draw)} />
          <circle cx={px(N - 1)} cy={py(CUR[N - 1])} r={11 * pop(f, 546)} fill={C.surface} stroke={C.s1} strokeWidth={5} />
        </svg>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 70, marginTop: 16 }}>
          {Array.from({ length: N }, (_, i) => (
            <div key={i} style={{ flex: 1, borderRadius: 4, background: i === 5 ? C.s1Dark : C.s1, height: (0.2 + noise(i, 3) * 0.8) * 70 * pop(f, 516 + i, 12, 200) }} />
          ))}
        </div>
      </div>
      {/* Лучшие посты */}
      <div style={{ ...cardStyle, marginTop: 30, padding: "26px 30px 40px" }}>
        <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 44 }}>Топ постов по просмотрам</div>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: (MED / POSTS[0].v) * maxW, top: -34, bottom: -6, borderLeft: `3px dashed ${C.ink3}`, opacity: ease(f, 592, 604) }} />
          <div style={{ position: "absolute", left: (MED / POSTS[0].v) * maxW + 10, top: -36, fontSize: 16, color: C.ink3, fontWeight: 600, opacity: ease(f, 592, 604), whiteSpace: "nowrap" }}>обычный пост · {fmt(MED)}</div>
          {POSTS.map((p, i) => {
            const g = ease(f, 572 + i * 4, 598 + i * 4, Easing.out(Easing.poly(5)));
            return (
              <div key={p.t} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{ width: maxW + 120, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ height: 40, width: Math.max(8, (p.v / POSTS[0].v) * maxW * g), borderRadius: 10, background: i === 0 ? C.s1 : C.s1Light }} />
                  <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 24, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{fmt(p.v * g)}</span>
                </div>
                <span style={{ fontSize: 14, color: C.ink2, background: C.bg, borderRadius: 6, padding: "2px 8px" }}>{p.type}</span>
                <span style={{ fontSize: 19, whiteSpace: "nowrap" }}>{p.t}</span>
              </div>
            );
          })}
          <div style={{ position: "absolute", left: maxW - 170, top: -8, background: C.good, color: "#fff", borderRadius: 999, padding: "6px 16px", fontSize: 20, fontWeight: 700, transform: `scale(${pop(f, 596, 9, 220)})`, whiteSpace: "nowrap" }}>×2,3 к обычному</div>
        </div>
      </div>
    </div>
  );
}

// ——— Финал: сообщение для установки ———

export const INSTALL_W = 900;
const INSTALL = [
  { t: "Установи Дашкрафт у меня на компьютере:" },
  { t: "github.com/nosenss/dashcraft", c: C.s1 },
  { t: "Действуй по инструкции из AGENTS.md." },
  { t: "Мой ключ Livedune: ", key: "ВСТАВЬТЕ_КЛЮЧ" },
];
const COPY = 692;

export function InstallBox({ f, vh }: P) {
  const copied = f >= COPY;
  return (
    <div style={{ position: "absolute", inset: 0, background: C.surface, padding: "34px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 21, color: C.ink3, fontWeight: 500 }}>Сообщение для ИИ-агента</div>
        <div style={{ marginLeft: "auto", padding: "12px 22px", borderRadius: 999, background: copied ? C.good : C.s1, color: "#fff", fontSize: 21, fontWeight: 600, transform: `scale(${copied ? 0.94 + 0.06 * pop(f, COPY, 8, 260) : 1})` }}>
          {copied ? "✓ Скопировано" : "Скопировать"}
        </div>
      </div>
      <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 12 }}>
        {INSTALL.map((l, i) => {
          const a = ease(f, 640 + i * 5, 650 + i * 5);
          return (
            <div key={i} style={{ fontSize: 34, lineHeight: 1.3, fontWeight: 500, color: l.c ?? C.ink, opacity: a, transform: `translateX(${(1 - a) * -24}px)` }}>
              {l.t}
              {l.key && <span style={{ background: "#fff1c2", borderRadius: 8, padding: "0 10px", fontWeight: 600 }}>{l.key}</span>}
            </div>
          );
        })}
      </div>
      <Cursor f={f} path={[[664, INSTALL_W - 60, vh + 40], [672, INSTALL_W - 100, vh - 60], [680, INSTALL_W - 130, 62]]} clicks={[COPY]} />
    </div>
  );
}
