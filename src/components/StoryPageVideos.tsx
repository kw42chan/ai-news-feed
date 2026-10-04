import { ExternalLink, Play } from 'lucide-react'
import type { FeedItem } from '../types'
import { trackYoutubeClick } from '../lib/analytics'
import { StoryCountPill } from './StoryGroupVideos'

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

function formatFeaturedMeta(video: FeedItem): string {
  const parts = [video.source_name, formatRelativeTime(video.published_at)]
  if (video.engagement_score > 0) {
    parts.push(formatViews(video.engagement_score))
  }
  return parts.join(' · ')
}

function formatListMeta(video: FeedItem): string {
  return `${video.source_name} · ${formatRelativeTime(video.published_at)}`
}

interface StoryPageVideosProps {
  videos: FeedItem[]
  featuredId: string
}

export function StoryPageVideos({ videos, featuredId }: StoryPageVideosProps) {
  if (videos.length === 0) return null

  const featured = videos.find((v) => v.id === featuredId) ?? videos[0]
  const others = videos.filter((v) => v.id !== featured.id)

  return (
    <section className="story-panel story-videos" aria-labelledby="story-videos-title">
      <h2 id="story-videos-title" className="story-videos-heading">
        Watch the videos
        {videos.length > 1 && <StoryCountPill count={videos.length} />}
      </h2>

      <a
        href={featured.url}
        target="_blank"
        rel="noopener noreferrer"
        className="story-lead-video"
        onClick={() => trackYoutubeClick('story_page_lead', featured.id)}
      >
        {featured.thumbnail && (
          <img src={featured.thumbnail} alt="" loading="lazy" />
        )}
        <span className="story-lead-play" aria-hidden="true">
          <Play className="w-[22px] h-[22px] ml-0.5 fill-current" />
        </span>
      </a>

      <p className="story-lead-title">{featured.title}</p>
      <p className="story-lead-meta">{formatFeaturedMeta(featured)}</p>

      <a
        href={featured.url}
        target="_blank"
        rel="noopener noreferrer"
        className="story-watch-btn"
        onClick={() => trackYoutubeClick('story_page', featured.id)}
      >
        Watch on YouTube
        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
      </a>

      {others.length > 0 && (
        <ul className="story-sidebar-video-list">
          {others.map((video) => (
            <li key={video.id}>
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="story-sidebar-video-row"
                onClick={() => trackYoutubeClick('story_page_list', video.id)}
              >
                {video.thumbnail ? (
                  <img src={video.thumbnail} alt="" loading="lazy" />
                ) : (
                  <span className="story-sidebar-video-thumb-placeholder" />
                )}
                <div className="min-w-0">
                  <div className="story-sidebar-video-title">{video.title}</div>
                  <div className="story-sidebar-video-meta">{formatListMeta(video)}</div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
