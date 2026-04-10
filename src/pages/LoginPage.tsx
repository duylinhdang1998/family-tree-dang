import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { loginFormSchema, type LoginFormValues } from '@/lib/validation'
import { useAuthStore } from '@/store/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const signIn = useAuthStore((s) => s.signIn)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  })

  if (session) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null)
    const { error } = await signIn(values.email, values.password)
    if (error) {
      setSubmitError(error)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <main className="min-h-[100dvh] bg-white px-6 py-24">
      <div className="mx-auto w-full max-w-md">
        <p className="font-mono text-xs uppercase tracking-wider text-ink-100">
          Quản trị
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight text-ink-300">
          Đăng nhập
        </h1>
        <p className="mt-3 max-w-[40ch] text-sm text-ink-100">
          Chỉ chủ gia phả mới cần đăng nhập. Người xem có thể truy cập trực tiếp
          qua đường dẫn công khai.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-10 grid gap-5">
          <div className="grid gap-2">
            <label
              htmlFor="email"
              className="font-mono text-[11px] uppercase tracking-wider text-ink-100"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              {...register('email')}
              className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink-300 outline-none transition-colors duration-200 ease-editorial focus:border-sand-300"
            />
            {errors.email && (
              <p className="text-xs text-ink-100">{errors.email.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="password"
              className="font-mono text-[11px] uppercase tracking-wider text-ink-100"
            >
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink-300 outline-none transition-colors duration-200 ease-editorial focus:border-sand-300"
            />
            {errors.password && (
              <p className="text-xs text-ink-100">{errors.password.message}</p>
            )}
          </div>

          {submitError && (
            <div className="rounded-md bg-muted-red px-3 py-2 text-xs text-ink-300">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-md bg-ink-300 px-4 py-2.5 text-sm font-medium text-paper-100 transition-transform duration-200 ease-editorial active:scale-[0.98] disabled:opacity-60"
          >
            {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </main>
  )
}
