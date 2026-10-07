import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { fetchFeedTitlesByIds, fetchLatestWeeklyRecap } from '../lib/feed'
import { formatRecapWeekRange } from '../lib/dates'
import { isSchemaMismatchError } from '../lib/postgrest'
import { navigateTo } from '../lib/routing'
import type { WeeklyRecap, WeeklyRecapItem } from '../types'

export function WeeklyPage() {
  const [recap, setRecap] = useState<WeeklyRecap | null>(null)
  const [storyTitles, setStoryTitles] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [emptyFriendly, setEmptyFriendly] = useState(false)

  useEffect(() => {
    fetchLatestWeeklyRecap()
      .then(async (data) => {
        if (!data) {
          setEmptyFriendly(true)
          return
        }
        setRecap(data)
        const ids = (Array.isArray(data.items) ? data.items : []).flatMap(
          (item) => item.feed_item_ids ?? []
        )
        const titles = await fetchFeedTitlesByIds(ids)
        setStoryTitles(titles)
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : ''
        if (isSchemaMismatchError(message) || message.includes('weekly_recaps')) {
          setEmptyFriendly(true)
        } else {
          setEmptyFriendly(true)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-meta">
        <Loader2 className="w-6 h-6 animate-spin mb-3" />
        <p className="text-[14px]">Loading this week&apos;s recap...</p>
      </div>
    )
  }

  if (emptyFriendly || !recap) {
    return (
      <div className="editorial-page py-12 max-sm:py-8 max-w-[680px]">
        <p className="text-[13px] font-medium text-meta uppercase tracking-wide mb-2">Weekly recap</p>
        <h1 className="font-display text-[36px] max-sm:text-[28px] font-semibold text-ink leading-tight mb-4">
          This week in AI
        </h1>
        <p className="text-[17px] leading-relaxed text-stone mb-8">
          The first weekly recap arrives Monday morning. It will sum up the biggest AI shifts from the past week in plain English.
        </p>
        <button type="button" className="btn-secondary" onClick={() => navigateTo('/')}>
          Back to stories
        </button>
      </div>
    )
  }

  const items: WeeklyRecapItem[] = Array.isArray(recap.items) ? recap.items : []
  const weekLabel = formatRecapWeekRange(recap.week_start)

  return (
    <article className="editorial-page py-12 max-sm:py-8 max-w-[680px]">
      <p className="text-[13px] font-medium text-meta uppercase tracking-wide mb-2">Weekly recap</p>
      <h1 className="font-display text-[38px] max-sm:text-[30px] font-semibold text-ink leading-[1.12] tracking-tight mb-3">
        {recap.title}
      </h1>
      <p className="text-[14px] text-meta mb-8">{weekLabel}</p>
      <p className="text-[18px] leading-relaxed text-stone mb-12">{recap.intro}</p>

      {items.length > 0 && (
        <ol className="flex flex-col gap-12 list-none p-0 m-0">
          {items.map((item, index) => (
            <li key={index} className="border-t border-border pt-8 first:border-t-0 first:pt-0">
              <h2 className="font-display text-[24px] font-semibold text-ink mb-3 leading-snug">
                {item.headline}
              </h2>
              <p className="text-[17px] leading-relaxed text-stone mb-4">{item.explanation}</p>
              <p className="text-[16px] leading-relaxed text-ink">
                <span className="font-medium text-signal">Why it matters: </span>
                {item.why_it_matters}
              </p>
              {Array.isArray(item.feed_item_ids) && item.feed_item_ids.length > 0 && (
                <ul className="mt-5 space-y-2 list-none p-0 m-0">
                  {item.feed_item_ids.map((storyId) => (
                    <li key={storyId}>
                      <button
                        type="button"
                        className="text-[14px] font-medium text-signal hover:underline text-left"
                        onClick={() => navigateTo(`/story/${storyId}`)}
                      >
                        {storyTitles.get(storyId) ?? 'Read full story'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}
