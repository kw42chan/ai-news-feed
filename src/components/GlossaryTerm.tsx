import { useEffect, useId, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import type { GlossaryEntry } from '../lib/glossary'

interface GlossaryTermProps {
  label: string
  entry?: GlossaryEntry
  className?: string
}

export function GlossaryTerm({ label, entry, className }: GlossaryTermProps) {
  const [open, setOpen] = useState(false)
  const popoverId = useId()
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  if (!entry) {
    return <span className={className}>{label}</span>
  }

  return (
    <span ref={rootRef} className={`relative inline-flex items-center gap-1 ${className ?? ''}`}>
      <span>{label}</span>
      <button
        type="button"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-meta hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={`What is ${entry.term}?`}
        onClick={() => setOpen((v) => !v)}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span
          id={popoverId}
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-1 w-[min(16rem,calc(100vw-2rem))] rounded-md border border-border bg-paper p-3 text-[13px] leading-snug text-stone shadow-[var(--shadow-card-hover)]"
        >
          <strong className="block text-ink text-[13px] mb-1">{entry.term}</strong>
          {entry.definition}
        </span>
      )}
    </span>
  )
}
