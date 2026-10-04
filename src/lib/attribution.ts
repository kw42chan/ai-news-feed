const MAX = {
  utm: 200,
  referrer: 500,
} as const

function trim(value: string | null, max: number): string | null {
  if (!value) return null
  const t = value.trim()
  if (!t) return null
  return t.length > max ? t.slice(0, max) : t
}

export function getSignupAttribution(): {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  referrer: string | null
} {
  if (typeof window === 'undefined') {
    return { utm_source: null, utm_medium: null, utm_campaign: null, referrer: null }
  }

  const params = new URLSearchParams(window.location.search)
  return {
    utm_source: trim(params.get('utm_source'), MAX.utm),
    utm_medium: trim(params.get('utm_medium'), MAX.utm),
    utm_campaign: trim(params.get('utm_campaign'), MAX.utm),
    referrer: trim(document.referrer || null, MAX.referrer),
  }
}
