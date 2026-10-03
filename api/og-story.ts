import type { VercelRequest, VercelResponse } from '@vercel/node'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawId = typeof req.query.id === 'string' ? req.query.id : ''
  if (!UUID_RE.test(rawId)) {
    res.status(404).send('Not found')
    return
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).send('Supabase not configured')
    return
  }

  const encodedId = encodeURIComponent(rawId)
  const response = await fetch(
    `${supabaseUrl}/rest/v1/feed_items?id=eq.${encodedId}&hidden=eq.false&select=title,summary,thumbnail,url`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  )

  if (!response.ok) {
    res.status(404).send('Story not found')
    return
  }

  const raw: unknown = await response.json()
  if (!Array.isArray(raw) || raw.length === 0) {
    res.status(404).send('Story not found')
    return
  }
  const item = raw[0] as {
    title?: string
    summary?: string
    thumbnail?: string
    url?: string
  }
  if (!item) {
    res.status(404).send('Story not found')
    return
  }

  const title = escapeHtml(item.title ?? 'AI News story')
  const description = escapeHtml(item.summary ?? item.title ?? '')
  const image = escapeHtml(item.thumbnail ?? '')
  const hostHeader = req.headers['x-forwarded-host'] ?? req.headers.host
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader ?? 'ai-news-feed.vercel.app'
  const protoHeader = req.headers['x-forwarded-proto'] ?? 'https'
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader
  const pageUrl = escapeHtml(`${proto}://${host}/story/${rawId}`)
  const videoUrl = escapeHtml(typeof item.url === 'string' ? item.url : '')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
</head>
<body><p>${description}</p><p><a href="${videoUrl}">Watch on YouTube</a></p></body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.status(200).send(html)
}
