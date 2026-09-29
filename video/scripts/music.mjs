// Музыка и звуки к ролику, синтез в коде. Удары и эффекты берутся из src/timeline.json,
// поэтому попадают ровно в кадры. Запуск: node scripts/music.mjs → public/music.raw.wav
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const TL = JSON.parse(readFileSync(new URL("../src/timeline.json", import.meta.url)));
const SR = 48000;
const LEN = TL.duration / TL.fps + 0.8;
const N = Math.ceil(LEN * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const BEAT = 60 / TL.bpm;
const sec = (frame) => frame / TL.fps;

let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);

function add(t0, dur, fn, gain = 1, pan = 0) {
  const s0 = Math.floor(t0 * SR);
  const n = Math.floor(dur * SR);
  const gl = gain * Math.min(1, 1 - pan), gr = gain * Math.min(1, 1 + pan);
  for (let i = 0; i < n && s0 + i < N; i++) {
    if (s0 + i < 0) continue;
    const v = fn(i / SR, i);
    L[s0 + i] += v * gl;
    R[s0 + i] += v * gr;
  }
}

// ——— Инструменты ———

const kick = (t0, g = 1) => {
  let ph = 0;
  add(t0, 0.45, (t) => {
    const f = 48 + 110 * Math.exp(-t * 28);
    ph += (2 * Math.PI * f) / SR;
    return Math.tanh(Math.sin(ph) * 1.6) * Math.exp(-t * 7) + (t < 0.004 ? rnd() * 0.3 : 0);
  }, 0.9 * g);
};

const hat = (t0, g = 1, open = false) => {
  let lp = 0;
  add(t0, open ? 0.25 : 0.06, (t) => {
    const x = rnd();
    lp += 0.6 * (x - lp);
    return (x - lp) * Math.exp(-t * (open ? 14 : 70));
  }, 0.22 * g, 0.2);
};

const clap = (t0, g = 1) => {
  let lp = 0, hp = 0;
  add(t0, 0.3, (t) => {
    const x = rnd();
    lp += 0.35 * (x - lp);
    hp = lp - hp * 0.2;
    const burst = t < 0.03 ? 0.6 + 0.4 * Math.sin(t * 900) : 1;
    return hp * burst * Math.exp(-t * 16);
  }, 0.5 * g, -0.1);
};

const bass = (t0, dur, note, g = 1) => {
  let lp = 0, ph = 0;
  const f = midi(note);
  add(t0, dur, (t) => {
    ph += f / SR;
    const saw = 2 * (ph % 1) - 1;
    lp += (0.08 + 0.12 * Math.exp(-t * 10)) * (saw - lp);
    return lp * Math.min(1, t * 200) * Math.min(1, (dur - t) * 40);
  }, 0.55 * g);
};

const pad = (t0, dur, notes, g = 1, bright = 0.03) => {
  const phs = notes.flatMap(() => [0, 0, 0]);
  let lp = 0;
  add(t0, dur, (t) => {
    let s = 0;
    notes.forEach((n, k) => {
      [-0.08, 0, 0.08].forEach((det, j) => {
        const idx = k * 3 + j;
        phs[idx] += midi(n + det) / SR;
        s += 2 * (phs[idx] % 1) - 1;
      });
    });
    lp += bright * (s - lp);
    const env = Math.min(1, t / 0.25) * Math.min(1, (dur - t) / 0.3);
    return (lp / (notes.length * 3)) * env;
  }, 0.5 * g);
};

const pluck = (t0, note, g = 1, pan = 0) => {
  let ph = 0;
  const f = midi(note);
  add(t0, 0.35, (t) => {
    ph += f / SR;
    const tri = 1 - 4 * Math.abs((ph % 1) - 0.5);
    return tri * Math.exp(-t * 12);
  }, 0.16 * g, pan);
};

const tick = (t0, g = 1) => add(t0, 0.03, (t) => Math.sin(2 * Math.PI * 2600 * t) * Math.exp(-t * 160), 0.18 * g, 0.3);

