/** Format a date-only `YYYY-MM-DD` as a calendar week range (Mon–Sun) without timezone shift. */
export function formatRecapWeekRange(weekStart: string): string {
  const parts = weekStart.split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return weekStart
  }
  const [y, m, d] = parts
  const start = new Date(Date.UTC(y, m - 1, d))
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)

  const fmt = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

  return `Week of ${fmt(start)} – ${fmt(end)}`
}

export function formatStoryDate(publishedAt: string): string {
  const date = new Date(publishedAt)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
