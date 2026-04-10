import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useToastStore } from '@/store/toastStore'

// =====================================================================
// UndoToast — bottom-center single-slot toast renderer.
// Auto-dismisses after `durationMs` (default 5s). Pairs with
// useToastStore. Mounted once at app root.
// =====================================================================

export function UndoToast() {
  const current = useToastStore((s) => s.current)
  const dismiss = useToastStore((s) => s.dismiss)

  useEffect(() => {
    if (!current) return
    const ms = current.durationMs ?? 5000
    const timer = window.setTimeout(() => dismiss(), ms)
    return () => window.clearTimeout(timer)
  }, [current, dismiss])

  if (!current) return null

  const handleAction = async () => {
    if (current.onAction) await current.onAction()
    dismiss()
  }

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4"
    >
      <div className="pointer-events-auto flex items-center gap-4 rounded-md border border-line bg-ink-300 px-4 py-3 text-sm text-paper-100 shadow-lift">
        <span className="max-w-[44ch]">{current.message}</span>
        {current.actionLabel && current.onAction && (
          <button
            type="button"
            onClick={handleAction}
            className="font-mono text-[11px] uppercase tracking-wider text-paper-100 underline-offset-4 transition-colors duration-150 hover:underline"
          >
            {current.actionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Đóng thông báo"
          className="text-paper-100/70 transition-colors duration-150 hover:text-paper-100"
        >
          ×
        </button>
      </div>
    </div>,
    document.body,
  )
}
