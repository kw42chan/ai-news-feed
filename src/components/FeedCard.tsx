import { useState } from 'react'
import type { FeedItem } from '../types'
import { navigateTo } from '../lib/routing'
import { fetchStoryGroupVideos } from '../lib/feed'
import { trackStoryOpen, trackYoutubeClick } from '../lib/analytics'
import { ShareFallbackBox, StoryActions } from './StoryActions'
import { StoryCountPill, StoryGroupVideos } from './StoryGroupVideos'

interface FeedCardProps {
  item: FeedItem
  onBookmarkChange?: () => void
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

function CardThumbnail({ src, className }: { src: string; className?: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-md bg-mist ${className ?? ''}`}>
      <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
    </div>
  )
}

function CardMetaRow({
  item,
  videoCount,
  onBookmarkChange,
}: {
  item: FeedItem
  videoCount: number
  onBookmarkChange?: () => void
}) {
  const [shareFallbackUrl, setShareFallbackUrl] = useState<string | null>(null)

  return (
    <div className="min-w-0 w-full">
      <div className="flex items-center gap-2 text-[12px] sm:text-[13px] text-meta min-w-0">
        <div className="source-row-merged flex-1 min-w-0">
          <div className="flex items-center flex-nowrap gap-x-1 min-w-0 overflow-hidden">
            <YouTubeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF0000] shrink-0" />
            <span className="font-medium text-stone truncate">{item.source_name}</span>
            <span aria-hidden="true" className="shrink-0 w-[3px] h-[3px] rounded-full bg-[#CBD5E1]" />
            <span className="shrink-0">{formatRelativeTime(item.published_at)}</span>
            {item.try_this && (
              <span className="hidden sm:inline shrink-0">
                <span aria-hidden="true"> · </span>
                <span className="text-meta not-italic whitespace-nowrap">2-min tip</span>
              </span>
            )}
          </div>
          {videoCount > 1 && <StoryCountPill count={videoCount} />}
        </div>
        <StoryActions
          id={item.id}
          title={item.title}
          summary={item.summary}
          compact
          className="card-actions shrink-0"
          onBookmarkChange={onBookmarkChange}
          onShareFallbackUrl={setShareFallbackUrl}
        />
      </div>
      {shareFallbackUrl && <ShareFallbackBox url={shareFallbackUrl} />}
    </div>
  )
}

export function FeedCard({ item, onBookmarkChange }: FeedCardProps) {
  const thumbnail = item.thumbnail
  const [groupVideos, setGroupVideos] = useState<FeedItem[] | null>(null)
  const videoCount = item.story_video_count ?? 1
  const isMerged = videoCount > 1

  const handleOpenStory = () => {
    trackStoryOpen(item.id)
    navigateTo(`/story/${item.id}`)
  }

  const ensureGroupVideos = async () => {
    if (groupVideos !== null || videoCount <= 1) return
    const videos = await fetchStoryGroupVideos(item).catch(() => [])
    setGroupVideos(videos)
  }

  return (
    <article className={`card group${isMerged ? ' card-story-merged' : ''}`}>
      <div className="p-3 sm:p-4">
        <div className="sm:hidden">
          {item.summary && (
            <button type="button" onClick={handleOpenStory} className="summary-box mb-3 w-full text-left">
              <p className="text-[17px] leading-snug text-ink line-clamp-5 font-medium">{item.summary}</p>
            </button>
          )}

          <div className="flex gap-2.5 items-start mb-2">
            {thumbnail && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackYoutubeClick('feed_card_mobile', item.id)}
              >
                <CardThumbnail src={thumbnail} className="w-24 h-[54px]" />
              </a>
            )}
            <div className="min-w-0 flex-1">
              <CardMetaRow item={item} videoCount={videoCount} onBookmarkChange={onBookmarkChange} />
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="block mt-1">
                <h3 className="text-[13px] font-medium leading-snug text-stone line-clamp-3">{item.title}</h3>
              </a>
            </div>
          </div>

          {isMerged && (
            <StoryGroupVideos
              leadId={item.id}
              videos={groupVideos ?? [item]}
              videoCount={videoCount}
              variant="card"
              onExpand={ensureGroupVideos}
            />
          )}

          {item.engagement_score > 0 && (
            <p className="text-[12px] text-meta tabular-nums mt-2">{formatViews(item.engagement_score)}</p>
          )}
        </div>

        <div className="hidden sm:flex sm:gap-4">
          {thumbnail && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
              onClick={() => trackYoutubeClick('feed_card_desktop', item.id)}
            >
              <CardThumbnail src={thumbnail} className="w-[140px] h-[79px]" />
            </a>
          )}
          <div className="flex-1 min-w-0 flex flex-col">
            <CardMetaRow item={item} videoCount={videoCount} onBookmarkChange={onBookmarkChange} />

            {item.summary && (
              <button type="button" onClick={handleOpenStory} className="summary-box mb-2 mt-2 w-full text-left">
                <p className="text-[17px] leading-snug text-ink line-clamp-4 font-medium">{item.summary}</p>
              </button>
            )}

            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <h3 className="text-[14px] font-medium leading-snug text-stone line-clamp-2 mb-2">{item.title}</h3>
            </a>

            {isMerged && (
              <StoryGroupVideos
                leadId={item.id}
                videos={groupVideos ?? [item]}
                videoCount={videoCount}
                variant="card"
                onExpand={ensureGroupVideos}
              />
            )}

            {item.engagement_score > 0 && (
              <p className="text-[12px] text-meta tabular-nums mt-auto">{formatViews(item.engagement_score)}</p>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
