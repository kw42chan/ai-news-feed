import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { SignupBox } from './components/SignupBox'
import { FilterBar } from './components/FilterBar'
import { FeedList } from './components/FeedList'
import { LastUpdated } from './components/LastUpdated'
import { Footer } from './components/Footer'
import { fetchFeed, getLastUpdated } from './lib/feed'
import type { FeedItem, SortOption } from './types'

const AVAILABLE_TAGS = [
  'tools',
  'work & productivity',
  'business',
  'policy & safety',
  'big tech',
  'how-to',
  'creative',
]

function App() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const [sort, setSort] = useState<SortOption>('latest')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

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
        tags: selectedTags.length > 0 ? selectedTags : undefined,
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
  }, [sort, selectedTags, cursor])

  useEffect(() => {
    loadFeed(true)
  }, [sort, selectedTags])

  const handleSortChange = (newSort: SortOption) => {
    setSort(newSort)
  }

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleLoadMore = () => {
    loadFeed(false)
  }

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <Header />
      
      <main id="top">
        {/* Hero section */}
        <section
          className="relative py-20 pb-16 max-sm:py-12 max-sm:pb-10"
          style={{
            background: `
              radial-gradient(900px 380px at 12% -10%, rgba(79, 70, 229, 0.07), transparent 70%),
              radial-gradient(700px 320px at 95% 0%, rgba(14, 165, 233, 0.05), transparent 70%)
            `,
          }}
        >
          <div className="max-w-[1160px] mx-auto px-6 max-sm:px-5">
            <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-16 items-center max-lg:grid-cols-1 max-lg:gap-10">
              <div>
                <LastUpdated timestamp={lastUpdated} />
                <h1 
                  className="mt-6 mb-5 max-sm:mt-5 max-sm:mb-4 font-bold"
                  style={{ 
                    fontSize: 'clamp(2.25rem, 1.6rem + 2.6vw, 3.5rem)',
                    lineHeight: 1.06,
                    letterSpacing: '-0.035em',
                    textWrap: 'balance',
                    color: '#0F172A',
                  }}
                >
                  AI news for busy professionals, <span style={{ color: '#4F46E5' }}>in plain English</span>
                </h1>
                <p 
                  className="m-0 text-lg max-sm:text-base max-w-[34rem] max-lg:max-w-[40rem]"
                  style={{ 
                    lineHeight: 1.6, 
                    color: '#475569',
                    textWrap: 'pretty',
                  }}
                >
                  The AI stories that matter for your work, each summed up in one simple line. Updated twice a day.
                </p>
              </div>

              <SignupBox />
            </div>
          </div>
        </section>

        {/* Feed section */}
        <section id="feed" aria-labelledby="feed-title" className="py-12 pb-24 max-sm:py-8 max-sm:pb-16">
          <div className="max-w-[1160px] mx-auto px-6 max-sm:px-5">
            <FilterBar
              sort={sort}
              selectedTags={selectedTags}
              availableTags={AVAILABLE_TAGS}
              onSortChange={handleSortChange}
              onTagToggle={handleTagToggle}
            />

            <FeedList
              items={items}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              error={error}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default App
