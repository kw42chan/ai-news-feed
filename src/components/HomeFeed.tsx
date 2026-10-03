import { useState, useEffect, useCallback } from 'react'
import { SignupBox } from './SignupBox'
import { FilterBar } from './FilterBar'
import { FeedList } from './FeedList'
import { fetchFeed, fetchTrendingKeywords, getLastUpdated, RoleFilterUnsupportedError } from '../lib/feed'
import { loadGlossary } from '../lib/glossary'
import type { GlossaryEntry } from '../lib/glossary'
import { getFeedRoleFilter, setFeedRoleFilter, type ProfessionalRole } from '../lib/roles'
import type { FeedItem, SortOption, TrendingKeyword } from '../types'

function formatLastUpdated(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Updated just now'
  if (diffMins < 60) return `Updated ${diffMins} minute${diffMins === 1 ? '' : 's'} ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `Updated ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

  const diffDays = Math.floor(diffHours / 24)
  return `Updated ${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

export function HomeFeed() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [sort, setSort] = useState<SortOption>('latest')
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null)
  const [trendingKeywords, setTrendingKeywords] = useState<TrendingKeyword[]>([])
  const [feedRoleFilter, setFeedRoleFilterState] = useState<ProfessionalRole | null>(() =>
    typeof window !== 'undefined' ? getFeedRoleFilter() : null
  )
  const [glossary, setGlossary] = useState<Map<string, GlossaryEntry>>(new Map())

  useEffect(() => {
    fetchTrendingKeywords()
      .then(setTrendingKeywords)
      .catch(() => setTrendingKeywords([]))
    loadGlossary()
      .then(setGlossary)
      .catch(() => setGlossary(new Map()))
  }, [])

  const loadFeed = useCallback(
    async (reset: boolean) => {
      const roleFilter = feedRoleFilter

      if (reset) {
        setIsLoading(true)
        setError(null)
        setCursor(null)
      } else {
        setIsLoadingMore(true)
      }

      try {
        const response = await fetchFeed({
          keyword: selectedKeyword ?? undefined,
          sort,
          cursor: reset ? undefined : cursor ?? undefined,
          role: roleFilter ?? undefined,
        })

        if (reset) {
          setItems(response.items)
          setCursor(response.nextCursor)
        } else {
          setItems((prev) => [...prev, ...response.items])
          setCursor(response.nextCursor)
        }
        setHasMore(response.hasMore)

        if (reset) {
          const updated = await getLastUpdated()
          setLastUpdated(updated)
        }
      } catch (err) {
        if (err instanceof RoleFilterUnsupportedError && roleFilter) {
          setFeedRoleFilter(null)
          setFeedRoleFilterState(null)
          try {
            const response = await fetchFeed({
              keyword: selectedKeyword ?? undefined,
              sort,
            })
            setItems(response.items)
            setCursor(response.nextCursor)
            setHasMore(response.hasMore)
            const updated = await getLastUpdated()
            setLastUpdated(updated)
          } catch (fallbackErr) {
            setError(fallbackErr instanceof Error ? fallbackErr.message : 'Failed to load feed')
          }
          return
        }
        setError(err instanceof Error ? err.message : 'Failed to load feed')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [sort, selectedKeyword, feedRoleFilter, cursor]
  )

  useEffect(() => {
    setCursor(null)
    loadFeed(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when filters change
  }, [sort, selectedKeyword, feedRoleFilter])

  const handleLoadMore = () => {
    if (!hasMore || isLoadingMore) return
    loadFeed(false)
  }

  const handleRoleFilterChange = (role: ProfessionalRole | null) => {
    setFeedRoleFilter(role)
    setFeedRoleFilterState(role)
  }

  const emptyMessage = feedRoleFilter
    ? `No stories tagged for ${feedRoleFilter} yet. Try All roles or check back later.`
    : undefined

  return (
    <main id="top">
      <div className="max-w-[1200px] mx-auto px-6 max-sm:px-4">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-x-10 lg:items-start">
          <section className="py-8 max-sm:py-5 lg:py-16 lg:col-start-1 lg:row-start-1 lg:pb-6 max-sm:pb-4">
            <h1 className="font-display text-[42px] max-sm:text-[28px] font-semibold leading-[1.1] tracking-tight text-ink mb-3 max-sm:mb-2 max-w-[640px]">
              AI news for busy professionals, in plain English
            </h1>
            <p className="text-[17px] max-sm:text-[15px] leading-relaxed text-stone mb-2 max-sm:mb-1 max-w-[540px]">
              The AI stories that matter for your work, each summed up in one simple line. Updated twice a day.
            </p>
            {lastUpdated && <p className="text-[13px] max-sm:text-[12px] text-meta">{formatLastUpdated(lastUpdated)}</p>}
          </section>

          <aside
            className="mb-4 max-sm:mb-3 lg:mb-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-[4.5rem] lg:self-start lg:mt-16"
            aria-label="Morning digest signup"
          >
            <SignupBox compactOnMobile />
          </aside>

          <section
            id="feed"
            aria-labelledby="feed-title"
            className="pb-20 max-sm:pb-12 lg:col-start-1 lg:row-start-2 min-w-0 max-sm:-mt-1"
          >
            <FilterBar
              sort={sort}
              selectedKeyword={selectedKeyword}
              trendingKeywords={trendingKeywords}
              feedRoleFilter={feedRoleFilter}
              glossary={glossary}
              onSortChange={setSort}
              onKeywordSelect={setSelectedKeyword}
              onFeedRoleFilterChange={handleRoleFilterChange}
            />

            <FeedList
              items={items}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              error={error}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              onBookmarkChange={() => {}}
              emptyMessage={emptyMessage}
            />
          </section>
        </div>
      </div>
    </main>
  )
}
