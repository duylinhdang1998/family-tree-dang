import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface AuthGateProps {
  children: ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const session = useAuthStore((s) => s.session)
  const loading = useAuthStore((s) => s.loading)
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white">
        <p className="font-mono text-xs uppercase tracking-wider text-ink-50">
          Đang tải…
        </p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
