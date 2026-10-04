import { useState } from 'react'
import { Mail, Loader2, CheckCircle } from 'lucide-react'
import { ChipSelect } from './ChipSelect'
import { supabase } from '../lib/supabase'
import {
  getSignupRolePreference,
  PROFESSIONAL_ROLES,
  setSignupRolePreference,
  type ProfessionalRole,
} from '../lib/roles'
import { isSchemaMismatchError } from '../lib/postgrest'
import { getSignupAttribution } from '../lib/attribution'
import { trackSignup } from '../lib/analytics'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export function SignupBox({
  compactOnMobile = false,
  sidebar = false,
}: {
  compactOnMobile?: boolean
  sidebar?: boolean
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ProfessionalRole | ''>(() => getSignupRolePreference() ?? '')
  const [honeypot, setHoneypot] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRoleOnMobile, setShowRoleOnMobile] = useState(false)

  const isValidEmail = EMAIL_REGEX.test(email) && email.length <= 254

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (honeypot) {
      setIsSuccess(true)
      return
    }

    if (!isValidEmail) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)

    try {
      const attribution = getSignupAttribution()
      const payload: Record<string, string | null | undefined> = {
        email: email.toLowerCase().trim(),
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        referrer: attribution.referrer,
      }
      if (role) payload.role = role

      let { error: insertError } = await supabase.from('subscribers').insert(payload as never)

      if (insertError && insertError.code !== '23505' && isSchemaMismatchError(insertError.message)) {
        const slim: { email: string; role?: string } = { email: payload.email as string }
        if (role) slim.role = role
        const retry = await supabase.from('subscribers').insert(slim)
        insertError = retry.error
      }

      if (insertError && insertError.code !== '23505') {
        throw insertError
      }

      setSignupRolePreference(role || null)
      trackSignup()
      setIsSuccess(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const shellClass = sidebar
    ? 'story-panel story-mini-signup'
    : `bg-paper border border-border rounded-[12px] shadow-[var(--shadow-signup)] ${compactOnMobile ? 'p-3 max-sm:p-3 sm:p-6' : 'p-6'}`

  if (isSuccess) {
    return (
      <aside
        id="digest"
        className={shellClass}
      >
        <div className="flex items-start gap-3 text-signal">
          <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <p className="text-[14px] sm:text-[15px] leading-relaxed text-ink">
            You&apos;re on the list. We&apos;ll email you when the first digest goes out.
          </p>
        </div>
      </aside>
    )
  }

  return (
    <aside
      id="digest"
      aria-labelledby="digest-title"
      className={shellClass}
    >
      {!sidebar && (
        <div className={`${compactOnMobile ? 'max-sm:mb-2 sm:mb-4' : 'mb-4'} flex items-center gap-3`}>
          <div className={`${compactOnMobile ? 'max-sm:hidden' : ''} w-10 h-10 rounded-lg bg-signal-soft text-signal grid place-items-center`}>
            <Mail className="w-5 h-5" />
          </div>
          <h2
            id="digest-title"
            className={`font-semibold text-ink ${compactOnMobile ? 'text-[15px] max-sm:text-[14px] sm:text-[17px]' : 'text-[17px]'}`}
          >
            Get the morning AI digest
          </h2>
        </div>
      )}

      {sidebar && (
        <h2 id="digest-title" className="story-mini-signup-title">
          Get the morning AI digest
        </h2>
      )}

      <p
        className={
          sidebar
            ? 'story-mini-signup-lede'
            : `text-stone ${
                compactOnMobile
                  ? 'text-[13px] max-sm:mb-2 max-sm:line-clamp-1 sm:text-[14px] sm:leading-relaxed sm:mb-5'
                  : 'text-[14px] leading-relaxed mb-5'
              }`
        }
      >
        {sidebar
          ? 'The few AI stories worth knowing, explained without jargon. Launching soon, so join the list to get the first one.'
          : compactOnMobile
            ? 'AI stories worth knowing — join for the first digest.'
            : 'The few AI stories worth knowing, explained without jargon. Launching soon, so join the list to get the first one.'}
      </p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] opacity-0"
        />

        <label className="sr-only" htmlFor="email">Work email</label>
        <div className={`flex flex-col gap-2 ${sidebar ? 'story-mini-signup-form' : ''}`}>
          <div
            className={`flex gap-2 ${
              sidebar
                ? 'flex-col'
                : compactOnMobile
                  ? 'max-sm:flex-row max-sm:items-center'
                  : 'max-sm:flex-col'
            }`}
          >
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your work email"
              autoComplete="email"
              disabled={isSubmitting}
              required
              className={`input-field flex-1 min-w-0 ${compactOnMobile ? 'max-sm:py-2 max-sm:text-[14px]' : 'max-sm:w-full'}`}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className={`btn-primary whitespace-nowrap ${sidebar ? 'w-full' : compactOnMobile ? 'max-sm:py-2 max-sm:px-3 max-sm:text-[14px]' : 'max-sm:w-full'}`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className={compactOnMobile && !sidebar ? 'max-sm:hidden' : ''}>Joining...</span>
                </span>
              ) : (
                sidebar ? 'Join the list' : 'Join'
              )}
            </button>
          </div>
          {compactOnMobile ? (
            <div className="max-sm:block sm:hidden">
              {!showRoleOnMobile ? (
                <button
                  type="button"
                  className="text-[12px] font-medium text-signal hover:underline"
                  onClick={() => setShowRoleOnMobile(true)}
                >
                  Add your role (optional)
                </button>
              ) : (
                <ChipSelect
                  id="signup-role-mobile"
                  value={role}
                  prefix="Role"
                  aria-label="Your role (optional)"
                  options={[
                    { value: '', label: 'Optional' },
                    ...PROFESSIONAL_ROLES.map((r) => ({ value: r, label: r })),
                  ]}
                  onChange={(value) => setRole(value as ProfessionalRole | '')}
                  disabled={isSubmitting}
                />
              )}
            </div>
          ) : null}
          <div className={sidebar || compactOnMobile ? 'hidden sm:block' : ''}>
            <ChipSelect
              id="signup-role"
              value={role}
              prefix="Role"
              aria-label="Your role (optional)"
              options={[
                { value: '', label: 'Optional' },
                ...PROFESSIONAL_ROLES.map((r) => ({ value: r, label: r })),
              ]}
              onChange={(value) => setRole(value as ProfessionalRole | '')}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}

        <p className={`text-meta ${compactOnMobile ? 'mt-2 max-sm:mt-1 text-[11px] sm:mt-3 sm:text-[12px]' : 'mt-3 text-[12px]'}`}>
          No spam. Unsubscribe anytime.
        </p>
      </form>
    </aside>
  )
}
