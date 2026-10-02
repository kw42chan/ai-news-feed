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
        className="rounded-2xl p-8 max-sm:p-6"
        style={{ 
          background: '#FFFFFF', 
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04), 0 12px 24px -6px rgba(15, 23, 42, 0.10)',
        }}
      >
        <div className="flex items-center gap-3" style={{ color: '#4F46E5' }}>
          <CheckCircle className="w-6 h-6 shrink-0" />
          <p className="font-medium" style={{ color: '#0F172A' }}>
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
      className="rounded-2xl p-8 max-sm:p-6"
      style={{ 
        background: '#FFFFFF', 
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04), 0 12px 24px -6px rgba(15, 23, 42, 0.10)',
      }}
    >
      <div 
        className="w-11 h-11 rounded-xl grid place-items-center mb-5"
        style={{ background: '#EEF2FF', color: '#4F46E5' }}
      >
        <Mail className="w-[22px] h-[22px]" />
      </div>
      <h2 
        id="digest-title" 
        className="m-0 mb-2 text-xl font-semibold"
        style={{ lineHeight: 1.4, letterSpacing: '-0.015em', color: '#0F172A' }}
      >
        Get the morning AI digest
      </h2>
      <p className="m-0 mb-6 text-sm" style={{ lineHeight: 1.6, color: '#475569' }}>
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
        <div className="flex gap-3 max-sm:flex-col">
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your work email"
            autoComplete="email"
            disabled={isSubmitting}
            required
            className="input-field flex-1 min-w-0 h-11 px-4 rounded-xl text-base max-sm:flex-none max-sm:w-full"
            style={{ 
              background: '#FFFFFF', 
              color: '#0F172A',
              border: '1px solid #8494A9',
            }}
          />
          <button
            type="submit"
            disabled={isSubmitting || !email}
            className="btn-primary inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed max-sm:w-full"
            style={{ 
              background: '#4F46E5', 
              color: '#FFFFFF',
              border: '1px solid transparent',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              letterSpacing: '-0.005em',
            }}
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
          <p className="mt-3 text-sm text-red-500">{error}</p>
        )}

        <div className="flex items-center gap-2 mt-4 text-xs" style={{ color: '#64748B' }}>
          <Shield className="w-3.5 h-3.5" />
          No spam. Unsubscribe anytime.
        </div>
      </form>
    </aside>
  )
}
