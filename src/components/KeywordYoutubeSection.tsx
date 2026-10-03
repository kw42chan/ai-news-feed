import { useEffect, useState } from 'react'
import { fetchKeywordYoutubeVideos, type KeywordYoutubeVideo } from '../lib/keywordVideos'

interface KeywordYoutubeSectionProps {
  keyword: string | null
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (diffDays < 1) return 'Today'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function SkeletonList() {
  return (
    <ul className="space-y-3 list-none p-0 m-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex gap-3 animate-pulse">
          <div className="w-20 h-[45px] rounded-md bg-mist shrink-0" />
          <div className="flex-1 min-w-0 space-y-2 py-1">
            <div className="h-3 bg-mist rounded w-1/3" />
            <div className="h-4 bg-mist rounded w-full" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function KeywordYoutubeSection({ keyword }: KeywordYoutubeSectionProps) {
  const [videos, setVideos] = useState<KeywordYoutubeVideo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!keyword) {
      setVideos([])
      return
    }

    let cancelled = false
    setLoading(true)
    fetchKeywordYoutubeVideos(keyword)
      .then((items) => {
        if (!cancelled) setVideos(items)
      })
      .catch(() => {
        if (!cancelled) setVideos([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [keyword])

  if (!keyword) return null
  if (!loading && videos.length === 0) return null

  return (
    <section
      className="mt-10 pt-8 border-t border-border"
      aria-labelledby="keyword-youtube-title"
    >
      <h2 id="keyword-youtube-title" className="font-display text-[20px] font-semibold text-ink mb-4">
        More on YouTube about &ldquo;{keyword}&rdquo;
      </h2>
      <p className="text-[13px] text-meta mb-4">
        Recent videos we have not summarized yet — opens on YouTube.
      </p>

      {loading ? (
        <SkeletonList />
      ) : (
        <ul className="space-y-3 list-none p-0 m-0">
          {videos.map((video) => (
            <li key={video.videoId}>
              <a
                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 items-start group min-w-0"
              >
                <img
                  src={video.thumbnail}
                  alt=""
                  loading="lazy"
                  className="w-20 h-[45px] rounded-md object-cover shrink-0 bg-mist"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-meta truncate">
                    {video.channelTitle}
                    {video.publishedAt ? ` · ${formatRelativeDate(video.publishedAt)}` : ''}
                  </p>
                  <p className="text-[14px] leading-snug text-ink group-hover:text-signal transition-colors line-clamp-2">
                    {video.title}
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
