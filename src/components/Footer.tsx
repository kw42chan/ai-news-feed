import { Sparkles } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-[--color-border] bg-[--color-surface]">
      <div className="max-w-[--container] mx-auto px-[--space-6] max-sm:px-[--space-5]">
        <div className="flex items-center justify-between gap-[--space-6] py-[--space-10] flex-wrap max-sm:flex-col max-sm:items-start max-sm:gap-[--space-4] max-sm:py-[--space-8]">
          <a href="#top" className="flex items-center gap-[--space-3] max-sm:gap-2.5 font-semibold text-[--text-sm]">
            <span className="w-7 h-7 rounded-lg bg-[--color-accent] text-[--color-on-accent] grid place-items-center">
              <Sparkles className="w-[15px] h-[15px]" />
            </span>
            <span>AI News, Minus the Noise</span>
          </a>
          <p className="m-0 text-[--text-sm] text-[--color-text-muted] max-w-[40rem]">
            AI News, Minus the Noise. Built for non-technical professionals who want to keep up with AI.
          </p>
        </div>
      </div>
    </footer>
  )
}
