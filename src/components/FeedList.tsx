import { FeedCard } from './FeedCard'
import type { FeedItem } from '../types'
import type { GlossaryEntry } from '../lib/glossary'
import { Loader2, AlertCircle, Inbox } from 'lucide-react'

interface FeedListProps {
  items: FeedItem[]
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  hasMore: boolean
  onLoadMore: () => void
  glossary?: Map<string, GlossaryEntry>
  onBookmarkChange?: () => void
  bookmarkTick?: number
  emptyMessage?: string
}

export function FeedList({
  items,
  isLoading,
  isLoadingMore,
  error,
  hasMore,
  onLoadMore,
  glossary = new Map(),
  onBookmarkChange,
  emptyMessage,
}: FeedListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-meta">
        <Loader2 className="w-6 h-6 animate-spin mb-3" />
        <p className="text-[14px]">Loading stories...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-[15px] font-medium text-ink mb-1">Something went wrong</p>
        <p className="text-[14px] text-meta max-w-xs">{error}</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-mist flex items-center justify-center mb-3">
          <Inbox className="w-6 h-6 text-meta" />
        </div>
        <p className="text-[15px] font-medium text-ink mb-1">No stories yet</p>
        <p className="text-[14px] text-meta max-w-xs">
          {emptyMessage ?? 'New content will appear here once the ingestion runs.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <FeedCard
            key={item.id}
            item={item}
            glossary={glossary}
            onBookmarkChange={onBookmarkChange}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-10">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="btn-secondary"
          >
            {isLoadingMore ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </span>
            ) : (
              'Load more'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
