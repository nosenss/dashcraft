export type Paginated<T> = {
  after?: number | null;
  count?: number;
  response?: T[];
};

export type RawAccount = {
  id: number;
  social_id: string;
  is_linked: boolean;
  type: string;
  project: string;
  name: string;
  short_name: string;
  img?: string;
  url: string;
  stat?: { posts?: number; followers?: number };
};

// Поля history отличаются по сетям, общие — followers/posts/views.
export type RawHistoryRow = {
  created: string;
  followers?: number | null;
  posts?: number | null;
  videos?: number | null;
  posts_views?: number | null;
  video_views?: number | null;
  avg_views?: number | null;
  // Только Instagram
  gained?: number | null;
  lost?: number | null;
  impressions?: number | null;
  profile_views?: number | null;
  avg_reach?: number | null;
  reach?: { total?: number | null } | null;
  stories_views?: number | null;
};

export type RawPost = {
  id?: string | number;
  post_id?: string | number;
  type?: string;
  created?: string;
  deleted?: boolean;
  text?: string | null;
  url?: string | null;
  follows?: number | null;
  profile_visits?: number | null;
  reactions?: Record<string, number | null | undefined>;
  impressions?: { total?: number | null } | null;
  reach?: { total?: number | null } | null;
};
