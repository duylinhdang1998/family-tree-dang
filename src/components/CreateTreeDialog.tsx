import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { nanoid } from 'nanoid'
import { Modal } from './Modal'
import { supabase } from '@/lib/supabase'
import { slugify } from '@/lib/vietnamese'
import { getDb } from '@/lib/db'
import { useAuthStore } from '@/store/authStore'
import { useFamilyStore } from '@/store/familyStore'
import { familyTreeFormSchema, type FamilyTreeFormValues } from '@/lib/validation'
import type { FamilyTree } from '@/types'

// =====================================================================
// CreateTreeDialog — first-run flow. Inserts a single family_trees row,
// hydrates familyStore, mirrors to IDB. RLS enforces owner_id at the DB.
// =====================================================================

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateTreeDialog({ open, onClose }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const setCurrentTree = useFamilyStore((s) => s.setCurrentTree)
  const setPersons = useFamilyStore((s) => s.setPersons)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FamilyTreeFormValues>({
    resolver: zodResolver(familyTreeFormSchema),
    defaultValues: { name: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    if (!userId) {
      setSubmitError('Bạn cần đăng nhập để tạo gia phả')
      return
    }
    setSubmitError(null)

    const { data, error } = await supabase
      .from('family_trees')
      .insert({
        owner_id: userId,
        name: values.name,
        public_slug: `${slugify(values.name).slice(0, 50)}-${nanoid(4)}`,
      })
      .select('*')
      .single()

    if (error || !data) {
      setSubmitError(error?.message ?? 'Không thể tạo gia phả, vui lòng thử lại')
      return
    }

    const tree = data as FamilyTree
    setCurrentTree(tree)
    setPersons([])

    try {
      const db = await getDb()
      await db.put('family_trees', tree)
    } catch {
      // IDB unavailable — non-fatal
    }

    reset()
    onClose()
  })

  const handleClose = () => {
    if (isSubmitting) return
    reset()
    setSubmitError(null)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      eyebrow="Bước 1"
      title="Tạo gia phả mới"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <p className="max-w-[55ch] text-sm leading-relaxed text-ink-100">
          Đặt tên cho gia phả của bạn. Bạn có thể đổi tên sau trong phần cài đặt.
        </p>

        <div className="space-y-1.5">
          <label
            htmlFor="tree-name"
            className="block font-mono text-[11px] uppercase tracking-wider text-ink-100"
          >
            Tên gia phả
          </label>
          <input
            id="tree-name"
            type="text"
            autoFocus
            placeholder="Ví dụ: Gia phả họ Nguyễn"
            className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink-300 outline-none transition-colors duration-200 ease-editorial focus:border-sand-300"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-xs text-ink-100">{errors.name.message}</p>
          )}
        </div>

        {submitError && (
          <div
            role="alert"
            className="rounded-md bg-muted-red px-3 py-2 text-xs text-ink-300"
          >
            {submitError}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-md border border-line px-4 py-2.5 text-sm text-ink-300 transition-colors duration-200 ease-editorial hover:bg-paper-200 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-ink-300 px-4 py-2.5 text-sm font-medium text-paper-100 transition-transform duration-200 ease-editorial active:scale-[0.98] disabled:opacity-60"
          >
            {isSubmitting ? 'Đang tạo…' : 'Tạo gia phả'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
