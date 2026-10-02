import { Zap } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-border bg-paper">
      <div className="max-w-[1200px] mx-auto px-6 max-sm:px-4">
        <div className="flex items-center justify-between gap-4 py-8 flex-wrap max-sm:flex-col max-sm:items-start max-sm:gap-3">
          <a href="#top" className="flex items-center gap-2 text-[14px] font-medium text-ink">
            <span className="w-6 h-6 rounded bg-signal text-white grid place-items-center">
              <Zap className="w-3.5 h-3.5" />
            </span>
            <span>AI News, Minus the Noise</span>
          </a>
          <p className="text-[13px] text-meta max-w-md">
            Built for non-technical professionals who want to keep up with AI.
          </p>
        </div>
      </div>
    </footer>
  )
}
