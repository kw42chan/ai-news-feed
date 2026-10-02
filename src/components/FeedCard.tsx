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

function YouTubeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style}>
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
      className="card-hover group flex flex-col rounded-2xl overflow-hidden"
      style={{ 
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div 
        className="card-thumb relative aspect-video overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #E0E7FF, #F1F5F9)' }}
      >
        {item.thumbnail && (
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300"
            style={{ transform: 'scale(1.02)' }}
          />
        )}
        <span 
          className="card-play absolute right-3 bottom-3 inline-flex items-center gap-1.5 h-[26px] px-2.5 pl-2 rounded-full text-white text-[11px] font-semibold opacity-0 translate-y-1 transition-all duration-150"
          style={{ 
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(4px)',
            letterSpacing: '0.01em',
          }}
        >
          <ExternalLink className="w-3 h-3" />
          Watch on YouTube
        </span>
      </div>

      <div className="flex flex-col gap-3 p-5 flex-1">
        <div className="flex items-center gap-2 text-xs" style={{ color: '#64748B' }}>
          <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: '#0F172A' }}>
            <YouTubeIcon className="w-4 h-4" style={{ color: '#FF0033' }} />
            {item.source_name}
          </span>
          <span className="w-[3px] h-[3px] rounded-full" style={{ background: '#CBD5E1' }} />
          <span>{formatRelativeTime(item.published_at)}</span>
        </div>

        <h3 
          className="card-title m-0 text-base font-semibold line-clamp-2 transition-colors duration-150 max-sm:min-h-0"
          style={{ 
            lineHeight: 1.45, 
            letterSpacing: '-0.011em',
            color: '#0F172A',
            minHeight: 'calc(2em * 1.45)',
          }}
        >
          {item.title}
        </h3>

        {item.summary && (
          <p 
            className="m-0 p-3 px-4 rounded-xl text-sm"
            style={{ 
              background: '#EEF2FF',
              lineHeight: 1.55,
              color: '#475569',
            }}
          >
            <strong 
              className="block mb-0.5 text-xs font-semibold"
              style={{ letterSpacing: '0.02em', color: '#4338CA' }}
            >
              What this means for you
            </strong>
            {item.summary}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 mt-auto pt-1">
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 min-w-0">
              {item.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                  style={{ background: '#F1F5F9', color: '#475569' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {item.engagement_score > 0 && (
            <span 
              className="shrink-0 text-xs"
              style={{ color: '#64748B', fontVariantNumeric: 'tabular-nums' }}
            >
              {formatEngagement(item.engagement_score)}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}
