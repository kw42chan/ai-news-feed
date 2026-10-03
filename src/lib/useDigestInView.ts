import { useEffect, useState } from 'react'

const MAX_ATTACH_ATTEMPTS = 40
const RETRY_MS = 50

/** True when the #digest signup element is intersecting the viewport (mobile header Join hide). */
export function useDigestInView(): boolean {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    let activeCleanup: (() => void) | null = null

    const cancelActive = () => {
      activeCleanup?.()
      activeCleanup = null
    }

    const scheduleAttach = (attempt = 0) => {
      cancelActive()

      const el = document.getElementById('digest')
      if (el) {
        const observer = new IntersectionObserver(
          ([entry]) => setInView(entry.isIntersecting),
          { root: null, threshold: 0.12, rootMargin: '-56px 0px 0px 0px' }
        )
        observer.observe(el)
        activeCleanup = () => observer.disconnect()
        return
      }

      if (attempt >= MAX_ATTACH_ATTEMPTS) {
        setInView(false)
        return
      }

      const retryId = window.setTimeout(() => {
        scheduleAttach(attempt + 1)
      }, RETRY_MS)
      activeCleanup = () => window.clearTimeout(retryId)
    }

    const onRoute = () => {
      window.requestAnimationFrame(() => {
        scheduleAttach(0)
      })
    }

    scheduleAttach(0)
    window.addEventListener('popstate', onRoute)

    return () => {
      window.removeEventListener('popstate', onRoute)
      cancelActive()
    }
  }, [])

  return inView
}
