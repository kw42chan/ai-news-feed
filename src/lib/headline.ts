import type { FeedItem } from '../types'

/** Top 3 strip: always prefer AI headline when present. */
export function topStoryDisplayTitle(item: FeedItem): string {
  const h = item.headline?.trim()
  return h || item.title
}

/** Merged feed cards: headline with title fallback; singles keep YouTube title. */
export function feedCardDisplayTitle(item: FeedItem): string {
  const merged = (item.story_video_count ?? 1) > 1
  if (!merged) return item.title
  const h = item.headline?.trim()
  return h || item.title
}

export function storyPageHeading(item: FeedItem): string {
  const h = item.headline?.trim()
  return h || item.title
}

export function storyPageTitles(
  item: FeedItem,
  isMergedGroup: boolean
): { heading: string; youtubeTitle?: string } {
  const heading = storyPageHeading(item)
  const showYoutubeSubtitle =
    isMergedGroup || (item.headline?.trim() && item.headline.trim() !== item.title)
  return {
    heading,
    youtubeTitle: showYoutubeSubtitle ? item.title : undefined,
  }
}
