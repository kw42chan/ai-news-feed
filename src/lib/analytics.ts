import { track } from '@vercel/analytics'

export function trackSignup(): void {
  track('signup')
}

export function trackStoryOpen(storyId: string): void {
  track('story_open', { story_id: storyId })
}

export function trackShare(storyId: string): void {
  track('share', { story_id: storyId })
}

export function trackSave(storyId: string, saved: boolean): void {
  track('save', { story_id: storyId, saved: saved ? '1' : '0' })
}

export function trackChipClick(keyword: string): void {
  track('chip_click', { keyword })
}

export function trackYoutubeClick(context: string, videoId?: string): void {
  track('youtube_click', { context, video_id: videoId ?? '' })
}
