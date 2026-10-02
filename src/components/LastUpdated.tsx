interface LastUpdatedProps {
  timestamp: string | null
}

function formatLastUpdated(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Updated just now'
  if (diffMins < 60) return `Updated ${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `Updated ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `Updated ${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export function LastUpdated({ timestamp }: LastUpdatedProps) {
  if (!timestamp) return null

  return (
    <span
      className="inline-flex items-center gap-[--space-2] py-1.5 px-3 pl-2.5 rounded-[--radius-pill] bg-[--color-surface] border border-[--color-border] text-[--text-xs] font-medium text-[--color-text-secondary]"
      style={{ boxShadow: 'var(--shadow-xs)' }}
    >
      <span
        className="w-2 h-2 rounded-full bg-[#10B981]"
        style={{ boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.18)' }}
        aria-hidden="true"
      />
      {formatLastUpdated(timestamp)}
    </span>
  )
}
