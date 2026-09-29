import { siInstagram, siTelegram, siTiktok, siVk, siYoutube } from "simple-icons";
import type { Slug } from "@/lib/networks";

// Логотип Дзена (звезда из четырёх вогнутых лучей) — в simple-icons его нет
const DZEN_PATH = "M12 2.5c.28 5.63 3.87 9.22 9.5 9.5-5.63.28-9.22 3.87-9.5 9.5-.28-5.63-3.87-9.22-9.5-9.5 5.63-.28 9.22-3.87 9.5-9.5Z";

const ICONS: Record<Slug, { path: string; bg: string; label: string }> = {
  instagram: {
    path: siInstagram.path,
    bg: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)",
    label: "Instagram",
  },
  telegram: { path: siTelegram.path, bg: "#26A5E4", label: "Telegram" },
  vk: { path: siVk.path, bg: "#0077FF", label: "ВКонтакте" },
  youtube: { path: siYoutube.path, bg: "#FF0000", label: "YouTube" },
  tiktok: { path: siTiktok.path, bg: "#000000", label: "TikTok" },
  dzen: { path: DZEN_PATH, bg: "#000000", label: "Дзен" },
};

// Белый логотип сети на круге в её фирменном цвете
export function NetworkIcon({ slug, size = 20 }: { slug: Slug; size?: number }) {
  const icon = ICONS[slug];
  // Telegram в simple-icons уже нарисован кругом — показываем его целиком
  const full = slug === "telegram";
  return (
    <span
      role="img"
      aria-label={icon.label}
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: full ? "#fff" : icon.bg }}
    >
      <svg
        viewBox="0 0 24 24"
        width={full ? size : size * 0.56}
        height={full ? size : size * 0.56}
        fill={full ? icon.bg : "#fff"}
        aria-hidden
      >
        <path d={icon.path} />
      </svg>
    </span>
  );
}
