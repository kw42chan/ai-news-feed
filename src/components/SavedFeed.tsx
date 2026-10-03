import { useState, useEffect, useCallback } from 'react'
import { FeedList } from './FeedList'
import { fetchFeed } from '../lib/feed'
import { getSavedStoryIds } from '../lib/bookmarks'
import { navigateTo } from '../lib/routing'

export function SavedFeed() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchFeed>>['items']>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookmarkTick, setBookmarkTick] = useState(0)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const savedIds = getSavedStoryIds()
      const response = await fetchFeed({ savedIds, sort: 'latest', limit: 100 })
      setItems(response.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved stories')
    } finally {
      setIsLoading(false)
    }
  }, [bookmarkTick])

  useEffect(() => {
    load()
  }, [load])

  return (
    <main className="py-12 max-sm:py-8">
      <div className="max-w-[800px] mx-auto px-6 max-sm:px-4">
        <h1 className="font-display text-[32px] font-semibold text-ink mb-2">Saved stories</h1>
        <p className="text-[15px] text-stone mb-8">
          Stories you bookmarked on this device. They are not synced to an account.
        </p>
        <FeedList
          items={items}
          isLoading={isLoading}
          isLoadingMore={false}
          error={error}
          hasMore={false}
          onLoadMore={() => {}}
          onBookmarkChange={() => setBookmarkTick((t) => t + 1)}
          emptyMessage="You have not saved any stories yet. Tap the bookmark on a story to add one."
        />
        <button type="button" className="btn-secondary mt-8" onClick={() => navigateTo('/')}>
          Back to latest stories
        </button>
      </div>
    </main>
  )
}
