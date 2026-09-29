export type Slug = "instagram" | "telegram" | "vk" | "youtube" | "tiktok" | "dzen";
export type Part = "likes" | "comments" | "shares" | "saves";

export type NetworkConfig = {
  slug: Slug;
  type: string; // тип аккаунта в Livedune
  label: string;
  brand: string; // цвет иконки, не для графиков
  hasReach: boolean; // есть охват постов и аккаунта (только Instagram)
  // Какие виды вовлечения есть в сети и как они называются
  parts: Partial<Record<Part, string>>;
};

export const NETWORKS: NetworkConfig[] = [
  {
    slug: "instagram",
    type: "instagram_new",
    label: "Instagram",
    brand: "#E1306C",
    hasReach: true,
    parts: { likes: "Лайки", comments: "Комментарии", shares: "Поделились", saves: "Сохранения" },
  },
  {
    slug: "telegram",
    type: "telegram",
    label: "Telegram",
    brand: "#2AABEE",
    hasReach: false,
    parts: { likes: "Реакции", comments: "Комментарии", shares: "Пересылки" },
  },
  {
    slug: "vk",
    type: "vk_group",
    label: "ВКонтакте",
    brand: "#0077FF",
    hasReach: false,
    parts: { likes: "Лайки", comments: "Комментарии", shares: "Репосты" },
  },
  {
    slug: "youtube",
    type: "youtube",
    label: "YouTube",
    brand: "#FF0000",
    hasReach: false,
    parts: { likes: "Лайки", comments: "Комментарии" },
  },
  {
    slug: "tiktok",
    type: "tiktok",
    label: "TikTok",
    brand: "#111111",
    hasReach: false,
    parts: { likes: "Лайки", comments: "Комментарии", shares: "Репосты" },
  },
  {
    slug: "dzen",
    type: "dzen",
    label: "Дзен",
    brand: "#1C1C1C",
    hasReach: false,
    parts: { likes: "Лайки", comments: "Комментарии", shares: "Репосты" },
  },
];

export function networkBySlug(slug: string) {
  return NETWORKS.find((n) => n.slug === slug) ?? null;
}

export const POST_TYPE_LABELS: Record<string, string> = {
  reels: "Reels",
  post: "Пост",
  image: "Фото",
  photo: "Фото",
  carousel: "Карусель",
  carousel_album: "Карусель",
  video: "Видео",
  clip: "Клип",
  short: "Shorts",
  shorts: "Shorts",
  text: "Текст",
  article: "Статья",
  live: "Эфир",
  poll: "Опрос",
  gif: "GIF",
  audio: "Аудио",
  document: "Файл",
};

export function postTypeLabel(type: string) {
  return POST_TYPE_LABELS[type] ?? type;
}

// «лайки + комментарии + поделились + сохранения» — из чего складываются реакции в этой сети
export function partsText(parts: NetworkConfig["parts"]) {
  return Object.values(parts).map((p) => p!.toLowerCase()).join(" + ");
}
