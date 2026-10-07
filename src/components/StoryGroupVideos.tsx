import { useState } from 'react'
import { ChevronDown, Layers } from 'lucide-react'
import type { FeedItem } from '../types'
import { navigateTo } from '../lib/routing'
import { trackStoryOpen, trackYoutubeClick } from '../lib/analytics'

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

export function StoryCountPill({ count }: { count: number }) {
  return (
    <span className="story-count-pill">
      <Layers className="w-3 h-3" aria-hidden="true" />
      {count} videos
    </span>
  )
}

function coverageLabel(videos: FeedItem[], leadId: string): string {
  const others = videos.filter((v) => v.id !== leadId)
  if (others.length === 0) return ''
  if (others.length <= 2) {
    return `Also on ${others.map((v) => v.source_name).join(', ')}`
  }
  return `Also on ${others.length} more channels`
}

interface StoryGroupVideosProps {
  leadId: string
  videos: FeedItem[]
  videoCount: number
  variant?: 'card' | 'story'
  onExpand?: () => void
}

export function StoryGroupVideos({
  leadId,
  videos,
  videoCount,
  variant = 'card',
  onExpand,
}: StoryGroupVideosProps) {
  const [expanded, setExpanded] = useState(false)

  const others = videos.filter((v) => v.id !== leadId)
  if (videoCount <= 1 && others.length === 0) return null

  const count = Math.max(videoCount, videos.length)

  const handleToggle = () => {
    if (!expanded) onExpand?.()
    setExpanded((v) => !v)
  }

  if (variant === 'card') {
    const names = coverageLabel(videos.length > 1 ? videos : [videos[0]], leadId)

    return (
      <div className="mt-3">
        <div className="story-coverage">
          <div className="story-coverage-names">{names || 'Also on other channels'}</div>
          <button
            type="button"
            className={`story-more-btn${expanded ? ' is-open' : ''}`}
            onClick={handleToggle}
            aria-expanded={expanded}
          >
            {expanded ? `Hide ${count}` : `All ${count}`}
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
        {expanded && others.length > 0 && (
          <ul className="story-video-list">
            {others.map((video) => (
              <li key={video.id} className="story-video-list-item">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="story-video-list-thumb"
                  onClick={() => trackYoutubeClick('story_group_card_thumb', video.id)}
                >
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt="" loading="lazy" />
                  ) : (
                    <span className="w-16 h-9 rounded-md bg-mist shrink-0 block" />
                  )}
                </a>
                <button
                  type="button"
                  className="story-video-list-story-btn"
                  onClick={() => {
                    trackStoryOpen(video.id)
                    navigateTo(`/story/${video.id}`)
                  }}
                >
                  <div className="v-title">{video.title}</div>
                  <div className="v-meta">
                    {video.source_name} · {formatRelativeTime(video.published_at)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  const allVideos = videos.length > 0 ? videos : others

  return (
    <section className="mb-8" aria-labelledby="group-videos-title">
      <h2 id="group-videos-title" className="font-display text-[22px] font-semibold text-ink mb-3">
        Videos on this story
      </h2>
      <ul className="story-video-list">
        {allVideos.map((video) => (
          <li key={video.id} className="story-video-list-item">
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="story-video-list-thumb"
              onClick={() => trackYoutubeClick('story_group_page_thumb', video.id)}
            >
              {video.thumbnail ? (
                <img src={video.thumbnail} alt="" loading="lazy" />
              ) : (
                <span className="w-16 h-9 rounded-md bg-mist shrink-0 block" />
              )}
            </a>
            <button
              type="button"
              className="story-video-list-story-btn"
              onClick={() => {
                trackStoryOpen(video.id)
                navigateTo(`/story/${video.id}`)
              }}
            >
              <div className="v-title">{video.title}</div>
              <div className="v-meta">
                {video.source_name} · {formatRelativeTime(video.published_at)}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
