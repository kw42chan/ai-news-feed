import type { FeedItem } from '../types'
import { CirclePlay, MessageCircle, ExternalLink, Lightbulb } from 'lucide-react'

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
  if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M`
  if (score >= 1000) return `${(score / 1000).toFixed(1)}K`
  return score.toString()
}

function SourceBadge({ source }: { source: 'youtube' | 'reddit' | 'x' }) {
  const config = {
    youtube: {
      icon: <CirclePlay className="w-3.5 h-3.5" />,
      label: 'YouTube',
      className: 'bg-[--color-youtube]/10 text-[--color-youtube]',
    },
    reddit: {
      icon: <MessageCircle className="w-3.5 h-3.5" />,
      label: 'Reddit',
      className: 'bg-[--color-reddit]/10 text-[--color-reddit]',
    },
    x: {
      icon: <span className="text-xs font-bold">𝕏</span>,
      label: 'X',
      className: 'bg-white/10 text-white',
    },
  }

  const { icon, label, className } = config[source]

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      {icon}
      {label}
    </span>
  )
}

export function FeedCard({ item }: FeedCardProps) {
  return (
    <article className="group bg-[--color-bg-card] rounded-2xl border border-[--color-border] overflow-hidden hover:border-[--color-accent]/50 hover:bg-[--color-bg-card-hover] transition-all">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {item.thumbnail && (
          <div className="relative aspect-video overflow-hidden">
            <img
              src={item.thumbnail}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[--color-bg-card] to-transparent opacity-60" />
          </div>
        )}

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SourceBadge source={item.source} />
              <span className="text-xs text-[--color-text-muted]">
                {item.source_name}
              </span>
            </div>
            <span className="text-xs text-[--color-text-muted]">
              {formatRelativeTime(item.published_at)}
            </span>
          </div>

          <h3 className="text-[--color-text-primary] font-medium leading-snug line-clamp-2 group-hover:text-[--color-accent] transition-colors">
            {item.title}
            <ExternalLink className="inline-block w-3.5 h-3.5 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>

          {item.summary && (
            <div className="flex gap-2 p-3 bg-[--color-accent]/5 rounded-xl border border-[--color-accent]/20">
              <Lightbulb className="w-4 h-4 text-[--color-accent] shrink-0 mt-0.5" />
              <p className="text-sm text-[--color-text-secondary] leading-relaxed">
                <span className="text-[--color-accent] font-medium">What this means for you: </span>
                {item.summary}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-[--color-bg-secondary] rounded-full text-xs text-[--color-text-muted]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {item.engagement_score > 0 && (
              <span className="text-xs text-[--color-text-muted]">
                {formatEngagement(item.engagement_score)} {item.source === 'youtube' ? 'views' : 'engagement'}
              </span>
            )}
          </div>
        </div>
      </a>
    </article>
  )
}
