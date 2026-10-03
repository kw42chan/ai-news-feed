import { Zap } from 'lucide-react'
import { navigateTo } from '../lib/routing'

interface HeaderProps {
  hasWeeklyRecap?: boolean
}

export function Header({ hasWeeklyRecap = false }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-paper border-b border-border">
      <div className="max-w-[1200px] mx-auto px-6 max-sm:px-4">
        <div className="flex items-center justify-between h-14 gap-4">
          <button
            type="button"
            onClick={() => navigateTo('/')}
            className="flex items-center gap-2 font-semibold text-[15px] text-ink text-left"
            aria-label="AI News, Minus the Noise, home"
          >
            <span className="w-7 h-7 rounded-md bg-signal text-white grid place-items-center">
              <Zap className="w-4 h-4" />
            </span>
            <span className="text-[14px] max-sm:text-[13px] leading-tight truncate max-w-[52vw] sm:max-w-none">
              AI News, Minus the Noise
            </span>
          </button>

          <nav className="flex items-center gap-3 sm:gap-4" aria-label="Primary">
            {hasWeeklyRecap && (
              <button
                type="button"
                onClick={() => navigateTo('/weekly')}
                className="text-[13px] sm:text-[14px] font-medium text-stone hover:text-signal transition-colors"
              >
                This week
              </button>
            )}
            <button
              type="button"
              onClick={() => navigateTo('/saved')}
              className="text-[13px] sm:text-[14px] font-medium text-stone hover:text-signal transition-colors"
            >
              Saved
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/#digest')}
              className="hidden sm:block text-[14px] font-medium text-stone hover:text-signal transition-colors"
            >
              Morning digest
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/#digest')}
              className="btn-primary text-[14px] py-2 px-4"
            >
              Join the list
            </button>
          </nav>
        </div>
      </div>
    </header>
  )
}
