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

function SkeletonRow() {
  return (
    <div className="flex gap-3 max-sm:w-[15rem] max-sm:shrink-0 sm:min-w-0 animate-pulse">
      <div className="w-20 h-[45px] rounded-md bg-mist shrink-0" />
      <div className="flex-1 min-w-0 space-y-2 py-1">
        <div className="h-3 bg-mist rounded w-2/3" />
        <div className="h-4 bg-mist rounded w-full" />
      </div>
    </div>
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
    <section className="mb-8 min-w-0" aria-labelledby="keyword-youtube-title">
      <h2 id="keyword-youtube-title" className="font-display text-[18px] font-semibold text-ink mb-1">
        More on YouTube about &ldquo;{keyword}&rdquo;
      </h2>
      <p className="text-[12px] text-meta mb-3">Opens on YouTube — not summarized here.</p>

      {loading ? (
        <div className="keyword-youtube-scroll max-sm:flex max-sm:gap-3 max-sm:overflow-x-auto max-sm:pb-1 sm:grid sm:grid-cols-2 sm:gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : (
        <div className="keyword-youtube-scroll max-sm:flex max-sm:gap-3 max-sm:overflow-x-auto max-sm:pb-1 sm:grid sm:grid-cols-2 sm:gap-3">
          {videos.map((video) => (
            <a
              key={video.videoId}
              href={`https://www.youtube.com/watch?v=${video.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-2.5 items-start group min-w-0 max-sm:w-[15rem] max-sm:max-w-[15rem] max-sm:shrink-0 card p-2.5"
            >
              <img
                src={video.thumbnail}
                alt=""
                loading="lazy"
                className="w-[72px] h-[40px] rounded object-cover shrink-0 bg-mist"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-meta truncate">
                  {video.channelTitle}
                  {video.publishedAt ? ` · ${formatRelativeDate(video.publishedAt)}` : ''}
                </p>
                <p className="text-[13px] leading-snug text-ink group-hover:text-signal transition-colors line-clamp-2 break-words">
                  {video.title}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
