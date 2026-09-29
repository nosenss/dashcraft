// Соцсети. Дашкрафт показывает любой аккаунт из Livedune: для известных сетей — со своей иконкой
// и названиями реакций, для остальных — по общим метрикам (см. networkForType).
export type Slug = string; // часть адреса: /telegram, /ok, /rutube…
export type Part = "likes" | "comments" | "shares" | "saves";
export type Parts = Partial<Record<Part, string>>;

export type NetworkConfig = {
  slug: Slug;
  match: RegExp; // тип аккаунта в Livedune: instagram_new, vk_group, telegram…
  label: string;
  brand: string; // цвет иконки, не для графиков
  hasReach: boolean; // охват постов отдаёт Livedune (Instagram); у остальных включится сам, если охват придёт
  parts: Parts; // какие виды вовлечения есть в сети и как они называются
  verified: boolean; // формат ответов Livedune сверен на живых данных
  generic?: boolean; // сеть не из списка — показываем по общим метрикам
};

// Проверенные на живых данных Livedune: первые шесть. Остальные — по документации и здравому смыслу;
// если Livedune пришлёт другие поля, недостающие виды реакций подхватятся из данных (см. report.ts).
export const NETWORKS: NetworkConfig[] = [
  {
    slug: "instagram",
    match: /^instagram/,
    label: "Instagram",
    brand: "#E1306C",
    hasReach: true,
    parts: { likes: "Лайки", comments: "Комментарии", shares: "Поделились", saves: "Сохранения" },
    verified: true,
  },
  {
    slug: "telegram",
    match: /^telegram/,
    label: "Telegram",
    brand: "#2AABEE",
    hasReach: false,
    parts: { likes: "Реакции", comments: "Комментарии", shares: "Пересылки" },
    verified: true,
  },
  {
    slug: "vk",
    match: /^vk/,
    label: "ВКонтакте",
    brand: "#0077FF",
    hasReach: false,
    parts: { likes: "Лайки", comments: "Комментарии", shares: "Репосты" },
    verified: true,
  },
  {
    slug: "youtube",
    match: /^youtube/,
    label: "YouTube",
    brand: "#FF0000",
    hasReach: false,
    parts: { likes: "Лайки", comments: "Комментарии" },
    verified: true,
  },
  {
    slug: "tiktok",
    match: /^tiktok/,
    label: "TikTok",
    brand: "#111111",
    hasReach: false,
    parts: { likes: "Лайки", comments: "Комментарии", shares: "Репосты" },
    verified: true,
  },
  {
    slug: "dzen",
    match: /^(dzen|zen|yandex_?zen)/,
    label: "Дзен",
    brand: "#1C1C1C",
    hasReach: false,
    parts: { likes: "Лайки", comments: "Комментарии", shares: "Репосты" },
    verified: true,
  },
  {
    slug: "ok",
    match: /^(ok|odnoklassniki)(_|$)/,
    label: "Одноклассники",
    brand: "#EE8208",
    hasReach: false,
    parts: { likes: "Классы", comments: "Комментарии", shares: "Поделились" },
    verified: false,
  },
  {
    slug: "max",
    match: /^max(_|$)/,
    label: "Max",
    brand: "#6C2BD9",
    hasReach: false,
    parts: { likes: "Реакции", comments: "Комментарии", shares: "Пересылки" },
    verified: false,
  },
  {
    slug: "rutube",
    match: /^rutube/,
    label: "Rutube",
    brand: "#100943",
    hasReach: false,
    parts: { likes: "Лайки", comments: "Комментарии", shares: "Репосты" },
    verified: false,
  },
  {
    slug: "facebook",
    match: /^(facebook|fb)(_|$)/,
    label: "Facebook",
    brand: "#0866FF",
    hasReach: false,
    parts: { likes: "Реакции", comments: "Комментарии", shares: "Поделились" },
    verified: false,
  },
  {
    slug: "x",
    match: /^(twitter|x)(_|$)/,
    label: "X",
    brand: "#000000",
    hasReach: false,
    parts: { likes: "Лайки", comments: "Ответы", shares: "Репосты", saves: "Закладки" },
    verified: false,
  },
  {
    slug: "threads",
    match: /^threads/,
    label: "Threads",
    brand: "#000000",
    hasReach: false,
    parts: { likes: "Лайки", comments: "Ответы", shares: "Репосты" },
    verified: false,
  },
  {
    slug: "pinterest",
    match: /^pinterest/,
    label: "Pinterest",
    brand: "#E60023",
    hasReach: false,
    parts: { likes: "Реакции", comments: "Комментарии", saves: "Сохранения" },
    verified: false,
  },
  {
    slug: "linkedin",
    match: /^linkedin/,
    label: "LinkedIn",
    brand: "#0A66C2",
    hasReach: false,
    parts: { likes: "Реакции", comments: "Комментарии", shares: "Репосты" },
    verified: false,
  },
  {
    slug: "likee",
    match: /^likee/,
    label: "Likee",
    brand: "#FF3D6E",
    hasReach: false,
    parts: { likes: "Лайки", comments: "Комментарии", shares: "Репосты" },
    verified: false,
  },
];

// Названия видов реакций по умолчанию — для сетей не из списка и для полей, которых нет в конфиге
export const GENERIC_PARTS: Required<Parts> = { likes: "Лайки", comments: "Комментарии", shares: "Репосты", saves: "Сохранения" };

// Сеть по типу аккаунта Livedune. Неизвестный тип тоже показываем: адрес и название — из самого типа
export function networkForType(type: string): NetworkConfig {
  const known = NETWORKS.find((n) => n.match.test(type));
  if (known) return known;
  const slug = type.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "other";
  const label = type.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  return {
    slug,
    match: new RegExp(`^${type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
    label,
    brand: "#55535c",
    hasReach: false,
    parts: { likes: GENERIC_PARTS.likes, comments: GENERIC_PARTS.comments, shares: GENERIC_PARTS.shares },
    verified: false,
    generic: true,
  };
}

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
  brief: "Пост", // короткий пост в Дзене (dzen.ru/b/…)
  live: "Эфир",
  stream: "Эфир",
  poll: "Опрос",
  gif: "GIF",
  audio: "Аудио",
  voice: "Голосовое",
  document: "Файл",
  round: "Кружок", // видеосообщение в Telegram
  repost: "Репост",
  story: "История",
  stories: "История",
  link: "Ссылка",
  pin: "Пин",
};

export function postTypeLabel(type: string) {
  return POST_TYPE_LABELS[type] ?? type;
}

// «лайки + комментарии + поделились + сохранения» — из чего складываются реакции в этой сети
export function partsText(parts: Parts) {
  return Object.values(parts).map((p) => p!.toLowerCase()).join(" + ");
}
