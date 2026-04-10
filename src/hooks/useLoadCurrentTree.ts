import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useFamilyStore } from '@/store/familyStore'
import { hydrateFromCache, pullOwnedTree } from '@/lib/syncEngine'

// =====================================================================
// On mount (and whenever the auth user changes):
//   1. Paint synchronously from the IDB cache if we have one (so the
//      app feels instant after the first load and works offline).
//   2. Then pull authoritative state from Supabase via syncEngine.
//      pullOwnedTree handles discovery + cache mirroring.
//
// TASTE-E1: pure LWW + naive sync. No conflict log, no field-level merge.
// =====================================================================

interface LoadState {
  loading: boolean
  error: string | null
}

export function useLoadCurrentTree(): LoadState {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const reset = useFamilyStore((s) => s.reset)
  const [state, setState] = useState<LoadState>({ loading: false, error: null })

  useEffect(() => {
    if (!userId) {
      reset()
      setState({ loading: false, error: null })
      return
    }

    let cancelled = false
    setState({ loading: true, error: null })

    void (async () => {
      // Step 1: try to paint from cache so the UI doesn't flash empty.
      let hadCache = false
      try {
        hadCache = await hydrateFromCache(userId)
      } catch {
        /* IDB unavailable — fine */
      }
      if (cancelled) return
      if (hadCache) setState({ loading: false, error: null })

      // Step 2: authoritative pull. If we already painted from cache,
      // any error here is non-fatal — we just keep the stale view.
      try {
        await pullOwnedTree(userId)
        if (cancelled) return
        setState({ loading: false, error: null })
      } catch (err) {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : 'Không thể tải gia phả'
        setState({
          loading: false,
          error: hadCache ? null : message,
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId, reset])

  return state
}
