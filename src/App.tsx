import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useFamilyStore } from '@/store/familyStore'
import { flush, pullTree } from '@/lib/syncEngine'
import { UndoToast } from '@/components/UndoToast'

// =====================================================================
// App shell. Two background-sync responsibilities here:
//   - flush the outbox whenever we come back online or focus the tab
//   - pull the current tree on focus + every 60s (TASTE-E4)
// Both are best-effort: errors are swallowed because the user already
// has whatever's in IDB / familyStore.
// =====================================================================

const POLL_INTERVAL_MS = 60_000

export function App() {
  const init = useAuthStore((s) => s.init)
  const treeId = useFamilyStore((s) => s.currentTree?.id ?? null)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (!treeId) return

    const tick = () => {
      void flush()
      void pullTree(treeId).catch(() => {
        /* network blip — keep the cached view */
      })
    }
    const onOnline = () => {
      void flush()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick()
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', onVisibility)
    const interval = window.setInterval(tick, POLL_INTERVAL_MS)

    // Run once on mount so the cached paint upgrades to live data ASAP.
    tick()

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(interval)
    }
  }, [treeId])

  return (
    <>
      <Outlet />
      <UndoToast />
    </>
  )
}
