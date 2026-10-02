import { Sparkles } from 'lucide-react'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[--color-border]" style={{
      background: 'rgba(255, 255, 255, 0.82)',
      backdropFilter: 'saturate(180%) blur(12px)',
      WebkitBackdropFilter: 'saturate(180%) blur(12px)',
    }}>
      <div className="max-w-[--container] mx-auto px-[--space-6] max-sm:px-[--space-5]">
        <div className="flex items-center justify-between h-16 max-sm:h-14 gap-[--space-4]">
          <a href="#top" className="flex items-center gap-[--space-3] max-sm:gap-2.5 font-semibold text-[--text-base] max-sm:text-[15px] tracking-tight whitespace-nowrap" aria-label="AI News, Minus the Noise, home">
            <span className="w-8 h-8 max-sm:w-7 max-sm:h-7 rounded-[10px] max-sm:rounded-lg bg-[--color-accent] text-[--color-on-accent] grid place-items-center" style={{ boxShadow: 'var(--shadow-accent)' }}>
              <Sparkles className="w-[18px] h-[18px] max-sm:w-4 max-sm:h-4" />
            </span>
            <span>AI News, Minus the Noise</span>
          </a>
          <nav className="flex items-center gap-[--space-6]" aria-label="Primary">
            <a href="#feed" className="hidden sm:block text-[--text-sm] font-medium text-[--color-text-secondary] hover:text-[--color-accent] transition-colors duration-[--dur]">
              Latest stories
            </a>
            <a href="#digest" className="hidden sm:block text-[--text-sm] font-medium text-[--color-text-secondary] hover:text-[--color-accent] transition-colors duration-[--dur]">
              Morning digest
            </a>
            <a
              href="#digest"
              className="inline-flex items-center justify-center h-9 max-sm:h-[34px] px-[--space-4] max-sm:px-3 rounded-[10px] bg-[--color-accent] text-[--color-on-accent] text-[--text-sm] max-sm:text-[13px] font-semibold tracking-tight whitespace-nowrap hover:bg-[--color-accent-hover] active:bg-[--color-accent-press] transition-all duration-[--dur] hover:-translate-y-px hover:shadow-[--shadow-accent] active:translate-y-0 active:shadow-[--shadow-xs]"
              style={{ boxShadow: 'var(--shadow-xs)' }}
            >
              Join the list
            </a>
          </nav>
        </div>
      </div>
    </header>
  )
}
