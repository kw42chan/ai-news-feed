import type { FeedItem } from '../types'
import { ExternalLink } from 'lucide-react'

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

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatEngagement(score: number): string {
  if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M views`
  if (score >= 1000) return `${(score / 1000).toFixed(1)}K views`
  return `${score} views`
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8z"/>
      <path fill="#fff" d="m9.6 15.6 6.3-3.6-6.3-3.6z"/>
    </svg>
  )
}

export function FeedCard({ item }: FeedCardProps) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-[--color-surface] border border-[--color-border] rounded-[--radius-lg] overflow-hidden transition-all duration-[--dur] hover:-translate-y-0.5 hover:shadow-[--shadow-md] hover:border-[--color-accent-border] focus-visible:shadow-[--ring],var(--shadow-md) focus-visible:rounded-[--radius-lg]"
      style={{ boxShadow: 'var(--shadow-xs)' }}
    >
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-[#E0E7FF] to-[#F1F5F9]">
        {item.thumbnail && (
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover scale-[1.02] transition-transform duration-300 group-hover:scale-105"
          />
        )}
        <span className="absolute right-[--space-3] bottom-[--space-3] inline-flex items-center gap-1.5 h-[26px] px-2.5 pl-2 rounded-[--radius-pill] bg-[rgba(15,23,42,0.72)] text-white text-[11px] font-semibold tracking-wide opacity-0 translate-y-1 transition-all duration-[--dur] group-hover:opacity-100 group-hover:translate-y-0" style={{ backdropFilter: 'blur(4px)' }}>
          <ExternalLink className="w-3 h-3" />
          Watch on YouTube
        </span>
      </div>

      <div className="flex flex-col gap-[--space-3] p-[--space-5] flex-1">
        <div className="flex items-center gap-[--space-2] text-[--text-xs] text-[--color-text-muted]">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[--color-text]">
            <YouTubeIcon className="w-4 h-4 text-[--color-youtube]" />
            {item.source_name}
          </span>
          <span className="w-[3px] h-[3px] rounded-full bg-[--color-border-strong]" />
          <span>{formatRelativeTime(item.published_at)}</span>
        </div>

        <h3 className="m-0 text-[--text-base] leading-[1.45] font-semibold tracking-tight line-clamp-2 min-h-[calc(2em*1.45)] transition-colors duration-[--dur] group-hover:text-[--color-accent] max-sm:min-h-0">
          {item.title}
        </h3>

        {item.summary && (
          <p className="m-0 p-[--space-3] px-[--space-4] bg-[--color-accent-soft] rounded-[--radius-md] text-[--text-sm] leading-[1.55] text-[--color-text-secondary]">
            <strong className="block mb-0.5 text-[--text-xs] font-semibold tracking-wide text-[--color-accent-hover]">
              What this means for you
            </strong>
            {item.summary}
          </p>
        )}

        <div className="flex items-center justify-between gap-[--space-3] mt-auto pt-[--space-1]">
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 min-w-0">
              {item.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-[--radius-pill] bg-[--color-surface-muted] text-[--text-xs] font-medium text-[--color-text-secondary] whitespace-nowrap"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {item.engagement_score > 0 && (
            <span className="shrink-0 text-[--text-xs] text-[--color-text-muted] tabular-nums">
              {formatEngagement(item.engagement_score)}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}
