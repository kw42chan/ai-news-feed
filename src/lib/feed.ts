import { supabase } from './supabase'
import type { FeedItem, FetchFeedOptions, FeedResponse, Source } from '../types'

const DEFAULT_PAGE_SIZE = 20

export async function fetchFeed(options: FetchFeedOptions = {}): Promise<FeedResponse> {
  const {
    sourceIds,
    tags,
    source,
    sort = 'latest',
    cursor,
    limit = DEFAULT_PAGE_SIZE,
  } = options

  let query = supabase
    .from('feed_items')
    .select('*')
    // Only show items with summaries that aren't hidden (RLS also enforces this)
    .eq('hidden', false)
    .not('summary', 'is', null)

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
    throw new Error(`Failed to fetch feed: ${error.message}`)
  }

  const items = (data || []) as FeedItem[]
  const hasMore = items.length > limit
  const returnItems = hasMore ? items.slice(0, limit) : items
  const nextCursor = hasMore && returnItems.length > 0
    ? returnItems[returnItems.length - 1].published_at
    : null

  return {
    items: returnItems,
    nextCursor,
    hasMore,
  }
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
