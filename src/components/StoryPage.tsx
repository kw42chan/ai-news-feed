import { useEffect, useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { fetchFeedItemById, fetchRelatedStories, fetchStoryGroupVideos } from '../lib/feed'
import { trackStoryOpen } from '../lib/analytics'
import { StoryGroupVideos } from './StoryGroupVideos'
import { loadGlossary, lookupGlossary } from '../lib/glossary'
import type { GlossaryEntry } from '../lib/glossary'
import { formatStoryDate } from '../lib/dates'
import { navigateTo } from '../lib/routing'
import type { FeedItem } from '../types'
import { GlossaryTerm } from './GlossaryTerm'
import { StoryActions } from './StoryActions'
import { storyPageTitles } from '../lib/headline'

interface StoryPageProps {
  id: string
}

export function StoryPage({ id }: StoryPageProps) {
  const [item, setItem] = useState<FeedItem | null>(null)
  const [related, setRelated] = useState<FeedItem[]>([])
  const [groupVideos, setGroupVideos] = useState<FeedItem[]>([])
  const [glossary, setGlossary] = useState<Map<string, GlossaryEntry> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchFeedItemById(id), loadGlossary().catch(() => new Map())])
      .then(async ([story, map]) => {
        setItem(story)
        setGlossary(map)
        if (!story) {
          setError('This story could not be found.')
          return
        }
        trackStoryOpen(story.id)
        const [more, group] = await Promise.all([
          fetchRelatedStories(story).catch(() => []),
          fetchStoryGroupVideos(story).catch(() => []),
        ])
        setRelated(more)
        setGroupVideos(group)
        const isMergedGroup = group.length > 1
        const { heading } = storyPageTitles(story, isMergedGroup)
        document.title = `${heading} — AI News, Minus the Noise`
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
      <div className="py-16">
        <p className="text-[15px] text-stone mb-4">{error ?? 'Story not found'}</p>
        <button type="button" className="btn-secondary" onClick={() => navigateTo('/')}>
          Back to stories
        </button>
      </div>
    )
  }

  const keywords = item.keywords?.length ? item.keywords : item.tags.slice(0, 3)
  const isMergedGroup = groupVideos.length > 1
  const { heading, youtubeTitle } = storyPageTitles(item, isMergedGroup)

  return (
    <article className="editorial-page py-10 max-sm:py-8 max-w-[680px]">
      <p className="text-[13px] text-meta mb-3">
        {item.source_name} · {formatStoryDate(item.published_at)}
      </p>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="font-display text-[34px] max-sm:text-[26px] font-semibold text-ink leading-[1.15] tracking-tight">
            {heading}
          </h1>
          {youtubeTitle && (
            <p className="text-[15px] text-stone mt-2 leading-snug">{youtubeTitle}</p>
          )}
        </div>
        <StoryActions id={item.id} title={item.title} summary={item.summary} className="shrink-0 pt-1" />
      </div>

      {item.summary && (
        <p className="text-[18px] leading-relaxed text-stone mb-8">{item.summary}</p>
      )}

      {item.key_points && item.key_points.length > 0 && (
        <section className="mb-8" aria-labelledby="key-points-title">
          <h2 id="key-points-title" className="font-display text-[22px] font-semibold text-ink mb-3">
            Key points
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-[16px] leading-relaxed text-stone">
            {item.key_points.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </section>
      )}

      {item.try_this && (
        <aside className="try-this-callout mb-8" aria-label="Try this tip">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-signal mb-2">Try this</p>
          <p className="text-[16px] leading-relaxed text-ink">{item.try_this}</p>
        </aside>
      )}

      {keywords.length > 0 && glossary && (
        <div className="flex flex-wrap gap-2 mb-8">
          {keywords.map((kw) => (
            <GlossaryTerm
              key={kw}
              label={kw}
              entry={lookupGlossary(glossary, kw)}
              className="chip chip-glossary-tag"
              interactive
            />
          ))}
        </div>
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

      {groupVideos.length > 1 && (
        <div className="mt-10">
          <StoryGroupVideos
            leadId={item.id}
            videos={groupVideos}
            videoCount={groupVideos.length}
            variant="story"
          />
        </div>
      )}

      {related.length > 0 && (
        <section className="mt-14 pt-8 border-t border-border" aria-labelledby="related-stories">
          <h2 id="related-stories" className="font-display text-[22px] font-semibold text-ink mb-4">
            Related stories
          </h2>
          <ul className="space-y-4 list-none p-0 m-0">
            {related.map((story) => (
              <li key={story.id}>
                <button
                  type="button"
                  onClick={() => navigateTo(`/story/${story.id}`)}
                  className="flex gap-3 w-full text-left group/related"
                >
                  {story.thumbnail && (
                    <img
                      src={story.thumbnail}
                      alt=""
                      className="w-20 h-[45px] rounded-md object-cover shrink-0 bg-mist"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-[12px] text-meta mb-0.5">{story.source_name}</p>
                    <p className="text-[15px] leading-snug text-ink group-hover/related:text-signal transition-colors line-clamp-2">
                      {story.summary ?? story.title}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
