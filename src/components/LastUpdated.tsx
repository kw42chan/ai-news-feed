import { RefreshCw } from 'lucide-react'

interface LastUpdatedProps {
  timestamp: string | null
}

function formatLastUpdated(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just updated'
  if (diffMins < 60) return `Updated ${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `Updated ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  
  return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

export function LastUpdated({ timestamp }: LastUpdatedProps) {
  if (!timestamp) return null

  return (
    <div className="flex items-center gap-2 text-sm text-[--color-text-muted]">
      <RefreshCw className="w-3.5 h-3.5" />
      <span>{formatLastUpdated(timestamp)}</span>
    </div>
  )
}