// ——— Эффекты ———

const SFX = {
  thump: (t) => kick(t, 0.8),
  slam: (t) => { kick(t, 1.1); clap(t, 1.2); add(t, 0.4, (x) => rnd() * Math.exp(-x * 10), 0.12); },
  stop: (t) => {
    kick(t, 1.2);
    // Пластинка тормозит: падающий тон
    let ph = 0;
    add(t, 0.5, (x) => { ph += (220 * (1 - x * 1.8)) / SR; return Math.sin(2 * Math.PI * ph) * Math.exp(-x * 5); }, 0.25);
  },
  whoosh: (t) => {
    let lp = 0;
    add(t - 0.12, 0.45, (x) => {
      const c = 0.02 + 0.3 * Math.sin(Math.PI * Math.min(1, x / 0.45));
      lp += c * (rnd() - lp);
      return lp * Math.sin(Math.PI * Math.min(1, x / 0.45));
    }, 0.9);
  },
  pop: (t) => {
    let ph = 0;
    add(t, 0.12, (x) => { ph += (500 + 1400 * x * 8) / SR; return Math.sin(2 * Math.PI * ph) * Math.exp(-x * 34); }, 0.2);
  },
  click: (t) => add(t, 0.04, (x) => (Math.sin(2 * Math.PI * 1900 * x) * 0.6 + rnd() * 0.4) * Math.exp(-x * 120), 0.35),
  impact: (t) => {
    kick(t, 1.3);
    let lp = 0;
    add(t, 1.6, (x) => { lp += 0.05 * (rnd() - lp); return lp * Math.exp(-x * 2.5); }, 0.5);
    let ph = 0;
    add(t, 1.2, (x) => { ph += 45 / SR; return Math.sin(2 * Math.PI * ph) * Math.exp(-x * 2.2); }, 0.4);
  },
  riser: (t) => {
    const dur = sec(240) - t;
    let lp = 0, ph = 0;
    add(t, dur, (x) => {
      const k = x / dur;
      lp += (0.01 + 0.25 * k * k) * (rnd() - lp);
      ph += (200 + 700 * k * k) / SR;
      return (lp * 0.7 + Math.sin(2 * Math.PI * ph) * 0.12) * k * k;
    }, 0.5);
  },
  chime: (t) => {
    [72, 76, 79, 84].forEach((n, i) => {
      let ph = 0;
      add(t + i * 0.05, 1.6, (x) => { ph += midi(n) / SR; return Math.sin(2 * Math.PI * ph) * Math.exp(-x * 3); }, 0.12);
    });
  },
};

// ——— Аранжировка ———

// Акт 1 (0–4 с): тревожный гул в ля миноре и тиканье часов
pad(0, sec(120) + 0.1, [45, 52, 57, 60], 0.9, 0.012);
for (let b = 0; b < 8; b++) tick(b * BEAT + BEAT / 2, 0.8);

// 6–8 с: разгон — бочка, дробь хлопков, фильтр открывается
for (let b = 0; b < 4; b++) {
  const t = sec(180) + b * BEAT;
  kick(t, 0.5 + b * 0.12);
  for (let s = 0; s < (b < 2 ? 2 : 4); s++) clap(t + (s * BEAT) / (b < 2 ? 2 : 4), 0.25 + b * 0.1);
}
pad(sec(180), sec(60), [48, 55, 60, 64], 0.6, 0.02);

