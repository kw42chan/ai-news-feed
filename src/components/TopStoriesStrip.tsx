import { useEffect, useState } from 'react'
import { Layers, Zap } from 'lucide-react'
import type { FeedItem } from '../types'
import { fetchStoryGroupVideos, fetchTopStories } from '../lib/feed'
import { navigateTo } from '../lib/routing'
import { trackStoryOpen } from '../lib/analytics'
import { topStoryDisplayTitle } from '../lib/headline'

function formatTop3Date(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function formatChannelMeta(videos: FeedItem[], leadId: string): string {
  const lead = videos.find((v) => v.id === leadId)
  const others = videos.filter((v) => v.id !== leadId)
  if (others.length === 0) return lead?.source_name ?? ''
  const names = others.slice(0, 2).map((v) => v.source_name)
  const extra = others.length - names.length
  if (names.length === 0) return lead?.source_name ?? ''
  const joined = names.join(', ')
  if (extra > 0) return `${joined} +${extra}`
  return joined
}

function CountPill({ count }: { count: number }) {
  return (
    <span className="story-count-pill">
      <Layers className="w-3 h-3" aria-hidden="true" />
      {count} videos
    </span>
  )
}

export function TopStoriesStrip() {
  const [stories, setStories] = useState<FeedItem[]>([])
  const [groupById, setGroupById] = useState<Record<string, FeedItem[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTopStories(3)
      .then(async (items) => {
        setStories(items)
        const groups: Record<string, FeedItem[]> = {}
        await Promise.all(
          items
            .filter((s) => (s.story_video_count ?? 1) > 1)
            .map(async (story) => {
              const videos = await fetchStoryGroupVideos(story).catch(() => [story])
              groups[story.id] = videos
            })
        )
        setGroupById(groups)
      })
      .catch(() => setStories([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading || stories.length === 0) return null

  return (
    <section className="top3 mb-6 lg:mb-8 min-w-0" aria-labelledby="top3-title">
      <div className="top3-panel">
        <div className="top3-head">
          <div className="top3-title-row">
            <div className="top3-icon" aria-hidden="true">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 id="top3-title" className="font-display text-[20px] font-semibold text-ink leading-tight m-0">
                Today&apos;s top 3
              </h2>
              <p className="text-[14px] text-stone m-0 mt-0.5">
                The three AI stories worth your time today.
              </p>
            </div>
          </div>
          <span className="top3-date max-sm:hidden">{formatTop3Date()}</span>
        </div>

        <ol className="top3-list">
          {stories.map((story, index) => {
            const count = story.story_video_count ?? 1
            const group = groupById[story.id]
            const meta =
              count > 1 && group?.length
                ? formatChannelMeta(group, story.id)
                : story.source_name

            return (
              <li key={story.id}>
                <button
                  type="button"
                  className="top3-item"
                  onClick={() => {
                    trackStoryOpen(story.id)
                    navigateTo(`/story/${story.id}`)
                  }}
                >
                  <span className="top3-num" aria-hidden="true">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="top3-item-title line-clamp-2">{topStoryDisplayTitle(story)}</h3>
                    {story.summary && (
                      <p className="top3-item-summary line-clamp-3">{story.summary}</p>
                    )}
                    <div className="top3-meta">
                      {count > 1 && <CountPill count={count} />}
                      <span className="truncate">{meta}</span>
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
