import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GlossaryEntry } from '../lib/glossary'

interface GlossaryTermProps {
  label: string
  entry?: GlossaryEntry
  className?: string
  /** When true, label is interactive (chips / tags). Plain text when no entry. */
  interactive?: boolean
}

export function GlossaryTerm({
  label,
  entry,
  className,
  interactive = true,
}: GlossaryTermProps) {
  const [open, setOpen] = useState(false)
  const popoverId = useId()
  const triggerRef = useRef<HTMLElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const updatePosition = () => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPosition({
      top: rect.bottom + window.scrollY + 6,
      left: Math.min(rect.left + window.scrollX, window.innerWidth - 280),
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      const pop = document.getElementById(popoverId)
      if (pop?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open, popoverId])

  if (!entry || !interactive) {
    return <span className={className}>{label}</span>
  }

  const show = () => {
    updatePosition()
    setOpen(true)
  }

  return (
    <>
      <button
        ref={triggerRef as React.RefObject<HTMLButtonElement>}
        type="button"
        className={`glossary-term-trigger ${className ?? ''}`}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={`${label}: tap for a plain-English definition`}
        onClick={() => (open ? setOpen(false) : show())}
        onMouseEnter={() => {
          if (window.matchMedia('(hover: hover)').matches) show()
        }}
        onMouseLeave={() => {
          if (window.matchMedia('(hover: hover)').matches) setOpen(false)
        }}
        onFocus={show}
        onBlur={() => setOpen(false)}
      >
        {label}
      </button>
      {open &&
        createPortal(
          <div
            id={popoverId}
            role="tooltip"
            className="glossary-popover"
            style={{ top: position.top, left: position.left }}
          >
            <strong className="block text-ink text-[13px] mb-1">{entry.term}</strong>
            {entry.definition}
          </div>,
          document.body
        )}
    </>
  )
}
