import type { VercelRequest, VercelResponse } from '@vercel/node'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  if (!id) {
    res.status(400).send('Missing id')
    return
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).send('Supabase not configured')
    return
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/feed_items?id=eq.${id}&hidden=eq.false&select=title,summary,thumbnail,url`,
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

  const rows = await response.json()
  const item = rows[0]
  if (!item) {
    res.status(404).send('Story not found')
    return
  }

  const title = escapeHtml(item.title ?? 'AI News story')
  const description = escapeHtml(item.summary ?? item.title ?? '')
  const image = escapeHtml(item.thumbnail ?? '')
  const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'ai-news-feed.vercel.app'
  const proto = req.headers['x-forwarded-proto'] ?? 'https'
  const pageUrl = `${proto}://${host}/story/${id}`

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
<body><p>${description}</p><p><a href="${escapeHtml(item.url)}">Watch on YouTube</a></p></body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.status(200).send(html)
}
