import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Lightbulb, Loader2, Sparkles, User } from 'lucide-react'
import { fetchFeedItemById, fetchRelatedStories, fetchStoryGroupVideos } from '../lib/feed'
import { trackStoryOpen } from '../lib/analytics'
import { loadGlossary, lookupGlossary } from '../lib/glossary'
import type { GlossaryEntry } from '../lib/glossary'
import { navigateTo } from '../lib/routing'
import type { FeedItem } from '../types'
import { GlossaryTerm } from './GlossaryTerm'
import { ShareFallbackBox, StoryActions } from './StoryActions'
import { storyPageTitles } from '../lib/headline'
import { StoryCountPill } from './StoryGroupVideos'
import { StoryPageVideos } from './StoryPageVideos'
import { SignupBox } from './SignupBox'
import { getStoryPageDemoPayload, STORY_PAGE_DEMO_ID } from '../lib/storyPageDemo'

interface StoryPageProps {
  id: string
}

function formatRelativeUpdated(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `Updated ${diffMins}m ago`
  if (diffHours < 24) return `Updated ${diffHours}h ago`
  if (diffDays < 7) return `Updated ${diffDays}d ago`
  return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export function StoryPage({ id }: StoryPageProps) {
  const [item, setItem] = useState<FeedItem | null>(null)
  const [related, setRelated] = useState<FeedItem[]>([])
  const [groupVideos, setGroupVideos] = useState<FeedItem[]>([])
  const [glossary, setGlossary] = useState<Map<string, GlossaryEntry> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shareFallbackUrl, setShareFallbackUrl] = useState<string | null>(null)

  useEffect(() => {
    if (id === STORY_PAGE_DEMO_ID) {
      const demo = getStoryPageDemoPayload()
      setItem(demo.item)
      setGroupVideos(demo.groupVideos)
      setGlossary(new Map())
      setRelated([])
      document.title = `${demo.item.headline ?? demo.item.title} — AI News, Minus the Noise`
      setLoading(false)
      return
    }

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
        setGroupVideos(group.length > 0 ? group : [story])
        const { heading } = storyPageTitles(story)
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
  const { heading } = storyPageTitles(item)
  const videoCount = groupVideos.length
  const updatedLabel = formatRelativeUpdated(item.updated_at || item.published_at)
  const roles = item.roles?.length ? item.roles : []

  return (
    <div className="story-page">
      <button type="button" className="story-back" onClick={() => navigateTo('/')}>
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        All stories
      </button>

      <div className="story-grid">
        <article className="story-main">
          <div className="story-meta">
            {videoCount > 1 && <StoryCountPill count={videoCount} />}
            {keywords.length > 0 && glossary && (
              <>
                {keywords.map((kw) => (
                  <GlossaryTerm
                    key={kw}
                    label={kw}
                    entry={lookupGlossary(glossary, kw)}
                    className="story-meta-tag"
                    interactive
                  />
                ))}
              </>
            )}
            <span className="story-meta-sep" aria-hidden="true" />
            <span className="story-meta-updated">{updatedLabel}</span>
          </div>

          <h1 className="story-headline">{heading}</h1>

          {item.summary && (
            <section className="story-summary" aria-label="Plain-English summary">
              <p className="story-summary-label">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                In plain English
              </p>
              <p className="story-lede">{item.summary}</p>
            </section>
          )}

          <div className="story-toolbar">
            {roles.length > 0 && (
              <div className="story-roles">
                <User className="w-4 h-4 shrink-0 text-meta" aria-hidden="true" />
                <span className="story-roles-label">Most useful for</span>
                {roles.map((role) => (
                  <span key={role} className="story-role-chip">{role}</span>
                ))}
              </div>
            )}
            <StoryActions
              id={item.id}
              title={item.title}
              summary={item.summary}
              toolbar
              className={roles.length === 0 ? 'ml-auto' : ''}
              onShareFallbackUrl={setShareFallbackUrl}
            />
          </div>
          {shareFallbackUrl && <ShareFallbackBox url={shareFallbackUrl} />}

          {item.key_points && item.key_points.length > 0 && (
            <section className="story-panel" aria-labelledby="key-points-title">
              <h2 id="key-points-title" className="story-panel-title">Key points</h2>
              <ul className="story-points">
                {item.key_points.map((point, index) => (
                  <li key={index}>
                    <span className="story-point-tick" aria-hidden="true">
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {item.try_this && (
            <section className="story-panel story-try" aria-label="Try this tip">
              <h2 className="story-panel-title story-try-title">
                <Lightbulb className="w-5 h-5" aria-hidden="true" />
                Try this
              </h2>
              <p className="story-try-body">{item.try_this}</p>
            </section>
          )}
        </article>

        <aside className="story-aside">
          <StoryPageVideos videos={groupVideos} featuredId={item.id} />
          <SignupBox sidebar />
        </aside>
      </div>

      {related.length > 0 && (
        <section className="story-related" aria-labelledby="related-stories">
          <h2 id="related-stories" className="story-related-title">Related stories</h2>
          <ul className="story-related-list">
            {related.map((story) => (
              <li key={story.id}>
                <button
                  type="button"
                  onClick={() => navigateTo(`/story/${story.id}`)}
                  className="story-related-item"
                >
                  {story.thumbnail && (
                    <img src={story.thumbnail} alt="" className="story-related-thumb" />
                  )}
                  <div className="min-w-0">
                    <p className="story-related-source">{story.source_name}</p>
                    <p className="story-related-summary">{story.summary ?? story.title}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
