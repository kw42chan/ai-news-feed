import { useState } from 'react'
import { Mail, Loader2, CheckCircle, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export function SignupBox() {
  const [email, setEmail] = useState('')
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
      const { error: insertError } = await supabase
        .from('subscribers')
        .insert({ email: email.toLowerCase().trim() })

      if (insertError && insertError.code !== '23505') {
        throw insertError
      }

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
        aria-labelledby="digest-title"
        className="bg-[--color-surface] border border-[--color-border] rounded-[--radius-lg] p-[--space-8] max-sm:p-[--space-6]"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center gap-[--space-3] text-[--color-accent]">
          <CheckCircle className="w-6 h-6 shrink-0" />
          <p className="text-[--color-text] font-medium">
            You're on the list. We'll email you when the first digest goes out.
          </p>
        </div>
      </aside>
    )
  }

  return (
    <aside
      id="digest"
      aria-labelledby="digest-title"
      className="bg-[--color-surface] border border-[--color-border] rounded-[--radius-lg] p-[--space-8] max-sm:p-[--space-6]"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      <div className="w-11 h-11 rounded-[--radius-md] bg-[--color-accent-soft] text-[--color-accent] grid place-items-center mb-[--space-5]">
        <Mail className="w-[22px] h-[22px]" />
      </div>
      <h2 id="digest-title" className="m-0 mb-[--space-2] text-[--text-xl] leading-[1.4] font-semibold tracking-tight">
        Get the morning AI digest
      </h2>
      <p className="m-0 mb-[--space-6] text-[--text-sm] leading-[1.6] text-[--color-text-secondary]">
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
          style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
        />

        <label className="sr-only" htmlFor="email">Work email</label>
        <div className="flex gap-[--space-3] max-sm:flex-col">
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your work email"
            autoComplete="email"
            disabled={isSubmitting}
            required
            className="flex-1 min-w-0 h-11 px-[--space-4] bg-[--color-surface] text-[--color-text] border border-[--color-border-input] rounded-[--radius-md] text-[--text-base] transition-all duration-[--dur] placeholder:text-[--color-text-muted] hover:border-[--color-border-input-hover] focus:outline-none focus:border-[--color-accent] focus:shadow-[--ring] max-sm:flex-none max-sm:w-full"
          />
          <button
            type="submit"
            disabled={isSubmitting || !email}
            className="inline-flex items-center justify-center gap-[--space-2] h-11 px-[--space-5] rounded-[--radius-md] border border-transparent bg-[--color-accent] text-[--color-on-accent] text-[--text-sm] font-semibold tracking-tight whitespace-nowrap cursor-pointer transition-all duration-[--dur] hover:bg-[--color-accent-hover] hover:-translate-y-px hover:shadow-[--shadow-accent] active:bg-[--color-accent-press] active:translate-y-0 active:shadow-[--shadow-xs] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none max-sm:w-full"
            style={{ boxShadow: 'var(--shadow-xs)' }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Joining...
              </>
            ) : (
              'Join the list'
            )}
          </button>
        </div>

        {error && (
          <p className="mt-[--space-3] text-[--text-sm] text-red-500">{error}</p>
        )}

        <div className="flex items-center gap-[--space-2] mt-[--space-4] text-[--text-xs] text-[--color-text-muted]">
          <Shield className="w-3.5 h-3.5" />
          No spam. Unsubscribe anytime.
        </div>
      </form>
    </aside>
  )
}
