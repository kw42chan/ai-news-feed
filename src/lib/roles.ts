export const PROFESSIONAL_ROLES = [
  'Marketing',
  'Sales',
  'Finance',
  'HR & People',
  'Operations',
  'Founder / Leadership',
  'Other',
] as const

export type ProfessionalRole = (typeof PROFESSIONAL_ROLES)[number]

const SIGNUP_ROLE_KEY = 'ai-news-feed-signup-role'
const FEED_ROLE_FILTER_KEY = 'ai-news-feed-feed-role-filter'

export function getSignupRolePreference(): ProfessionalRole | null {
  const value = localStorage.getItem(SIGNUP_ROLE_KEY)
  if (!value) return null
  return PROFESSIONAL_ROLES.includes(value as ProfessionalRole) ? (value as ProfessionalRole) : null
}

export function setSignupRolePreference(role: ProfessionalRole | null): void {
  if (role) localStorage.setItem(SIGNUP_ROLE_KEY, role)
  else localStorage.removeItem(SIGNUP_ROLE_KEY)
}

export function getFeedRoleFilter(): ProfessionalRole | null {
  const value = localStorage.getItem(FEED_ROLE_FILTER_KEY)
  if (!value) return null
  return PROFESSIONAL_ROLES.includes(value as ProfessionalRole) ? (value as ProfessionalRole) : null
}

export function setFeedRoleFilter(role: ProfessionalRole | null): void {
  if (role) localStorage.setItem(FEED_ROLE_FILTER_KEY, role)
  else localStorage.removeItem(FEED_ROLE_FILTER_KEY)
}
