import type { FeedItem } from '../types'

interface FeedCardProps {
  item: FeedItem
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatViews(score: number): string {
  if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M views`
  if (score >= 1000) return `${(score / 1000).toFixed(1)}K views`
  return `${score} views`
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8z"/>
      <path fill="#fff" d="m9.6 15.6 6.3-3.6-6.3-3.6z"/>
    </svg>
  )
}

export function FeedCard({ item }: FeedCardProps) {
  return (
    <article className="card overflow-hidden">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-mist">
          {item.thumbnail && (
            <img
              src={item.thumbnail}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <div className="p-4">
          {/* Meta row: channel, time - using comma, not middle dot */}
          <div className="flex items-center gap-1.5 text-[13px] text-meta mb-2">
            <YouTubeIcon className="w-4 h-4 text-[#FF0000] shrink-0" />
            <span className="font-medium text-stone">{item.source_name}</span>
            <span>,</span>
            <span>{formatRelativeTime(item.published_at)}</span>
          </div>

          {/* Title - secondary to summary */}
          <h3 className="text-[15px] font-semibold leading-snug text-ink line-clamp-2 mb-3">
            {item.title}
          </h3>

          {/* Summary box - THE HERO, THE ONE BOLD ELEMENT */}
          {item.summary && (
            <div className="summary-box mb-3">
              <p className="text-[15px] leading-relaxed text-stone line-clamp-4">
                {item.summary}
              </p>
            </div>
          )}

          {/* Footer: tags, views - comma separated */}
          <div className="flex items-center justify-between gap-2 text-[12px] text-meta">
            {item.tags.length > 0 && (
              <span className="truncate">
                {item.tags.slice(0, 2).join(', ')}
              </span>
            )}
            {item.engagement_score > 0 && (
              <span className="shrink-0 tabular-nums">
                {formatViews(item.engagement_score)}
              </span>
            )}
          </div>
        </div>
      </a>
    </article>
  )
}
