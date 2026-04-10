import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { useAuthStore } from '@/store/authStore'

export function SettingsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-[100dvh] bg-white px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-ink-100 transition-colors duration-200 ease-editorial hover:text-ink-300"
        >
          <ArrowLeft size={16} weight="bold" />
          Quay lại
        </Link>

        <p className="mt-6 font-mono text-xs uppercase tracking-wider text-ink-100">
          Cài đặt
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight text-ink-300">
          Tài khoản
        </h1>

        <dl className="mt-10 grid gap-6 border-t border-line pt-8">
          <div className="grid gap-1">
            <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-100">
              Email
            </dt>
            <dd className="text-sm text-ink-300">{user?.email ?? '—'}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-100">
              ID người dùng
            </dt>
            <dd className="font-mono text-xs text-ink-100">{user?.id ?? '—'}</dd>
          </div>
        </dl>

        <div className="mt-12">
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md border border-line px-4 py-2.5 text-sm text-ink-300 transition-colors duration-200 ease-editorial hover:bg-paper-200"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </main>
  )
}
