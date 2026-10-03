import { navigateTo } from '../lib/routing'

interface MobileQuickLinksProps {
  hasWeeklyRecap?: boolean
  className?: string
}

export function MobileQuickLinks({ hasWeeklyRecap = false, className = '' }: MobileQuickLinksProps) {
  return (
    <nav
      className={`sm:hidden flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-stone ${className}`}
      aria-label="Quick links"
    >
      {hasWeeklyRecap && (
        <button type="button" className="hover:text-signal transition-colors" onClick={() => navigateTo('/weekly')}>
          This week
        </button>
      )}
      <button type="button" className="hover:text-signal transition-colors" onClick={() => navigateTo('/saved')}>
        Saved
      </button>
    </nav>
  )
}
