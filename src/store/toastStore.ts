import { create } from 'zustand'

// =====================================================================
// Toast store — single ephemeral message at the bottom of the screen.
// Used by the delete + undo flow (TASTE-E5): hard delete, then a 5s
// window to revert. Only one toast at a time keeps the UI honest.
// =====================================================================

export interface ToastConfig {
  id: string
  message: string
  actionLabel?: string
  onAction?: () => void | Promise<void>
  /** Auto-dismiss after this many ms. Defaults to 5000. */
  durationMs?: number
}

interface ToastState {
  current: ToastConfig | null
  show: (toast: Omit<ToastConfig, 'id'>) => void
  dismiss: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (toast) =>
    set({
      current: {
        ...toast,
        id: Math.random().toString(36).slice(2),
      },
    }),
  dismiss: () => set({ current: null }),
}))
