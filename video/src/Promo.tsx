import React from "react";
import { AbsoluteFill, Audio, Easing, interpolateColors, staticFile, useCurrentFrame } from "remotion";
import { BUILDER_W, Builder, CHAT_W, Chat, DASH_W, Dashboard, INSTALL_W, InstallBox, LIVEDUNE_W, LiveduneCard } from "./contents";
import { NETS, NetIcon, Wordmark } from "./icons";
import { type Rect, useLayout } from "./layout";
import { C, DISPLAY, SANS, ease, noise, pop, track } from "./theme";
import TL from "./timeline.json";

export const DURATION = TL.duration;

const CONTENTS: Record<string, { W: number; C: React.FC<{ f: number; vh: number }> }> = {
  builder: { W: BUILDER_W, C: Builder },
  livedune: { W: LIVEDUNE_W, C: LiveduneCard },
  chat: { W: CHAT_W, C: Chat },
  dash: { W: DASH_W, C: Dashboard },
  install: { W: INSTALL_W, C: InstallBox },
};

const IMPACTS = TL.cues.filter(([, t]) => t === "impact" || t === "slam").map(([f]) => f as number);

export function Promo() {
  const f = useCurrentFrame();
  // Камера: медленный наезд и толчок на каждом ударе
  let punch = 0;
  for (const i of IMPACTS) if (f >= i) punch += 0.022 * Math.exp(-(f - i) / 5);
  const push = 1 + f * 0.00004;
  return (
    <AbsoluteFill style={{ fontFamily: SANS, color: C.ink }}>
      <Backdrop f={f} />
      <AbsoluteFill style={{ transform: `scale(${push + punch})` }}>
        <Window f={f} />
        <Captions f={f} />
        <Finale f={f} />
      </AbsoluteFill>
      <Audio src={staticFile("music.wav")} />
    </AbsoluteFill>
  );
}

// Фон: серый и тесный в «боли», светлеет, когда появляется решение
function Backdrop({ f }: { f: number }) {
  const { width, height } = useLayout();
  const bg = interpolateColors(f, [110, 200], ["#e4e3e8", C.bg]);
  const glow = ease(f, 150, 260);
  const blob = (x: number, y: number, r: number, a: number, ph: number) => (
    <div style={{ position: "absolute", left: x + Math.sin(f / 50 + ph) * 60 - r, top: y + Math.cos(f / 60 + ph) * 50 - r, width: r * 2, height: r * 2, borderRadius: "50%", background: `radial-gradient(circle, rgba(42,120,214,${a}) 0%, transparent 70%)` }} />
  );
  return (
    <AbsoluteFill style={{ background: bg }}>
      {blob(width * 0.85, height * 0.15, 460, 0.14 * glow, 0)}
      {blob(width * 0.1, height * 0.9, 480, 0.1 * glow, 2)}
      {/* Мелкая точечная сетка — фактура вместо пустого градиента */}
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(rgba(22,21,26,0.07) 1.4px, transparent 1.4px)", backgroundSize: "28px 28px" }} />
    </AbsoluteFill>
  );
}

// ——— Окно: одна форма на весь ролик ———

function Window({ f }: { f: number }) {
  const { states } = useLayout();
  const keys = TL.window as [number, string][];
  const comp = (k: keyof Rect) => track(f, keys.map(([t, s]) => [t, states[s][k]] as [number, number]), 17, 110, 0.9);
  const rect: Rect = { x: comp("x"), y: comp("y"), w: comp("w"), h: comp("h") };
  const radius = track(f, [[0, 28], [150, 40], [240, 34], [390, 26], [630, 34]]);
  const intro = pop(f, 0, 14, 200);
  // Тряска, когда всё окончательно ломается
  const shake = f >= 105 && f < 132 ? Math.exp(-(f - 105) / 12) * 10 : 0;
  const sx = (noise(f, 11) - 0.5) * 2 * shake;
  const sy = (noise(f, 12) - 0.5) * 2 * shake;
  return (
    <div
      style={{
        position: "absolute", left: rect.x + sx, top: rect.y + sy, width: rect.w, height: rect.h, borderRadius: radius, overflow: "hidden",
        background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 40px 100px rgba(22,21,26,0.14), 0 8px 24px rgba(22,21,26,0.06)",
        transform: `scale(${0.9 + 0.1 * intro})`, opacity: Math.min(1, intro * 2),
      }}
    >
      {(TL.contents as [string, number, number][]).map(([name, from, to]) => {
        if (f < from || f >= to) return null;
        const def = CONTENTS[name];
        const scale = rect.w / def.W;
        const vh = rect.h / scale;
        const inA = from === 0 ? 1 : ease(f, from + 2, from + 12);
        const outA = to >= TL.duration ? 0 : ease(f, to - 12, to - 2);
        const a = inA * (1 - outA);
        const gray = name === "builder" ? ease(f, 120, 132) : 0;
        return (
          <div key={name} style={{ position: "absolute", left: 0, top: 0, width: def.W, height: vh, transform: `scale(${scale})`, transformOrigin: "0 0", opacity: a, filter: `blur(${(1 - a) * 12}px) grayscale(${gray}) contrast(${1 - gray * 0.15})` }}>
            <def.C f={f} vh={vh} />
          </div>
        );
      })}
    </div>
  );
}

