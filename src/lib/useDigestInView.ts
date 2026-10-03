import { useEffect, useState } from 'react'

/** True when the #digest signup element is intersecting the viewport (mobile header Join hide). */
export function useDigestInView(): boolean {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const observe = () => {
      const el = document.getElementById('digest')
      if (!el) {
        setInView(false)
        return undefined
      }

      const observer = new IntersectionObserver(
        ([entry]) => setInView(entry.isIntersecting),
        { root: null, threshold: 0.12, rootMargin: '-56px 0px 0px 0px' }
      )
      observer.observe(el)
      return () => observer.disconnect()
    }

    let cleanup = observe()
    const onRoute = () => {
      cleanup?.()
      cleanup = observe()
    }
    window.addEventListener('popstate', onRoute)
    const t = window.setTimeout(onRoute, 0)

    return () => {
      window.clearTimeout(t)
      window.removeEventListener('popstate', onRoute)
      cleanup?.()
    }
  }, [])

  return inView
}
