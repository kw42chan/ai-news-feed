import { useState } from 'react'
import { Bookmark, Share2 } from 'lucide-react'
import type { FeedItem } from '../types'
import type { GlossaryEntry } from '../lib/glossary'
import { lookupGlossary } from '../lib/glossary'
import { isStorySaved, toggleSavedStory } from '../lib/bookmarks'
import { shareStory } from '../lib/share'
import { navigateTo } from '../lib/routing'
import { GlossaryTerm } from './GlossaryTerm'

interface FeedCardProps {
  item: FeedItem
  glossary: Map<string, GlossaryEntry>
  onBookmarkChange?: () => void
}

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

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8z"/>
      <path fill="#fff" d="m9.6 15.6 6.3-3.6-6.3-3.6z"/>
    </svg>
  )
}

function CardThumbnail({ src, className }: { src: string; className?: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-md bg-mist ${className ?? ''}`}>
      <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
    </div>
  )
}

function KeywordTags({
  item,
  glossary,
}: {
  item: FeedItem
  glossary: Map<string, GlossaryEntry>
}) {
  const labels = item.keywords?.length ? item.keywords.slice(0, 3) : item.tags.slice(0, 2)
  if (labels.length === 0) return null

  return (
    <span className="flex flex-wrap gap-1.5 min-w-0">
      {labels.map((label) => (
        <span key={label} className="text-[12px] text-meta truncate max-w-[8rem]">
          <GlossaryTerm label={label} entry={lookupGlossary(glossary, label)} />
        </span>
      ))}
    </span>
  )
}

export function FeedCard({ item, glossary, onBookmarkChange }: FeedCardProps) {
  const thumbnail = item.thumbnail
  const [saved, setSaved] = useState(() => isStorySaved(item.id))
  const [shareHint, setShareHint] = useState<string | null>(null)

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const nowSaved = toggleSavedStory(item.id)
    setSaved(nowSaved)
    onBookmarkChange?.()
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const result = await shareStory(item.id, item.title, item.summary)
    if (result === 'copied') setShareHint('Link copied')
    else if (result === 'shared') setShareHint('Shared')
    setTimeout(() => setShareHint(null), 2000)
  }

  const handleOpenStory = (e: React.MouseEvent) => {
    e.preventDefault()
    navigateTo(`/story/${item.id}`)
  }

  const actions = (
    <div className="flex items-center gap-1 shrink-0">
      {shareHint && (
        <span className="text-[11px] text-signal mr-1" role="status">{shareHint}</span>
      )}
      <button
        type="button"
        onClick={handleSave}
        className="p-2 rounded-md text-meta hover:text-signal hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        aria-pressed={saved}
        aria-label={saved ? 'Remove bookmark' : 'Save story'}
      >
        {saved ? <Bookmark className="w-4 h-4 fill-signal text-signal" /> : <Bookmark className="w-4 h-4" />}
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="p-2 rounded-md text-meta hover:text-signal hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        aria-label="Share story"
      >
        <Share2 className="w-4 h-4" />
      </button>
    </div>
  )

  return (
    <article className="card overflow-hidden">
      <div className="p-3 sm:p-4">
        <div className="sm:hidden">
          {item.summary && (
            <button
              type="button"
              onClick={handleOpenStory}
              className="summary-box mb-3 w-full text-left"
            >
              <p className="text-[17px] leading-snug text-ink line-clamp-5 font-medium">
                {item.summary}
              </p>
            </button>
          )}
          {item.try_this && (
            <p className="text-[13px] leading-snug text-stone mb-3 pl-2 border-l-2 border-signal/35">
              <span className="font-semibold text-ink">Try this: </span>
              {item.try_this}
            </p>
          )}

          <div className="flex gap-2.5 items-start mb-2">
            {thumbnail && (
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <CardThumbnail src={thumbnail} className="w-24 h-[54px]" />
              </a>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-center flex-wrap text-[12px] text-meta gap-x-1 mb-1">
                <YouTubeIcon className="w-3.5 h-3.5 text-[#FF0000] shrink-0" />
                <span className="font-medium text-stone">{item.source_name}</span>
                <span aria-hidden="true">·</span>
                <span>{formatRelativeTime(item.published_at)}</span>
              </p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <h3 className="text-[13px] font-medium leading-snug text-stone line-clamp-3">
                  {item.title}
                </h3>
              </a>
            </div>
            {actions}
          </div>

          <div className="flex items-center justify-between gap-2 text-[12px] text-meta">
            <KeywordTags item={item} glossary={glossary} />
            {item.engagement_score > 0 && (
              <span className="shrink-0 tabular-nums">{formatViews(item.engagement_score)}</span>
            )}
          </div>
        </div>

        <div className="hidden sm:flex sm:gap-4">
          {thumbnail && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <CardThumbnail src={thumbnail} className="w-[140px] h-[79px]" />
            </a>
          )}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="flex items-center flex-wrap text-[13px] text-meta gap-x-1">
                <YouTubeIcon className="w-4 h-4 text-[#FF0000] shrink-0" />
                <span className="font-medium text-stone">{item.source_name}</span>
                <span aria-hidden="true">·</span>
                <span>{formatRelativeTime(item.published_at)}</span>
              </p>
              {actions}
            </div>

            {item.summary && (
              <button
                type="button"
                onClick={handleOpenStory}
                className="summary-box mb-2 w-full text-left"
              >
                <p className="text-[17px] leading-snug text-ink line-clamp-4 font-medium">
                  {item.summary}
                </p>
              </button>
            )}

            {item.try_this && (
              <p className="text-[13px] leading-snug text-stone mb-2 pl-2 border-l-2 border-signal/35">
                <span className="font-semibold text-ink">Try this: </span>
                {item.try_this}
              </p>
            )}

            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <h3 className="text-[14px] font-medium leading-snug text-stone line-clamp-2 mb-2">
                {item.title}
              </h3>
            </a>

            <div className="flex items-center justify-between gap-2 text-[12px] text-meta mt-auto">
              <KeywordTags item={item} glossary={glossary} />
              {item.engagement_score > 0 && (
                <span className="shrink-0 tabular-nums">{formatViews(item.engagement_score)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
