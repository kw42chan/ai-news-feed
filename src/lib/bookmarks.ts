const BOOKMARKS_KEY = 'ai-news-feed-saved-stories'

export function getSavedStoryIds(): string[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function isStorySaved(id: string): boolean {
  return getSavedStoryIds().includes(id)
}

export function toggleSavedStory(id: string): boolean {
  const ids = getSavedStoryIds()
  const exists = ids.includes(id)
  const next = exists ? ids.filter((x) => x !== id) : [...ids, id]
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next))
  return !exists
}
