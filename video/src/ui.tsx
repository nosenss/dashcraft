import React from "react";
import { C, pop, track } from "./theme";

export const cardStyle: React.CSSProperties = {
  background: C.surface, border: `1px solid ${C.line}`, borderRadius: 24,
};

export function Delta({ text, up = true, size = 18 }: { text: string; up?: boolean; size?: number }) {
  return <span style={{ color: up ? C.good : C.bad, fontSize: size, fontWeight: 600, whiteSpace: "nowrap" }}>{up ? "↗" : "↘"} {text}</span>;
}

// Курсор: путь — ключевые точки [кадр, x, y], клики — кадры нажатий
export function Cursor({ f, path, clicks = [], size = 34 }: { f: number; path: [number, number, number][]; clicks?: number[]; size?: number }) {
  const x = track(f, path.map(([t, px]) => [t, px] as [number, number]), 20, 170, 0.7);
  const y = track(f, path.map(([t, , py]) => [t, py] as [number, number]), 20, 170, 0.7);
  const appear = pop(f, path[0][0], 14, 200);
  let press = 0;
  let ripple: React.ReactNode = null;
  for (const c of clicks) {
    const d = f - c;
    if (d >= -3 && d < 6) press = Math.max(press, 1 - Math.abs(d) / 6);
    if (d >= 0 && d < 16) {
      const r = (d / 16) * 44;
      ripple = <div style={{ position: "absolute", left: -r, top: -r, width: r * 2, height: r * 2, borderRadius: "50%", border: `3px solid ${C.s1}`, opacity: 1 - d / 16 }} />;
    }
  }
  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: 50, pointerEvents: "none", transform: `scale(${appear})` }}>
      {ripple}
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `scale(${1 - press * 0.18})`, transformOrigin: "0 0", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.25))" }}>
        <path d="M3 2 L3 19 L7.5 14.8 L10.6 21.6 L13.6 20.3 L10.6 13.7 L17 13.7 Z" fill={C.ink} stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </div>
  );
}
