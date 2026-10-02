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
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-[--text-lg] font-medium text-[--color-text] mb-2">
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
        <div className="w-16 h-16 rounded-full bg-[--color-surface] border border-[--color-border] flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-[--color-text-muted]" />
        </div>
        <h3 className="text-[--text-lg] font-medium text-[--color-text] mb-2">
          No items yet
        </h3>
        <p className="text-[--color-text-muted] max-w-md">
          The feed is empty. New content will appear here once the ingestion runs.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[--space-6] max-sm:gap-[--space-5]">
        {items.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-[--space-12]">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center justify-center gap-[--space-2] h-11 px-[--space-5] rounded-[--radius-md] border border-[--color-border] bg-[--color-surface] text-[--color-text] text-[--text-sm] font-semibold tracking-tight whitespace-nowrap cursor-pointer transition-all duration-[--dur] hover:border-[--color-accent-border] hover:text-[--color-accent] hover:shadow-[--shadow-sm] hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            style={{ boxShadow: 'var(--shadow-xs)' }}
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
