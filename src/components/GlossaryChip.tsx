import { useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GlossaryEntry } from '../lib/glossary'

interface GlossaryChipProps {
  label: string
  entry?: GlossaryEntry
  active: boolean
  onSelect: () => void
}

export function GlossaryChip({ label, entry, active, onSelect }: GlossaryChipProps) {
  const [open, setOpen] = useState(false)
  const popoverId = useId()
  const btnRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updatePosition = () => {
    const rect = btnRef.current?.getBoundingClientRect()
    if (!rect) return
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

  const showPopover = () => {
    if (!entry) return
    updatePosition()
    setOpen(true)
  }

  const hidePopover = () => setOpen(false)

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-pressed={active}
        className={`chip ${active ? 'chip-active' : ''} ${entry ? 'chip-has-glossary' : ''}`}
        onClick={() => {
          if (open) {
            hidePopover()
            return
          }
          onSelect()
        }}
        onMouseEnter={() => {
          if (window.matchMedia('(hover: hover)').matches) showPopover()
        }}
        onMouseLeave={() => {
          if (window.matchMedia('(hover: hover)').matches) hidePopover()
        }}
        onFocus={() => showPopover()}
        onBlur={() => hidePopover()}
        onPointerDown={(e) => {
          if (!entry || e.pointerType === 'mouse') return
          longPressRef.current = setTimeout(() => {
            e.preventDefault()
            showPopover()
          }, 450)
        }}
        onPointerUp={() => {
          if (longPressRef.current) clearTimeout(longPressRef.current)
        }}
        onPointerCancel={() => {
          if (longPressRef.current) clearTimeout(longPressRef.current)
        }}
        aria-describedby={open ? popoverId : undefined}
      >
        {label}
      </button>
      {open &&
        entry &&
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
