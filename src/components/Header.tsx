import { Sparkles } from 'lucide-react'

export function Header() {
  return (
    <header className="border-b border-[--color-border] bg-[--color-bg-secondary]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[--color-accent] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[--color-text-primary]">
              AI News, Minus the Noise
            </h1>
          </div>
        </div>
        <p className="hidden sm:block text-sm text-[--color-text-muted]">
          Updated every 20 minutes
        </p>
      </div>
    </header>
  )
}
