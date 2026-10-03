export type SourceKind = 'youtube' | 'reddit' | 'x'

export interface Source {
  id: string
  kind: SourceKind
  external_id: string
  name: string
  url: string | null
  description: string | null
  tags: string[]
  is_default: boolean
  enabled: boolean
  last_fetched_at: string | null
  created_at: string
  updated_at: string
}

export interface FeedItem {
  id: string
  source: SourceKind
  source_id: string | null
  source_name: string
  author: string | null
  title: string
  url: string
  thumbnail: string | null
  published_at: string
  engagement_score: number
  summary: string | null
  summary_model: string | null
  summarized_at: string | null
  tags: string[]
  keywords: string[]
  roles: string[]
  try_this: string | null
  key_points: string[] | null
  hidden: boolean
  created_at: string
  updated_at: string
}

export type SortOption = 'latest' | 'popular'
export type FilterOption = 'all' | 'videos' | 'discussions'

export interface FetchFeedOptions {
  sourceIds?: string[]
  tags?: string[]
  keyword?: string
  role?: string
  savedIds?: string[]
  source?: SourceKind | SourceKind[]
  sort?: SortOption
  cursor?: string
  limit?: number
}

export interface FeedResponse {
  items: FeedItem[]
  nextCursor: string | null
  hasMore: boolean
}

export interface TrendingKeyword {
  keyword: string
  count: number
}

export interface WeeklyRecapItem {
  headline: string
  explanation: string
  why_it_matters: string
  feed_item_ids: string[]
}

export interface WeeklyRecap {
  id: string
  week_start: string
  title: string
  intro: string
  items: WeeklyRecapItem[]
  created_at: string
}
