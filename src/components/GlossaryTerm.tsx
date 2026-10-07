import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GlossaryEntry } from '../lib/glossary'

const POPOVER_MAX_WIDTH = 256
const VIEWPORT_MARGIN = 8

interface GlossaryTermProps {
  label: string
  entry?: GlossaryEntry
  className?: string
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
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const updatePosition = () => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const maxLeft = window.innerWidth - POPOVER_MAX_WIDTH - VIEWPORT_MARGIN
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.left + window.scrollX, maxLeft + window.scrollX)
    )
    setPosition({
      top: rect.bottom + window.scrollY + 6,
      left,
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
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`glossary-term-trigger ${className ?? ''}`}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={`${label}: tap for a plain-English definition`}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open &&
        createPortal(
          <div
            id={popoverId}
            role="tooltip"
            className="glossary-popover"
            style={{ top: position.top, left: position.left, maxWidth: POPOVER_MAX_WIDTH }}
          >
            <strong className="block text-ink text-[13px] mb-1">{entry.term}</strong>
            {entry.definition}
          </div>,
          document.body
        )}
    </>
  )
}
