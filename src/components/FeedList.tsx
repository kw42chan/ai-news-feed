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
      <div className="flex flex-col items-center justify-center py-20" style={{ color: '#64748B' }}>
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Loading your feed...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'rgba(239, 68, 68, 0.1)' }}
        >
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-medium mb-2" style={{ color: '#0F172A' }}>
          Something went wrong
        </h3>
        <p className="max-w-md" style={{ color: '#64748B' }}>
          {error}
        </p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
        >
          <Inbox className="w-8 h-8" style={{ color: '#64748B' }} />
        </div>
        <h3 className="text-lg font-medium mb-2" style={{ color: '#0F172A' }}>
          No items yet
        </h3>
        <p className="max-w-md" style={{ color: '#64748B' }}>
          The feed is empty. New content will appear here once the ingestion runs.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-sm:gap-5">
        {items.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-12">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="btn-secondary inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              background: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              letterSpacing: '-0.005em',
            }}
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
