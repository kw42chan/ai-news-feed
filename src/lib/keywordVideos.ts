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
    return Array.isArray(data.videos) ? data.videos : []
  } catch {
    return []
  }
}
