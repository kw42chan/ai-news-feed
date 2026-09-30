import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { FilterBar } from './components/FilterBar'
import { FeedList } from './components/FeedList'
import { LastUpdated } from './components/LastUpdated'
import { fetchFeed, getLastUpdated } from './lib/feed'
import type { FeedItem, FilterOption, SortOption, SourceKind } from './types'

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

  const [filter, setFilter] = useState<FilterOption>('all')
  const [sort, setSort] = useState<SortOption>('latest')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const getSourceFromFilter = useCallback((): SourceKind[] | undefined => {
    switch (filter) {
      case 'videos':
        return ['youtube']
      case 'discussions':
        return ['reddit']
      default:
        return undefined
    }
  }, [filter])

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
      const source = getSourceFromFilter()
      const response = await fetchFeed({
        source,
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
  }, [filter, sort, selectedTags, cursor, getSourceFromFilter])

  useEffect(() => {
    loadFeed(true)
  }, [filter, sort, selectedTags])

  const handleFilterChange = (newFilter: FilterOption) => {
    setFilter(newFilter)
  }

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
    <div className="min-h-screen bg-[--color-bg-primary]">
      <Header />
      
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[--color-text-primary] mb-2">
            Your AI News Feed
          </h2>
          <p className="text-[--color-text-secondary] mb-4">
            All the AI news you care about from YouTube and Reddit, explained simply.
          </p>
          <LastUpdated timestamp={lastUpdated} />
        </div>

        <div className="mb-6">
          <FilterBar
            filter={filter}
            sort={sort}
            selectedTags={selectedTags}
            availableTags={AVAILABLE_TAGS}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            onTagToggle={handleTagToggle}
          />
        </div>

        <FeedList
          items={items}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          error={error}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
        />
      </main>

      <footer className="border-t border-[--color-border] mt-16">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center text-sm text-[--color-text-muted]">
          <p>
            AI News, Minus the Noise. Built for non-technical professionals who want to keep up with AI.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
