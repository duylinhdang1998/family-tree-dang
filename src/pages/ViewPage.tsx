import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { TreeCanvas } from '@/components/TreeCanvas'
import type { PublicTreePayload } from '@/types'

// =====================================================================
// Public read-only view — fetched via the security-definer RPC
// `get_tree_by_slug`. No auth required (TASTE-E2: anyone with the slug
// can read; nothing else is exposed). Read-only flat list for Phase 1;
// the tree canvas will replace this section in Phase 2.
// =====================================================================

export function ViewPage() {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<PublicTreePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .rpc('get_tree_by_slug', { p_slug: slug })
      .then(({ data: payload, error: rpcError }) => {
        if (cancelled) return
        if (rpcError) {
          setError('Không thể tải gia phả. Vui lòng kiểm tra đường dẫn.')
          setLoading(false)
          return
        }
        if (!payload) {
          setError('Không tìm thấy gia phả với đường dẫn này.')
          setLoading(false)
          return
        }
        setData(payload as unknown as PublicTreePayload)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  return (
    <main className="min-h-[100dvh] bg-white px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-ink-100 transition-colors duration-200 ease-editorial hover:text-ink-300"
        >
          <ArrowLeft size={16} weight="bold" />
          Quay lại
        </button>

        <div className="mt-6 flex flex-col items-center">
          <img
            src="https://swdoxzpjminxjmhqtsft.supabase.co/storage/v1/object/public/Logo/logo%20(1).png"
            alt="Logo gia phả"
            className="h-40 w-40 rounded-lg object-contain"
          />
        </div>

        {loading && (
          <p className="mt-8 text-sm text-ink-100">Đang tải gia phả…</p>
        )}

        {error && (
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
