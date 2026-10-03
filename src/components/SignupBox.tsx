import { useState } from 'react'
import { Mail, Loader2, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  getSignupRolePreference,
  PROFESSIONAL_ROLES,
  setSignupRolePreference,
  type ProfessionalRole,
} from '../lib/roles'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export function SignupBox() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ProfessionalRole | ''>(() => getSignupRolePreference() ?? '')
  const [honeypot, setHoneypot] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const payload: { email: string; role?: string } = {
        email: email.toLowerCase().trim(),
      }
      if (role) payload.role = role

      const { error: insertError } = await supabase.from('subscribers').insert(payload)

      if (insertError && insertError.code !== '23505') {
        throw insertError
      }

      setSignupRolePreference(role || null)
      setIsSuccess(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <aside
        id="digest"
        className="bg-paper border border-border rounded-[12px] p-6 shadow-[var(--shadow-signup)]"
      >
        <div className="flex items-start gap-3 text-signal">
          <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <p className="text-[15px] leading-relaxed text-ink">
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
      className="bg-paper border border-border rounded-[12px] p-6 shadow-[var(--shadow-signup)]"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-signal-soft text-signal grid place-items-center">
          <Mail className="w-5 h-5" />
        </div>
        <h2 id="digest-title" className="text-[17px] font-semibold text-ink">
          Get the morning AI digest
        </h2>
      </div>

      <p className="text-[14px] leading-relaxed text-stone mb-5">
        The few AI stories worth knowing, explained without jargon. Launching soon, so join the list to get the first one.
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
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 max-sm:flex-col">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your work email"
              autoComplete="email"
              disabled={isSubmitting}
              required
              className="input-field flex-1 min-w-0 max-sm:w-full"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary whitespace-nowrap max-sm:w-full"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Joining...
                </span>
              ) : (
                'Join the list'
              )}
            </button>
          </div>
          <label className="sr-only" htmlFor="signup-role">Your role (optional)</label>
          <select
            id="signup-role"
            value={role}
            onChange={(e) => setRole(e.target.value as ProfessionalRole | '')}
            disabled={isSubmitting}
            className="input-field text-[14px] text-stone"
          >
            <option value="">Your role (optional)</option>
            {PROFESSIONAL_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}

        <p className="mt-3 text-[12px] text-meta">No spam. Unsubscribe anytime.</p>
      </form>
    </aside>
  )
}