// 8–21 с: основной грув, I–V–vi–IV в до мажоре
const CHORDS = [
  { root: 36, notes: [60, 64, 67, 72] },
  { root: 43, notes: [59, 62, 67, 71] },
  { root: 45, notes: [57, 60, 64, 69] },
  { root: 41, notes: [57, 60, 65, 69] },
];
const g0 = sec(240), g1 = sec(630);
const beats = Math.round((g1 - g0) / BEAT);
for (let b = 0; b < beats; b++) {
  const t = g0 + b * BEAT;
  const ch = CHORDS[Math.floor(b / 4) % 4];
  kick(t);
  if (b % 2 === 1) clap(t, 0.9);
  hat(t + BEAT / 2, 1);
  hat(t + BEAT / 4, 0.35);
  hat(t + (3 * BEAT) / 4, 0.35);
  bass(t, BEAT / 2 - 0.02, ch.root, 1);
  bass(t + BEAT / 2, BEAT / 2 - 0.02, ch.root + 12, 0.7);
  if (b % 4 === 0) pad(t, BEAT * 4, ch.notes, 0.55, 0.035);
  // С появлением дашборда добавляются переливы
  if (t >= sec(390) - 0.01) {
    for (let s = 0; s < 4; s++) pluck(t + (s * BEAT) / 4, ch.notes[(s + b) % 4] + 12, s === 0 ? 1.2 : 0.8, s % 2 ? 0.35 : -0.35);
  }
}

// 21–24 с: финальный аккорд и хвост
pad(g1, LEN - g1, [48, 60, 64, 67, 72], 0.8, 0.04);
bass(g1, 2.2, 36, 1);
for (let s = 0; s < 8; s++) pluck(g1 + s * BEAT / 2, [72, 76, 79, 84][s % 4], 0.9 - s * 0.08, s % 2 ? 0.3 : -0.3);

// Ducking: музыка приседает под бочку и удары — классический «насос»
const duckTimes = [];
for (let b = 0; b < beats; b++) duckTimes.push(g0 + b * BEAT);
for (const [f, type] of TL.cues) if (type === "impact" || type === "slam" || type === "stop") duckTimes.push(sec(f));
// Применяем до добавления эффектов, чтобы щелчки и удары звучали в полную силу
const duck = new Float32Array(N).fill(1);
for (const t of duckTimes) {
  const s0 = Math.floor(t * SR);
  for (let i = 0; i < 0.22 * SR && s0 + i < N; i++) duck[s0 + i] = Math.min(duck[s0 + i], 0.45 + 0.55 * (i / (0.22 * SR)));
}
// Приседание мягкое (до 78%), поэтому сама бочка почти не теряет удар
for (let i = 0; i < N; i++) { L[i] *= 0.6 + 0.4 * duck[i]; R[i] *= 0.6 + 0.4 * duck[i]; }

// Тишина после «Хватит»: обрезаем всё между стопом и разгоном, кроме хвоста удара
{
  const a = Math.floor((sec(120) + 0.5) * SR), b = Math.floor(sec(178) * SR);
  for (let i = a; i < b; i++) { const k = Math.max(0, 1 - (i - a) / (0.4 * SR)); L[i] *= k; R[i] *= k; }
}

// Печать сообщения: щелчки клавиш
const [ty0, ty1] = TL.typing;
for (let fr = ty0; fr < ty1; fr += 2) {
  const t = sec(fr) + rnd() * 0.01;
  add(t, 0.025, (x) => (rnd() * 0.5 + Math.sin(2 * Math.PI * 3200 * x) * 0.5) * Math.exp(-x * 220), 0.12, rnd() * 0.3);
}
for (const [f, type] of TL.cues) SFX[type]?.(sec(f));

// Затухание в конце
const fade = Math.floor(0.6 * SR);
for (let i = 0; i < fade; i++) { const k = i / fade; L[N - 1 - i] *= k; R[N - 1 - i] *= k; }

// ——— Запись WAV, 16 бит стерео ———
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = 0.89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVEfmt ", 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.tanh(L[i] * norm * 1.1) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.tanh(R[i] * norm * 1.1) * 32767), 46 + i * 4);
}
mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/music.raw.wav", import.meta.url), buf);
console.log(`music.raw.wav: ${LEN.toFixed(1)} с, пик ${peak.toFixed(2)}`);
