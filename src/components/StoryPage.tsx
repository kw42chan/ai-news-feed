import { useEffect, useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { fetchFeedItemById } from '../lib/feed'
import { loadGlossary, lookupGlossary } from '../lib/glossary'
import type { GlossaryEntry } from '../lib/glossary'
import { navigateTo } from '../lib/routing'
import type { FeedItem } from '../types'
import { GlossaryTerm } from './GlossaryTerm'

interface StoryPageProps {
  id: string
}

export function StoryPage({ id }: StoryPageProps) {
  const [item, setItem] = useState<FeedItem | null>(null)
  const [glossary, setGlossary] = useState<Map<string, GlossaryEntry> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchFeedItemById(id), loadGlossary().catch(() => new Map())])
      .then(([story, map]) => {
        setItem(story)
        setGlossary(map)
        if (!story) setError('This story could not be found.')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-meta">
        <Loader2 className="w-6 h-6 animate-spin mb-3" />
        <p className="text-[14px]">Loading story...</p>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="py-16 text-center">
        <p className="text-[15px] text-stone mb-4">{error ?? 'Story not found'}</p>
        <button type="button" className="btn-secondary" onClick={() => navigateTo('/')}>
          Back to stories
        </button>
      </div>
    )
  }

  const keywords = item.keywords?.length ? item.keywords : item.tags.slice(0, 3)

  return (
    <article className="py-12 max-sm:py-8 max-w-[720px]">
      {item.thumbnail && (
        <img
          src={item.thumbnail}
          alt=""
          className="w-full max-h-[280px] object-cover rounded-md mb-6"
        />
      )}
      <p className="text-[13px] text-meta mb-2">{item.source_name}</p>
      <h1 className="font-display text-[28px] max-sm:text-[24px] font-semibold text-ink leading-snug mb-4">
        {item.title}
      </h1>
      {item.summary && (
        <div className="summary-box mb-4">
          <p className="text-[17px] leading-relaxed text-ink font-medium">{item.summary}</p>
        </div>
      )}
      {item.try_this && (
        <p className="text-[14px] leading-relaxed text-stone mb-4 pl-3 border-l-2 border-signal/40">
          <span className="font-semibold text-ink">Try this: </span>
          {item.try_this}
        </p>
      )}
      {keywords.length > 0 && glossary && (
        <p className="text-[13px] text-meta flex flex-wrap gap-x-2 gap-y-1 mb-6">
          {keywords.map((kw) => (
            <GlossaryTerm
              key={kw}
              label={kw}
              entry={lookupGlossary(glossary, kw)}
              className="chip !py-0.5 !px-2 !text-[12px]"
            />
          ))}
        </p>
      )}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary inline-flex items-center gap-2"
      >
        Watch on YouTube
        <ExternalLink className="w-4 h-4" />
      </a>
    </article>
  )
}
