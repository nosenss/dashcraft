import { siInstagram, siOdnoklassniki, siTelegram, siTiktok, siVk, siYoutube } from "simple-icons";
import { DISPLAY } from "./theme";

// Логотипы — как в components/NetworkIcon.tsx дашборда
const DZEN_PATH = "M12 2.5c.28 5.63 3.87 9.22 9.5 9.5-5.63.28-9.22 3.87-9.5 9.5-.28-5.63-3.87-9.22-9.5-9.5 5.63-.28 9.22-3.87 9.5-9.5Z";

export const NETS = [
  { slug: "instagram", label: "Instagram", path: siInstagram.path, bg: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" },
  { slug: "telegram", label: "Telegram", path: siTelegram.path, bg: "#26A5E4" },
  { slug: "vk", label: "ВКонтакте", path: siVk.path, bg: "#0077FF" },
  { slug: "youtube", label: "YouTube", path: siYoutube.path, bg: "#FF0000" },
  { slug: "tiktok", label: "TikTok", path: siTiktok.path, bg: "#000000" },
  { slug: "dzen", label: "Дзен", path: DZEN_PATH, bg: "#000000" },
  { slug: "ok", label: "Одноклассники", path: siOdnoklassniki.path, bg: "#EE8208" },
  { slug: "rutube", label: "Rutube", path: "", bg: "#100943" },
] as const;

export type Net = (typeof NETS)[number];

export function NetIcon({ net, size }: { net: Net; size: number }) {
  if (!net.path) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: net.bg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontWeight: 800, fontSize: size * 0.5 }}>
        R
      </div>
    );
  }
  const full = net.slug === "telegram";
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: full ? "#fff" : net.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg viewBox="0 0 24 24" width={full ? size : size * 0.56} height={full ? size : size * 0.56}>
        <path d={net.path} fill={full ? "#26A5E4" : "#fff"} />
      </svg>
    </div>
  );
}

export function Wordmark({ size }: { size: number }) {
  return (
    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: size, letterSpacing: "-0.03em", lineHeight: 1 }}>
      Даш<span style={{ color: "#2a78d6" }}>крафт</span>
    </div>
  );
}
