import { decodeHtmlEntities } from './decodeHtmlEntities'

export interface KeywordYoutubeVideo {
  videoId: string
  title: string
  channelTitle: string
  publishedAt: string
  thumbnail: string
}

export async function fetchKeywordYoutubeVideos(
  keyword: string
): Promise<KeywordYoutubeVideo[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
    return []
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/keyword-videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
      },
      body: JSON.stringify({ keyword }),
    })

    if (!response.ok) return []

    const data = (await response.json()) as { videos?: KeywordYoutubeVideo[] }
    if (!Array.isArray(data.videos)) return []

    return data.videos.map((video) => ({
      ...video,
      title: decodeHtmlEntities(video.title),
      channelTitle: decodeHtmlEntities(video.channelTitle),
    }))
  } catch {
    return []
  }
}
