import { Zap } from 'lucide-react'
import { navigateTo } from '../lib/routing'
import { MobileQuickLinks } from './MobileQuickLinks'

interface FooterProps {
  hasWeeklyRecap?: boolean
}

export function Footer({ hasWeeklyRecap = false }: FooterProps) {
  return (
    <footer className="border-t border-border bg-paper">
      <div className="max-w-[1200px] mx-auto px-6 max-sm:px-4">
        <div className="flex items-center justify-between gap-4 py-8 flex-wrap max-sm:flex-col max-sm:items-start max-sm:gap-3">
          <button
            type="button"
            onClick={() => navigateTo('/')}
            className="flex items-center gap-2 text-[14px] font-medium text-ink"
          >
            <span className="w-6 h-6 rounded bg-signal text-white grid place-items-center">
              <Zap className="w-3.5 h-3.5" />
            </span>
            <span>AI News, Minus the Noise</span>
          </button>
          <nav className="hidden sm:flex items-center gap-4 text-[13px] font-medium text-stone">
            {hasWeeklyRecap && (
              <button type="button" className="hover:text-signal" onClick={() => navigateTo('/weekly')}>
                This week
              </button>
            )}
            <button type="button" className="hover:text-signal" onClick={() => navigateTo('/saved')}>
              Saved
            </button>
            <button type="button" className="hover:text-signal" onClick={() => navigateTo('/#digest')}>
              Morning digest
            </button>
          </nav>
          <MobileQuickLinks hasWeeklyRecap={hasWeeklyRecap} className="sm:hidden" />
          <p className="text-[13px] text-meta max-w-md">
            Built for non-technical professionals who want to keep up with AI.
          </p>
        </div>
      </div>
    </footer>
  )
}
