import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

// =====================================================================
// Minimal modal primitive — no Radix dependency for Phase 1.
// - Closes on Escape and on backdrop click
// - Locks body scroll while open
// - Uses portal to <body> so z-index conflicts are impossible
// - Restraint, not flair: paper background, hairline border, lift shadow
// =====================================================================

interface ModalProps {
  open: boolean
  onClose: () => void
  /** Heading shown at the top — kept inline so the form owns the body. */
  title: string
  /** Tight subheading under the title (eyebrow line in mono caps). */
  eyebrow?: string
  children: ReactNode
  /** Tailwind max-width override; defaults to max-w-md. */
  maxWidth?: string
}

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  maxWidth = 'max-w-md',
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      {/* Backdrop — warm tinted, not flat black */}
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 bg-ink-300/30 backdrop-blur-[2px] transition-opacity duration-200 ease-editorial"
      />
      {/* Panel */}
      <div
        className={cn(
          'relative w-full rounded-lg border border-line bg-white p-6 shadow-lift',
          'animate-in fade-in zoom-in-95 duration-200',
          maxWidth,
        )}
      >
        {eyebrow && (
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-100">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 text-2xl font-medium tracking-tight text-ink-300">
          {title}
        </h2>
        <div className="mt-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
