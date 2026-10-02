import { Sparkles } from 'lucide-react'

export function Header() {
  return (
    <header 
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'saturate(180%) blur(12px)',
        WebkitBackdropFilter: 'saturate(180%) blur(12px)',
        borderBottom: '1px solid #E2E8F0',
      }}
    >
      <div className="max-w-[1160px] mx-auto px-6 max-sm:px-5">
        <div className="flex items-center justify-between h-16 max-sm:h-14 gap-4">
          <a 
            href="#top" 
            className="flex items-center gap-3 max-sm:gap-2.5 font-semibold text-base max-sm:text-[15px] whitespace-nowrap"
            style={{ letterSpacing: '-0.01em', color: '#0F172A' }}
            aria-label="AI News, Minus the Noise, home"
          >
            <span 
              className="w-8 h-8 max-sm:w-7 max-sm:h-7 rounded-[10px] max-sm:rounded-lg grid place-items-center"
              style={{ 
                background: '#4F46E5', 
                color: '#FFFFFF',
                boxShadow: '0 1px 2px rgba(79, 70, 229, 0.20), 0 6px 16px -4px rgba(79, 70, 229, 0.35)',
              }}
            >
              <Sparkles className="w-[18px] h-[18px] max-sm:w-4 max-sm:h-4" />
            </span>
            <span>AI News, Minus the Noise</span>
          </a>
          <nav className="flex items-center gap-6" aria-label="Primary">
            <a 
              href="#feed" 
              className="hidden sm:block text-sm font-medium transition-colors duration-150 hover:text-[#4F46E5]"
              style={{ color: '#475569' }}
            >
              Latest stories
            </a>
            <a 
              href="#digest" 
              className="hidden sm:block text-sm font-medium transition-colors duration-150 hover:text-[#4F46E5]"
              style={{ color: '#475569' }}
            >
              Morning digest
            </a>
            <a
              href="#digest"
              className="btn-primary inline-flex items-center justify-center h-9 max-sm:h-[34px] px-4 max-sm:px-3 rounded-[10px] text-sm max-sm:text-[13px] font-semibold whitespace-nowrap"
              style={{ 
                background: '#4F46E5', 
                color: '#FFFFFF',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                letterSpacing: '-0.005em',
              }}
            >
              Join the list
            </a>
          </nav>
        </div>
      </div>
    </header>
  )
}
