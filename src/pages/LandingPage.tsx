import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GearSix } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { TreeCanvas } from '@/components/TreeCanvas'
import type { PublicTreePayload } from '@/types'

export function LandingPage() {
  const session = useAuthStore((s) => s.session)
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
        <div className="flex items-start justify-between">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-100">
            Gia phả họ
          </p>
          {session ? (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-ink-300 transition-colors duration-200 ease-editorial hover:bg-paper-200"
            >
              <GearSix size={16} weight="bold" />
              Quản trị
            </Link>
          ) : (
            <Link
              to="/login"
              className="text-sm text-ink-100 transition-colors duration-200 ease-editorial hover:text-ink-300"
            >
              Đăng nhập
            </Link>
          )}
        </div>

        {loading && (
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-ink-300">
            Đang tải gia phả…
          </h1>
        )}

        {error && !loading && (
          <>
            <h1 className="mt-3 text-4xl font-medium tracking-tight text-ink-300">
              Gia phả họ
            </h1>
            <p className="mt-4 max-w-[55ch] text-ink-100">{error}</p>
          </>
        )}

        {data && (
          <>
            <h1 className="mt-3 text-4xl font-medium tracking-tight text-ink-300">
              {data.tree.name}
            </h1>
            <p className="mt-4 max-w-[55ch] text-ink-100">
              Gia phả gồm{' '}
              <span className="tabular text-ink-300">
                {data.persons.length}
              </span>{' '}
              nhân khẩu.
            </p>

            <section className="mt-12">
              <TreeCanvas
                persons={data.persons}
                rootId={data.tree.root_person_id}
                onSelect={() => {}}
              />
            </section>
          </>
        )}
      </div>
    </main>
  )
}
