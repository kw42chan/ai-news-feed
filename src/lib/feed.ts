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
const FEED_LEADS_TABLE = 'feed_story_leads'

export class RoleFilterUnsupportedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RoleFilterUnsupportedError'
  }
}

function normalizeLeadRow(row: Record<string, unknown>): FeedItem {
  const item = row as unknown as FeedItem
  if (typeof row.story_video_count === 'number') {
    item.story_video_count = row.story_video_count
  } else if (item.story_video_count === undefined) {
    item.story_video_count = 1
  }
  return item
}

async function runFeedQueryOnTable(
  table: string,
  options: FetchFeedOptions,
  leadsOnly: boolean
): Promise<FeedResponse> {
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

  let query = supabase.from(table).select('*').eq('hidden', false).not('summary', 'is', null)

  if (leadsOnly && table === 'feed_items') {
    query = query.eq('is_story_lead', true).eq('is_ai_related', true)
  }

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

  let youtubeItems = ((data || []) as Record<string, unknown>[]).map(normalizeLeadRow).filter(
    (item) => item.source === 'youtube'
  )

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

function isSavedItemVisible(item: FeedItem): boolean {
  return (
    item.source === 'youtube' &&
    item.summary != null &&
    !item.hidden &&
    item.is_ai_related !== false
  )
}

async function fetchSavedFeedItems(savedIds: string[]): Promise<FeedResponse> {
  const { data, error } = await supabase.from('feed_items').select('*').in('id', savedIds)

  if (error) {
    throw new Error(`Failed to fetch saved stories: ${error.message}`)
  }

  const byId = new Map<string, FeedItem>()
  for (const row of data ?? []) {
    byId.set(row.id, row as FeedItem)
  }

  const leadIds = new Set<string>()
  for (const id of savedIds) {
    const item = byId.get(id)
    if (!item || isSavedItemVisible(item)) continue
    if (item.story_group_id) leadIds.add(item.story_group_id)
  }

  let leadsById = new Map<string, FeedItem>()
  if (leadIds.size > 0) {
    const { data: leads } = await supabase.from('feed_items').select('*').in('id', [...leadIds])
    leadsById = new Map((leads ?? []).map((row) => [row.id, row as FeedItem]))
  }

  const items: FeedItem[] = []
  const seen = new Set<string>()

  for (const id of savedIds) {
    const item = byId.get(id)
    if (!item || item.source !== 'youtube') continue

    let display = item
    if (!isSavedItemVisible(item) && item.story_group_id) {
      const lead = leadsById.get(item.story_group_id)
      if (lead && isSavedItemVisible(lead)) {
        display = lead
      }
    }

    if (seen.has(display.id)) continue
    seen.add(display.id)
    items.push(display)
  }

  return { items, nextCursor: null, hasMore: false }
}

async function runFeedQuery(options: FetchFeedOptions): Promise<FeedResponse> {
  if (options.savedIds && options.savedIds.length > 0) {
    return fetchSavedFeedItems(options.savedIds)
  }

  try {
    return await runFeedQueryOnTable(FEED_LEADS_TABLE, options, true)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (isSchemaMismatchError(message) || message.includes('feed_story_leads')) {
      return runFeedQueryOnTable('feed_items', options, true)
    }
    throw err
  }
}

export async function fetchFeed(options: FetchFeedOptions = {}): Promise<FeedResponse> {
  return runFeedQuery(options)
}

async function queryTopStoriesFromTable(
  table: 'feed_story_leads' | 'feed_items',
  since: string,
  limit: number
): Promise<FeedItem[]> {
  let query = supabase
    .from(table)
    .select('*')
    .eq('hidden', false)
    .not('summary', 'is', null)
    .eq('source', 'youtube')
    .gte('published_at', since)

  if (table === 'feed_items') {
    query = query.eq('is_story_lead', true).eq('is_ai_related', true)
    query = query.order('engagement_score', { ascending: false })
  } else {
    query = query
      .order('story_video_count', { ascending: false, nullsFirst: false })
      .order('engagement_score', { ascending: false })
  }

  const { data, error } = await query.limit(limit)
  if (error) return []
  return ((data || []) as Record<string, unknown>[]).map(normalizeLeadRow)
}

export async function fetchTopStories(limit = 3): Promise<FeedItem[]> {
  for (const hours of [24, 48, 72]) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    let items = await queryTopStoriesFromTable(FEED_LEADS_TABLE, since, limit)
    if (items.length < limit) {
      const fallback = await queryTopStoriesFromTable('feed_items', since, limit)
      if (fallback.length > items.length) items = fallback
    }
    if (items.length >= limit) return items.slice(0, limit)
    if (hours === 72) return items
  }
  return []
}

async function resolveLeadId(id: string): Promise<string> {
  const { data } = await supabase
    .from('feed_items')
    .select('id, story_group_id, is_story_lead')
    .eq('id', id)
    .maybeSingle()

  if (!data) return id
  if (data.is_story_lead) return data.id
  if (data.story_group_id) return data.story_group_id
  return data.id
}

export async function fetchFeedItemById(id: string): Promise<FeedItem | null> {
  const leadId = await resolveLeadId(id)

  const { data, error } = await supabase
    .from('feed_items')
    .select('*')
    .eq('id', leadId)
    .eq('hidden', false)
    .eq('is_ai_related', true)
    .not('summary', 'is', null)
    .maybeSingle()

  if (error) {
    if (isSchemaMismatchError(error.message)) {
      const fallback = await supabase
        .from('feed_items')
        .select('*')
        .eq('id', leadId)
        .eq('hidden', false)
        .not('summary', 'is', null)
        .maybeSingle()
      if (!fallback.data || fallback.data.source !== 'youtube') return null
      return fallback.data as FeedItem
    }
    throw new Error(`Failed to fetch story: ${error.message}`)
  }

  if (!data || data.source !== 'youtube') return null
  return data as FeedItem
}

export async function fetchStoryGroupVideos(lead: FeedItem): Promise<FeedItem[]> {
  const groupKey = lead.story_group_id ?? lead.id

  const { data, error } = await supabase
    .from('feed_items')
    .select('*')
    .eq('hidden', false)
    .eq('is_ai_related', true)
    .or(`id.eq.${groupKey},story_group_id.eq.${groupKey}`)
    .order('engagement_score', { ascending: false })

  if (error) return []
  return (data || []).filter((row) => row.source === 'youtube') as FeedItem[]
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
    .eq('is_ai_related', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    const fallback = await supabase
      .from('feed_items')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return fallback.data?.created_at ?? null
  }

  return data.created_at
}
