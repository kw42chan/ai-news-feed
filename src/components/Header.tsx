import { Zap } from 'lucide-react'

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-paper border-b border-border">
      <div className="max-w-[1200px] mx-auto px-6 max-sm:px-4">
        <div className="flex items-center justify-between h-14 gap-4">
          <a 
            href="#top" 
            className="flex items-center gap-2 font-semibold text-[15px] text-ink"
            aria-label="AI News, Minus the Noise, home"
          >
            <span className="w-7 h-7 rounded-md bg-signal text-white grid place-items-center">
              <Zap className="w-4 h-4" />
            </span>
            <span className="max-sm:hidden">AI News, Minus the Noise</span>
          </a>
          
          <nav className="flex items-center gap-4" aria-label="Primary">
            <a 
              href="#feed" 
              className="hidden sm:block text-[14px] font-medium text-stone hover:text-signal transition-colors"
            >
              Latest stories
            </a>
            <a 
              href="#digest" 
              className="hidden sm:block text-[14px] font-medium text-stone hover:text-signal transition-colors"
            >
              Morning digest
            </a>
            <a href="#digest" className="btn-primary text-[14px] py-2 px-4">
              Join the list
            </a>
          </nav>
        </div>
      </div>
    </header>
  )
}
