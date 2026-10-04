import { useEffect, useState } from 'react'
import type { FeedItem } from '../types'
import { fetchTopStories } from '../lib/feed'
import { navigateTo } from '../lib/routing'
import { trackStoryOpen } from '../lib/analytics'

export function TopStoriesStrip() {
  const [stories, setStories] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTopStories(3)
      .then(setStories)
      .catch(() => setStories([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading || stories.length === 0) return null

  return (
    <section className="mb-8 min-w-0" aria-labelledby="top-stories-title">
      <h2 id="top-stories-title" className="font-display text-[20px] font-semibold text-ink mb-3">
        Today&apos;s top 3
      </h2>
      <ol className="flex flex-col gap-3 list-none p-0 m-0">
        {stories.map((story, index) => (
          <li key={story.id}>
            <button
              type="button"
              onClick={() => {
                trackStoryOpen(story.id)
                navigateTo(`/story/${story.id}`)
              }}
              className="w-full text-left card p-3 sm:p-4 hover:shadow-[var(--shadow-card-hover)] transition-shadow"
            >
              <div className="flex gap-3 items-start">
                <span
                  className="font-display text-[22px] font-semibold text-signal leading-none shrink-0 w-7"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {(story.story_video_count ?? 1) > 1 && (
                    <p className="text-[11px] font-medium text-meta mb-1">
                      {story.story_video_count} videos covering this
                    </p>
                  )}
                  {story.summary && (
                    <p className="text-[16px] sm:text-[17px] leading-snug text-ink font-medium line-clamp-3">
                      {story.summary}
                    </p>
                  )}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
