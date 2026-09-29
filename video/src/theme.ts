import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { Easing, interpolate, spring } from "remotion";

// Цвета и шрифты — те же, что в app/globals.css дашборда
export const C = {
  bg: "#f4f4f6",
  surface: "#ffffff",
  line: "#e7e6ea",
  grid: "#efeef1",
  ink: "#16151a",
  ink2: "#55535c",
  ink3: "#8c8a93",
  s1: "#2a78d6",
  s1Light: "#a4c8f2",
  s1Dark: "#104281",
  prev: "#b4b2ba",
  good: "#13824a",
  bad: "#d23b3a",
};

export const FPS = 30;

const inter = loadInter("normal", { weights: ["400", "500", "600"], subsets: ["latin", "cyrillic"] });
const manrope = loadManrope("normal", { weights: ["500", "700", "800"], subsets: ["latin", "cyrillic"] });
export const SANS = inter.fontFamily;
export const DISPLAY = manrope.fontFamily;

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Упругое появление: 0 → 1
export const pop = (frame: number, delay = 0, damping = 14, stiffness = 160) =>
  spring({ frame: frame - delay, fps: FPS, config: { damping, stiffness, mass: 0.6 } });

// Плавный переход 0 → 1 за отрезок кадров
export const ease = (frame: number, from: number, to: number, easing = Easing.bezier(0.2, 0.8, 0.2, 1)) =>
  interpolate(frame, [from, to], [0, 1], { ...clamp, easing });

// Русские числа: пробел между разрядами, запятая в дробях
export const fmt = (n: number, digits = 0) =>
  n.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace(/ /g, " ");

// Значение с несколькими целями: по пружине на каждую смену, без рывков между ними
export function track(frame: number, keys: [number, number][], damping = 18, stiffness = 120, mass = 0.8) {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (frame < keys[i][0]) break;
    v += (keys[i][1] - keys[i - 1][1]) * spring({ frame: frame - keys[i][0], fps: FPS, config: { damping, stiffness, mass } });
  }
  return v;
}

// Детерминированный шум 0..1
export const noise = (i: number, seed = 0) => {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
