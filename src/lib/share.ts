export function getStoryShareUrl(id: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/story/${id}`
}

export type ShareResult = 'shared' | 'copied' | 'failed'

export async function shareStory(
  id: string,
  title: string,
  summary: string | null
): Promise<ShareResult> {
  const url = getStoryShareUrl(id)
  const text = summary ?? title

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch {
      // user cancelled or unsupported
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
