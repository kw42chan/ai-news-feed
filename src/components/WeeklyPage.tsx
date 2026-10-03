import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { fetchLatestWeeklyRecap } from '../lib/feed'
import { navigateTo } from '../lib/routing'
import type { WeeklyRecap } from '../types'

export function WeeklyPage() {
  const [recap, setRecap] = useState<WeeklyRecap | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLatestWeeklyRecap()
      .then(setRecap)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
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

  if (error || !recap) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <h1 className="font-display text-[32px] font-semibold text-ink mb-3">This week in AI</h1>
        <p className="text-[15px] text-stone">
          {error ?? 'No weekly recap yet. Check back after the first one is published.'}
        </p>
        <button type="button" className="btn-secondary mt-6" onClick={() => navigateTo('/')}>
          Back to stories
        </button>
      </div>
    )
  }

  const weekLabel = new Date(recap.week_start).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <article className="py-12 max-sm:py-8">
      <p className="text-[13px] font-medium text-meta uppercase tracking-wide mb-2">Weekly recap</p>
      <h1 className="font-display text-[36px] max-sm:text-[28px] font-semibold text-ink leading-tight mb-3">
        {recap.title}
      </h1>
      <p className="text-[14px] text-meta mb-6">Week of {weekLabel}</p>
      <p className="text-[17px] leading-relaxed text-stone mb-10 max-w-[640px]">{recap.intro}</p>

      <ol className="flex flex-col gap-8 list-none p-0 m-0">
        {recap.items.map((item, index) => (
          <li key={index} className="card p-5 sm:p-6">
            <h2 className="text-[20px] font-semibold text-ink mb-2">{item.headline}</h2>
            <p className="text-[16px] leading-relaxed text-stone mb-3">{item.explanation}</p>
            <p className="text-[15px] leading-relaxed text-ink">
              <span className="font-medium text-signal">Why it matters: </span>
              {item.why_it_matters}
            </p>
            {item.feed_item_ids?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {item.feed_item_ids.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="text-[13px] font-medium text-signal hover:underline"
                    onClick={() => navigateTo(`/story/${id}`)}
                  >
                    Read story
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </article>
  )
}
