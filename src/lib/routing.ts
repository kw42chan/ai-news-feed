import { useEffect, useState } from 'react'

export type AppRoute =
  | { name: 'home' }
  | { name: 'weekly' }
  | { name: 'saved' }
  | { name: 'story'; id: string }

function parseRoute(pathname: string): AppRoute {
  if (pathname === '/weekly') return { name: 'weekly' }
  if (pathname === '/saved') return { name: 'saved' }
  const storyMatch = pathname.match(/^\/story\/([0-9a-f-]{36})$/i)
  if (storyMatch) return { name: 'story', id: storyMatch[1] }
  return { name: 'home' }
}

export function useAppRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window !== 'undefined' ? parseRoute(window.location.pathname) : { name: 'home' }
  )

  useEffect(() => {
    const onPop = () => setRoute(parseRoute(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return route
}

export function navigateTo(path: string): void {
  const url = new URL(path, window.location.origin)
  window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`)
  window.dispatchEvent(new PopStateEvent('popstate'))
  if (url.hash) {
    requestAnimationFrame(() => {
      document.querySelector(url.hash)?.scrollIntoView({ behavior: 'smooth' })
    })
  }
}
