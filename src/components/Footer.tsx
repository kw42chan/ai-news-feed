import { Sparkles } from 'lucide-react'

export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid #E2E8F0', background: '#FFFFFF' }}>
      <div className="max-w-[1160px] mx-auto px-6 max-sm:px-5">
        <div className="flex items-center justify-between gap-6 py-10 flex-wrap max-sm:flex-col max-sm:items-start max-sm:gap-4 max-sm:py-8">
          <a 
            href="#top" 
            className="flex items-center gap-3 max-sm:gap-2.5 font-semibold text-sm"
            style={{ color: '#0F172A' }}
          >
            <span 
              className="w-7 h-7 rounded-lg grid place-items-center"
              style={{ background: '#4F46E5', color: '#FFFFFF' }}
            >
              <Sparkles className="w-[15px] h-[15px]" />
            </span>
            <span>AI News, Minus the Noise</span>
          </a>
          <p className="m-0 text-sm max-w-[40rem]" style={{ color: '#64748B' }}>
            AI News, Minus the Noise. Built for non-technical professionals who want to keep up with AI.
          </p>
        </div>
      </div>
    </footer>
  )
}
