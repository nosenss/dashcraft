import {
  siFacebook, siInstagram, siMax, siOdnoklassniki, siPinterest, siTelegram, siThreads, siTiktok, siVk, siX, siYoutube,
} from "simple-icons";
import { networkBySlug, type Slug } from "@/lib/networks";

// Логотип Дзена (звезда из четырёх вогнутых лучей) — в simple-icons его нет
const DZEN_PATH = "M12 2.5c.28 5.63 3.87 9.22 9.5 9.5-5.63.28-9.22 3.87-9.5 9.5-.28-5.63-3.87-9.22-9.5-9.5 5.63-.28 9.22-3.87 9.5-9.5Z";

const ICONS: Record<string, { path: string; bg: string; label: string }> = {
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
  ok: { path: siOdnoklassniki.path, bg: "#EE8208", label: "Одноклассники" },
  max: { path: siMax.path, bg: "#6C2BD9", label: "Max" },
  facebook: { path: siFacebook.path, bg: "#0866FF", label: "Facebook" },
  x: { path: siX.path, bg: "#000000", label: "X" },
  threads: { path: siThreads.path, bg: "#000000", label: "Threads" },
  pinterest: { path: siPinterest.path, bg: "#E60023", label: "Pinterest" },
};

// Логотипов LinkedIn, Rutube и Likee в simple-icons нет — рисуем буквы на фирменном цвете
const LETTERS: Record<string, string> = { linkedin: "in", rutube: "R", likee: "L" };

// Белый логотип сети на круге в её фирменном цвете
// Белый логотип сети на круге в её фирменном цвете. Незнакомая сеть — первая буква на сером круге
export function NetworkIcon({ slug, size = 20 }: { slug: Slug; size?: number }) {
  const icon = ICONS[slug];
  if (!icon) {
    const net = networkBySlug(slug);
    const text = LETTERS[slug] ?? slug.slice(0, 1).toUpperCase();
    return (
      <span
        role="img"
        aria-label={net?.label ?? slug}
        className="inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white"
        style={{ width: size, height: size, background: net?.brand ?? "#8c8a93", fontSize: size * (text.length > 1 ? 0.42 : 0.5) }}
      >
        {text}
      </span>
    );
  }
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
