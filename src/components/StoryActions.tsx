import { useState } from 'react'
import { Bookmark, Share2 } from 'lucide-react'
import { isStorySaved, toggleSavedStory } from '../lib/bookmarks'
import { getStoryShareUrl, shareStory } from '../lib/share'
import { trackSave, trackShare } from '../lib/analytics'

interface StoryActionsProps {
  id: string
  title: string
  summary: string | null
  compact?: boolean
  className?: string
  onBookmarkChange?: () => void
  /** When set, share-fallback UI is rendered by the parent (e.g. below card meta). */
  onShareFallbackUrl?: (url: string | null) => void
}

export function StoryActions({
  id,
  title,
  summary,
  compact = false,
  className = '',
  onBookmarkChange,
  onShareFallbackUrl,
}: StoryActionsProps) {
  const [saved, setSaved] = useState(() => isStorySaved(id))
  const [shareHint, setShareHint] = useState<string | null>(null)
  const [localFallbackUrl, setLocalFallbackUrl] = useState<string | null>(null)

  const iconClass = compact ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const btnClass = compact
    ? 'p-1 rounded text-meta hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal'
    : 'p-2 rounded-md text-meta hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal'

  const handleSave = () => {
    const next = toggleSavedStory(id)
    setSaved(next)
    trackSave(id, next)
    onBookmarkChange?.()
  }

  const handleShare = async () => {
    onShareFallbackUrl?.(null)
    setLocalFallbackUrl(null)
    const result = await shareStory(id, title, summary)
    trackShare(id)
    if (result === 'copied') {
      setShareHint('Link copied')
      setTimeout(() => setShareHint(null), 2000)
    } else if (result === 'shared') {
      setShareHint('Shared')
      setTimeout(() => setShareHint(null), 2000)
    } else {
      const url = getStoryShareUrl(id)
      if (onShareFallbackUrl) onShareFallbackUrl(url)
      else setLocalFallbackUrl(url)
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-0.5">
        {shareHint && (
          <span className="text-[11px] text-signal mr-1" role="status">{shareHint}</span>
        )}
        <button
          type="button"
          onClick={handleSave}
          className={btnClass}
          aria-pressed={saved}
          aria-label={saved ? 'Remove bookmark' : 'Save story'}
        >
          {saved ? (
            <Bookmark className={`${iconClass} fill-signal text-signal`} />
          ) : (
            <Bookmark className={iconClass} />
          )}
        </button>
        <button type="button" onClick={handleShare} className={btnClass} aria-label="Share story">
          <Share2 className={iconClass} />
        </button>
      </div>
      {!onShareFallbackUrl && localFallbackUrl && <ShareFallbackBox url={localFallbackUrl} />}
    </div>
  )
}

export function ShareFallbackBox({ url }: { url: string }) {
  return (
    <div className="mt-2 text-[12px] text-stone max-w-xs" role="status">
      <p className="mb-1">Copy this link:</p>
      <input
        type="text"
        readOnly
        value={url}
        className="input-field w-full text-[12px] py-1.5"
        onFocus={(e) => e.target.select()}
      />
    </div>
  )
}