// ——— Подписи: слова влетают в такт ———

type Cap = [number, string, string?];

function Captions({ f }: { f: number }) {
  const { caption, wide } = useLayout();
  const caps = TL.captions as Cap[];
  return (
    <>
      {caps.map(([at, text, kind], i) => {
        const next = caps[i + 1]?.[0] ?? TL.duration;
        if (!text || f < at || f >= next + 8) return null;
        const out = ease(f, next, next + 7, Easing.in(Easing.cubic));
        const slam = kind === "slam";
        const size = wide ? (slam ? 140 : 96) : slam ? 112 : 72;
        let word = 0;
        return (
          <div
            key={at}
            style={{
              position: "absolute", left: caption.x, top: caption.y, width: caption.w, height: caption.h,
              display: "flex", flexDirection: "column", justifyContent: wide ? "center" : "flex-end",
              fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 1.04, letterSpacing: "-0.035em",
              opacity: 1 - out, transform: `translateY(${-40 * out}px)`, filter: out ? `blur(${out * 10}px)` : undefined,
            }}
          >
            {text.split("\n").map((line, li) => (
              <div key={li} style={{ display: "flex", flexWrap: "wrap", columnGap: "0.24em" }}>
                {parse(line).map((w, wi) => {
                  const d = slam ? 0 : 2 + word++ * 2;
                  const p = slam ? pop(f, at, 11, 320) : pop(f, at + d, 13, 220);
                  return (
                    <span
                      key={wi}
                      style={{
                        display: "inline-block", color: w.hi ? C.s1 : C.ink, opacity: Math.min(1, p * 2),
                        transform: slam ? `scale(${1.5 - 0.5 * p}) rotate(${(1 - p) * -4}deg)` : `translateY(${(1 - p) * 60}px)`,
                        transformOrigin: "left center", filter: p < 0.6 ? `blur(${(0.6 - p) * 14}px)` : undefined,
                      }}
                    >
                      {w.t}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

// «Опять *под себя?*» → [{t:"Опять"}, {t:"под", hi}, {t:"себя?", hi}]
function parse(line: string) {
  const out: { t: string; hi: boolean }[] = [];
  let hi = false;
  for (const part of line.split(/(\*)/)) {
    if (part === "*") { hi = !hi; continue; }
    for (const t of part.split(" ").filter(Boolean)) out.push({ t, hi });
  }
  return out;
}

// ——— Финал ———

function Finale({ f }: { f: number }) {
  const { wide, states } = useLayout();
  if (f < 630) return null;
  const m = pop(f, 634, 12);
  const c = pop(f, 642, 13);
  const foot = pop(f, 658, 14);
  const box = states.cta;
  const col: React.CSSProperties = wide
    ? { position: "absolute", left: 110, top: 270, width: 680 }
    : { position: "absolute", left: 90, top: 80, width: 900 };
  return (
    <>
      <div style={col}>
        <div style={{ opacity: Math.min(1, m * 1.5), transform: `translateY(${(1 - m) * 40}px)` }}>
          <Wordmark size={wide ? 128 : 104} />
        </div>
        <div style={{ marginTop: wide ? 34 : 24, fontFamily: DISPLAY, fontWeight: 800, fontSize: wide ? 64 : 54, lineHeight: 1.08, letterSpacing: "-0.03em", opacity: c, transform: `translateY(${(1 - c) * 40}px)` }}>
          Не с нуля.{wide ? <br /> : " "}<span style={{ color: C.s1 }}>Одним сообщением.</span>
        </div>
      </div>
      <div
        style={{
          position: "absolute", left: wide ? 110 : box.x, top: wide ? 640 : box.y + box.h + 40, width: wide ? 680 : box.w,
          display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", opacity: foot, transform: `translateY(${(1 - foot) * 30}px)`,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {NETS.map((n, i) => <div key={n.slug} style={{ transform: `scale(${pop(f, 658 + i * 2, 10, 220)})` }}><NetIcon net={n} size={wide ? 46 : 42} /></div>)}
        </div>
        <div style={{ fontSize: wide ? 26 : 24, color: C.ink2, fontWeight: 500 }}>Бесплатно · открытый код · данные у вас</div>
      </div>
    </>
  );
}
