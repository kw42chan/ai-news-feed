import { useState } from 'react'
import type { FeedItem } from '../types'
import { trackYoutubeClick } from '../lib/analytics'

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
  const toggleLabel = `${count} video${count === 1 ? '' : 's'} on this`

  const handleToggle = () => {
    if (!expanded) onExpand?.()
    setExpanded((v) => !v)
  }

  if (variant === 'card') {
    return (
      <div className="mt-2">
        <button
          type="button"
          className="text-[12px] font-medium text-signal hover:underline"
          onClick={handleToggle}
          aria-expanded={expanded}
        >
          {expanded ? 'Hide videos' : toggleLabel}
        </button>
        {expanded && (
          <ul className="mt-2 space-y-2 border-t border-border pt-2 list-none p-0 m-0">
            {others.map((video) => (
              <li key={video.id} className="text-[13px] leading-snug">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink hover:text-signal"
                  onClick={() => trackYoutubeClick('story_group_card', video.id)}
                >
                  <span className="font-medium">{video.source_name}</span>
                  <span className="text-stone"> — {video.title}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <section className="mb-8" aria-labelledby="group-videos-title">
      <h2 id="group-videos-title" className="font-display text-[22px] font-semibold text-ink mb-3">
        More videos on this story
      </h2>
      <ul className="space-y-3 list-none p-0 m-0">
        {others.map((video) => (
          <li key={video.id} className="card p-3">
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 items-start group"
              onClick={() => trackYoutubeClick('story_group_page', video.id)}
            >
              {video.thumbnail && (
                <img
                  src={video.thumbnail}
                  alt=""
                  className="w-20 h-[45px] rounded object-cover shrink-0 bg-mist"
                  loading="lazy"
                />
              )}
              <div className="min-w-0">
                <p className="text-[12px] text-meta mb-0.5">{video.source_name}</p>
                <p className="text-[14px] text-ink group-hover:text-signal leading-snug">{video.title}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
