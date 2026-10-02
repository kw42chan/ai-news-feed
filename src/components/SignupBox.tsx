import { useState } from 'react'
import { Mail, Loader2, CheckCircle } from 'lucide-react'
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

    // Honeypot check - if filled, pretend success
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

      // Treat unique violation (23505) as success - don't reveal if email exists
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
      <div className="bg-[--color-bg-card] border border-[--color-border] rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-3 text-[--color-accent]">
          <CheckCircle className="w-6 h-6 shrink-0" />
          <p className="text-[--color-text-primary] font-medium">
            You're on the list. We'll email you when the first digest goes out.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[--color-bg-card] border border-[--color-border] rounded-2xl p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="hidden sm:flex w-12 h-12 rounded-xl bg-[--color-accent]/10 items-center justify-center shrink-0">
          <Mail className="w-6 h-6 text-[--color-accent]" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[--color-text-primary] mb-1">
            Get the morning AI digest
          </h3>
          <p className="text-sm text-[--color-text-secondary] mb-4">
            The few AI stories worth knowing, explained without jargon. Launching soon, so join the list to get the first one.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Honeypot field - hidden from users, catches bots */}
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

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your work email"
                className="flex-1 px-4 py-3 bg-[--color-bg-secondary] border border-[--color-border] rounded-xl text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:border-[--color-accent] focus:ring-1 focus:ring-[--color-accent] transition-colors"
                disabled={isSubmitting}
                required
              />
              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="px-6 py-3 bg-[--color-accent] hover:bg-[--color-accent-hover] text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
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
              <p className="text-sm text-red-400">{error}</p>
            )}

            <p className="text-xs text-[--color-text-muted]">
              No spam. Unsubscribe anytime.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
