import { FeedCard } from './FeedCard'
import type { FeedItem } from '../types'
import { Loader2, AlertCircle, Inbox } from 'lucide-react'

interface FeedListProps {
  items: FeedItem[]
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  hasMore: boolean
  onLoadMore: () => void
}

export function FeedList({
  items,
  isLoading,
  isLoadingMore,
  error,
  hasMore,
  onLoadMore,
}: FeedListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[--color-text-muted]">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Loading your feed...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-medium text-[--color-text-primary] mb-2">
          Something went wrong
        </h3>
        <p className="text-[--color-text-muted] max-w-md">
          {error}
        </p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-[--color-bg-card] flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-[--color-text-muted]" />
        </div>
        <h3 className="text-lg font-medium text-[--color-text-primary] mb-2">
          No items yet
        </h3>
        <p className="text-[--color-text-muted] max-w-md">
          The feed is empty. New content will appear here once the ingestion runs.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {items.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 px-6 py-3 bg-[--color-bg-card] hover:bg-[--color-bg-card-hover] border border-[--color-border] rounded-xl text-[--color-text-primary] font-medium transition-all disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load more'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
