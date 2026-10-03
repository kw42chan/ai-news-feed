import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { SignupBox } from './components/SignupBox'
import { FilterBar } from './components/FilterBar'
import { FeedList } from './components/FeedList'
import { Footer } from './components/Footer'
import { fetchFeed, fetchTrendingKeywords, getLastUpdated } from './lib/feed'
import type { FeedItem, SortOption, TrendingKeyword } from './types'

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

function App() {
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

  useEffect(() => {
    fetchTrendingKeywords()
      .then(setTrendingKeywords)
      .catch(() => setTrendingKeywords([]))
  }, [])

  const loadFeed = useCallback(async (reset = true) => {
    if (reset) {
      setIsLoading(true)
      setError(null)
      setItems([])
      setCursor(null)
    } else {
      setIsLoadingMore(true)
    }

    try {
      const response = await fetchFeed({
        keyword: selectedKeyword ?? undefined,
        sort,
        cursor: reset ? undefined : cursor ?? undefined,
      })

      if (reset) {
        setItems(response.items)
      } else {
        setItems(prev => [...prev, ...response.items])
      }
      setHasMore(response.hasMore)
      setCursor(response.nextCursor)

      if (reset) {
        const updated = await getLastUpdated()
        setLastUpdated(updated)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [sort, selectedKeyword, cursor])

  useEffect(() => {
    loadFeed(true)
  }, [sort, selectedKeyword])

  const handleSortChange = (newSort: SortOption) => {
    setSort(newSort)
  }

  const handleKeywordSelect = (keyword: string | null) => {
    setSelectedKeyword(keyword)
  }

  const handleLoadMore = () => {
    loadFeed(false)
  }

  return (
    <div className="min-h-screen bg-mist">
      <Header />
      
      <main id="top">
        <div className="max-w-[1200px] mx-auto px-6 max-sm:px-4">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-x-10 lg:items-start">
            <section className="py-16 max-sm:py-10 lg:col-start-1 lg:row-start-1 lg:pb-8">
              <h1 className="font-display text-[42px] max-sm:text-[32px] font-semibold leading-[1.1] tracking-tight text-ink mb-4 max-w-[640px]">
                AI news for busy professionals, in plain English
              </h1>
              <p className="text-[17px] leading-relaxed text-stone mb-4 max-w-[540px]">
                The AI stories that matter for your work, each summed up in one simple line. Updated twice a day.
              </p>
              {lastUpdated && (
                <p className="text-[14px] text-meta">
                  {formatLastUpdated(lastUpdated)}
                </p>
              )}
            </section>

            <aside
              className="mb-8 lg:mb-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-[4.5rem] lg:self-start"
              aria-label="Morning digest signup"
            >
              <SignupBox />
            </aside>

            <section
              id="feed"
              aria-labelledby="feed-title"
              className="pb-20 max-sm:pb-12 lg:col-start-1 lg:row-start-2 min-w-0"
            >
              <FilterBar
                sort={sort}
                selectedKeyword={selectedKeyword}
                trendingKeywords={trendingKeywords}
                onSortChange={handleSortChange}
                onKeywordSelect={handleKeywordSelect}
              />

              <FeedList
                items={items}
                isLoading={isLoading}
                isLoadingMore={isLoadingMore}
                error={error}
                hasMore={hasMore}
                onLoadMore={handleLoadMore}
              />
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default App
