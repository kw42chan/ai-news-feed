import { Zap, Bookmark } from 'lucide-react'
import { navigateTo } from '../lib/routing'
import { useDigestInView } from '../lib/useDigestInView'

interface HeaderProps {
  hasWeeklyRecap?: boolean
}

export function Header({ hasWeeklyRecap = false }: HeaderProps) {
  const digestInView = useDigestInView()
  const hideMobileJoin = digestInView

  return (
    <header className="sticky top-0 z-50 bg-paper border-b border-border">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 min-h-14 gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => navigateTo('/')}
            className="flex items-center gap-2 font-semibold text-ink text-left min-w-0 shrink"
            aria-label="AI News, Minus the Noise, home"
          >
            <span className="w-7 h-7 shrink-0 rounded-md bg-signal text-white grid place-items-center">
              <Zap className="w-4 h-4" />
            </span>
            <span className="text-[13px] sm:text-[14px] leading-tight truncate max-w-[46vw] sm:max-w-none">
              AI News, Minus the Noise
            </span>
          </button>

          <nav
            className="flex items-center gap-2 sm:gap-4 shrink-0 whitespace-nowrap"
            aria-label="Primary"
          >
            {hasWeeklyRecap && (
              <button
                type="button"
                onClick={() => navigateTo('/weekly')}
                className="hidden sm:inline text-[14px] font-medium text-stone hover:text-signal transition-colors"
              >
                This week
              </button>
            )}
            <button
              type="button"
              onClick={() => navigateTo('/saved')}
              className="hidden sm:inline text-[14px] font-medium text-stone hover:text-signal transition-colors"
            >
              Saved
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/saved')}
              className="sm:hidden p-2 rounded-md text-stone hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
              aria-label="Saved stories"
            >
              <Bookmark className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/#digest')}
              className="hidden sm:inline text-[14px] font-medium text-stone hover:text-signal transition-colors"
            >
              Morning digest
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/#digest')}
              className={`btn-primary text-[13px] sm:text-[14px] py-2 px-3 sm:px-4 whitespace-nowrap ${hideMobileJoin ? 'max-sm:hidden' : ''}`}
            >
              <span className="sm:hidden">Join</span>
              <span className="hidden sm:inline">Join the list</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  )
}
