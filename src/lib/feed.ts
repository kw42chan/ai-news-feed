import { supabase } from './supabase'
import { isSchemaMismatchError } from './postgrest'
import type {
  FeedItem,
  FetchFeedOptions,
  FeedResponse,
  Source,
  TrendingKeyword,
  WeeklyRecap,
} from '../types'

const DEFAULT_PAGE_SIZE = 20

export class RoleFilterUnsupportedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RoleFilterUnsupportedError'
  }
}

async function runFeedQuery(options: FetchFeedOptions): Promise<FeedResponse> {
  const {
    sourceIds,
    tags,
    keyword,
    role,
    savedIds,
    source,
    sort = 'latest',
    cursor,
    limit = DEFAULT_PAGE_SIZE,
  } = options

  if (savedIds && savedIds.length === 0) {
    return { items: [], nextCursor: null, hasMore: false }
  }

  let query = supabase
    .from('feed_items')
    .select('*')
    .eq('hidden', false)
    .not('summary', 'is', null)

  if (savedIds && savedIds.length > 0) {
    query = query.in('id', savedIds)
  }

  if (sourceIds && sourceIds.length > 0) {
    query = query.in('source_id', sourceIds)
  }

  if (source) {
    const sources = Array.isArray(source) ? source : [source]
    query = query.in('source', sources)
  }

  if (tags && tags.length > 0) {
    query = query.overlaps('tags', tags)
  }

  if (keyword) {
    query = query.contains('keywords', [keyword])
  }

  if (role) {
    query = query.contains('roles', [role])
  }

  if (sort === 'latest') {
    query = query.order('published_at', { ascending: false })
  } else {
    query = query.order('engagement_score', { ascending: false })
  }

  if (cursor) {
    const cursorDate = new Date(cursor)
    if (sort === 'latest') {
      query = query.lt('published_at', cursorDate.toISOString())
    }
  }

  query = query.limit(limit + 1)

  const { data, error } = await query

  if (error) {
    if (role && isSchemaMismatchError(error.message)) {
      throw new RoleFilterUnsupportedError(error.message)
    }
    throw new Error(`Failed to fetch feed: ${error.message}`)
  }

  let youtubeItems = ((data || []) as FeedItem[]).filter((item) => item.source === 'youtube')

  if (savedIds && savedIds.length > 0) {
    const order = new Map(savedIds.map((id, i) => [id, i]))
    youtubeItems.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  }

  const hasMore = youtubeItems.length > limit
  const returnItems = hasMore ? youtubeItems.slice(0, limit) : youtubeItems
  const nextCursor =
    hasMore && returnItems.length > 0
      ? returnItems[returnItems.length - 1].published_at
      : null

  return {
    items: returnItems,
    nextCursor,
    hasMore,
  }
}

export async function fetchFeed(options: FetchFeedOptions = {}): Promise<FeedResponse> {
  return runFeedQuery(options)
}

export async function fetchFeedItemById(id: string): Promise<FeedItem | null> {
  const { data, error } = await supabase
    .from('feed_items')
    .select('*')
    .eq('id', id)
    .eq('hidden', false)
    .not('summary', 'is', null)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch story: ${error.message}`)
  if (!data || data.source !== 'youtube') return null
  return data as FeedItem
}

export async function fetchFeedTitlesByIds(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return new Map()

  const { data, error } = await supabase
    .from('feed_items')
    .select('id, title')
    .in('id', unique)

  if (error) return new Map()
  const map = new Map<string, string>()
  for (const row of data ?? []) {
    if (row.title) map.set(row.id, row.title)
  }
  return map
}

export async function fetchRelatedStories(item: FeedItem, limit = 3): Promise<FeedItem[]> {
  const keyword = item.keywords?.[0]
  if (!keyword) return []

  const { items } = await fetchFeed({ keyword, sort: 'latest', limit: limit + 2 })
  return items.filter((row) => row.id !== item.id).slice(0, limit)
}

export async function fetchLatestWeeklyRecap(): Promise<WeeklyRecap | null> {
  const { data, error } = await supabase
    .from('weekly_recaps')
    .select('*')
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (isSchemaMismatchError(error.message)) return null
    throw new Error(`Failed to fetch weekly recap: ${error.message}`)
  }
  return data as WeeklyRecap | null
}

export async function fetchTrendingKeywords(
  days = 7,
  maxCount = 12
): Promise<TrendingKeyword[]> {
  const { data, error } = await supabase.rpc('trending_keywords', {
    days,
    max_count: maxCount,
  })

  if (error) {
    throw new Error(`Failed to fetch trending keywords: ${error.message}`)
  }

  return (data || []) as TrendingKeyword[]
}

export async function fetchSources(): Promise<Source[]> {
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .order('name')

  if (error) {
    throw new Error(`Failed to fetch sources: ${error.message}`)
  }

  return (data || []) as Source[]
}

export async function getLastUpdated(): Promise<string | null> {
  const { data, error } = await supabase
    .from('feed_items')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return data.created_at
}
