import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TreeCanvas } from '@/components/TreeCanvas'
import type { PublicTreePayload } from '@/types'

export function LandingPage() {
  const [data, setData] = useState<PublicTreePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .rpc('get_default_tree')
      .then(({ data: payload, error: rpcError }) => {
        if (cancelled) return
        if (rpcError) {
          setError('Không thể tải gia phả.')
          setLoading(false)
          return
        }
        if (!payload) {
          setError('Chưa có gia phả nào được tạo.')
          setLoading(false)
          return
        }
        setData(payload as unknown as PublicTreePayload)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="min-h-[100dvh] bg-white px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center">
          <img
            src="https://swdoxzpjminxjmhqtsft.supabase.co/storage/v1/object/public/Logo/logo%20(1).png"
            alt="Logo gia phả"
            className="h-24 w-24 rounded-lg object-contain"
          />
        </div>

        {loading && (
          <p className="mt-8 text-sm text-ink-100">Đang tải gia phả…</p>
        )}

        {error && !loading && (
          <p className="mt-8 text-sm text-ink-100">{error}</p>
        )}

        {data && (
          <section className="mt-8">
            <TreeCanvas
              persons={data.persons}
              rootId={data.tree.root_person_id}
              onSelect={() => {}}
            />
          </section>
        )}
      </div>
    </main>
  )
}
