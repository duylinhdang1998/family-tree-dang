import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

// =====================================================================
// Auth store — single source of truth for the current Supabase session.
// init() is called once from App.tsx; it hydrates from existing storage
// and subscribes to onAuthStateChange so refresh tokens flow through.
// =====================================================================

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  initialized: boolean
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,
  initialized: false,

  init: async () => {
    if (get().initialized) return
    set({ initialized: true })

    const { data } = await supabase.auth.getSession()
    set({
      session: data.session,
      user: data.session?.user ?? null,
      loading: false,
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        loading: false,
      })
    })
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: translateAuthError(error.message) }
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
  },
}))

function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid credentials')) {
    return 'Email hoặc mật khẩu không đúng'
  }
  if (m.includes('email not confirmed')) {
    return 'Email chưa được xác nhận'
  }
  if (m.includes('rate limit')) {
    return 'Bạn đã thử quá nhiều lần, vui lòng đợi một lát'
  }
  return 'Đăng nhập thất bại, vui lòng thử lại'
}
