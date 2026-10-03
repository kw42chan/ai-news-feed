import { next } from '@vercel/edge'

const BOT_PATTERN =
  /bot|facebookexternalhit|twitterbot|slackbot|linkedinbot|whatsapp|discordbot|telegrambot|googlebot/i

export const config = {
  matcher: '/story/:path*',
}

export default function middleware(request: Request) {
  const ua = request.headers.get('user-agent') ?? ''
  if (!BOT_PATTERN.test(ua)) {
    return next()
  }

  const parts = new URL(request.url).pathname.split('/')
  const id = parts[2]
  if (!id) return next()

  const rewriteUrl = new URL('/api/og-story', request.url)
  rewriteUrl.searchParams.set('id', id)
  return Response.rewrite(rewriteUrl)
}
