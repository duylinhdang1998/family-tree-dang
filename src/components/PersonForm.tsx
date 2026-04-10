import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from './Modal'
import { PersonPicker } from './PersonPicker'
import { supabase } from '@/lib/supabase'
import { getDb } from '@/lib/db'
import { enqueue } from '@/lib/syncEngine'
import { useFamilyStore } from '@/store/familyStore'
import { useToastStore } from '@/store/toastStore'
import {
  personFormSchema,
  type PersonFormParsed,
  type PersonFormValues,
} from '@/lib/validation'
import type { Person } from '@/types'

// =====================================================================
// PersonForm — create or edit a single person.
// Fields: identity (name/gender/dates/place/notes) + parent/spouse pickers.
// Generation depth is computed from parents on save (max(parent.gen) + 1).
// Spouse links are mirrored to the other side via syncSpouseSymmetry.
//
// New persons inserted into an empty tree become the tree's root_person_id
// (so the viewer has a starting node).
// =====================================================================

interface Props {
  open: boolean
  onClose: () => void
  /** When set, edit this existing person; otherwise insert a new one. */
  editing?: Person | null
}

const emptyDefaults: PersonFormValues = {
  full_name: '',
  generation_name: '',
  gender: 'unknown',
  birth_date: '',
  death_date: '',
  birth_place: '',
  notes: '',
  parent_ids: [],
  spouse_ids: [],
}

export function PersonForm({ open, onClose, editing }: Props) {
  const currentTree = useFamilyStore((s) => s.currentTree)
  const setCurrentTree = useFamilyStore((s) => s.setCurrentTree)
  const upsertPerson = useFamilyStore((s) => s.upsertPerson)
  const removePerson = useFamilyStore((s) => s.removePerson)
  const personsMap = useFamilyStore((s) => s.persons)
  const personCount = Object.keys(personsMap).length
  const showToast = useToastStore((s) => s.show)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const allPersons = useMemo(() => Object.values(personsMap), [personsMap])

  // Cycle prevention: when picking parents, exclude self + all descendants of
  // self. (For a brand-new person, descendants is empty.)
  const excludedParentIds = useMemo(() => {
    if (!editing) return [] as string[]
    const descendants = computeDescendants(editing.id, allPersons)
    return [editing.id, ...descendants]
  }, [editing, allPersons])

  const excludedSpouseIds = useMemo(() => {
    return editing ? [editing.id] : []
  }, [editing])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
  } = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    defaultValues: emptyDefaults,
  })

  // Reset form when opening or when switching between create/edit
  useEffect(() => {
    if (!open) return
    if (editing) {
      reset({
        full_name: editing.full_name,
        generation_name: editing.generation_name ?? '',
        gender: editing.gender,
        birth_date: editing.birth_date ?? '',
        death_date: editing.death_date ?? '',
        birth_place: editing.birth_place ?? '',
        notes: editing.notes ?? '',
        parent_ids: editing.parent_ids ?? [],
        spouse_ids: editing.spouse_ids ?? [],
      })
    } else {
      reset(emptyDefaults)
    }
    setSubmitError(null)
    setConfirmingDelete(false)
  }, [open, editing, reset])

  const onSubmit = handleSubmit(async (raw) => {
    if (!currentTree) {
      setSubmitError('Chưa có gia phả nào được mở')
      return
    }
    setSubmitError(null)

    // RHF passes the parsed (output) shape to the resolver but typed as input,
    // so cast back to the parsed type for the actual write.
    const values = raw as unknown as PersonFormParsed
    const generation = computeGeneration(values.parent_ids, personsMap)

    if (editing) {
      const previousSpouseIds = editing.spouse_ids ?? []

      const { data, error } = await supabase
        .from('persons')
        .update({
          full_name: values.full_name,
          generation_name: values.generation_name,
          gender: values.gender,
          birth_date: values.birth_date,
          death_date: values.death_date,
          birth_place: values.birth_place,
          notes: values.notes,
          parent_ids: values.parent_ids,
          spouse_ids: values.spouse_ids,
          generation,
        })
        .eq('id', editing.id)
        .select('*')
        .single()

      if (error || !data) {
        setSubmitError(error?.message ?? 'Không thể lưu, vui lòng thử lại')
        return
      }

      const updated = data as Person
      upsertPerson(updated)
      try {
        const db = await getDb()
        await db.put('persons', updated)
      } catch {
        /* IDB unavailable */
      }

      // Mirror spouse links onto the other side. TASTE-E1: best-effort,
      // sequential — partial failure is acceptable for the single-admin model.
      await syncSpouseSymmetry({
        selfId: editing.id,
        previousSpouseIds,
        nextSpouseIds: values.spouse_ids,
        personsMap,
        upsertPerson,
      })
    } else {
      const isFirstPerson = personCount === 0
      const { data, error } = await supabase
        .from('persons')
        .insert({
          tree_id: currentTree.id,
          full_name: values.full_name,
          generation_name: values.generation_name,
          gender: values.gender,
          birth_date: values.birth_date,
          death_date: values.death_date,
          birth_place: values.birth_place,
          notes: values.notes,
          parent_ids: values.parent_ids,
          spouse_ids: values.spouse_ids,
          generation,
        })
        .select('*')
        .single()

      if (error || !data) {
        setSubmitError(error?.message ?? 'Không thể thêm người, vui lòng thử lại')
        return
      }

      const inserted = data as Person
      upsertPerson(inserted)

      // First person becomes the tree's root automatically
      if (isFirstPerson && !currentTree.root_person_id) {
        const { data: treeUpdate, error: treeErr } = await supabase
          .from('family_trees')
          .update({ root_person_id: inserted.id })
          .eq('id', currentTree.id)
          .select('*')
          .single()
        if (!treeErr && treeUpdate) {
          setCurrentTree(treeUpdate as typeof currentTree)
        }
      }

      try {
        const db = await getDb()
        await db.put('persons', inserted)
      } catch {
        /* IDB unavailable */
      }

      await syncSpouseSymmetry({
        selfId: inserted.id,
        previousSpouseIds: [],
        nextSpouseIds: values.spouse_ids,
        personsMap,
        upsertPerson,
      })
    }

    reset(emptyDefaults)
    onClose()
  })

  const handleClose = () => {
    if (isSubmitting || deleting) return
    reset(emptyDefaults)
    setSubmitError(null)
    setConfirmingDelete(false)
    onClose()
  }

  const handleDeleteClick = () => {
    if (!editing) return
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    void runDelete()
  }

  const runDelete = async () => {
    if (!editing || !currentTree) return
    setDeleting(true)
    setSubmitError(null)

    // Snapshot person + every sibling whose array currently references this id.
    // The snapshot is what undo restores; capture it BEFORE we mutate the store.
    const snapshot: Person = { ...editing }
    const treeId = currentTree.id
    const wasRoot = currentTree.root_person_id === editing.id
    const previousRootTree = currentTree
    const affectedSiblings: Person[] = []
    for (const p of Object.values(personsMap)) {
      if (p.id === editing.id) continue
      if (
        p.parent_ids.includes(editing.id) ||
        p.spouse_ids.includes(editing.id)
      ) {
        affectedSiblings.push({ ...p })
      }
    }

    const { error } = await supabase
      .from('persons')
      .delete()
      .eq('id', editing.id)

    if (error) {
      setSubmitError(error.message ?? 'Không thể xóa, vui lòng thử lại')
      setDeleting(false)
      return
    }

    // Local store cleanup (mirrors the cleanup_person_refs trigger).
    removePerson(editing.id)

    try {
      const db = await getDb()
      await db.delete('persons', editing.id)
    } catch {
      /* IDB unavailable */
    }

    setDeleting(false)
    setConfirmingDelete(false)
    onClose()

    showToast({
      message: `Đã xóa ${snapshot.full_name}.`,
      actionLabel: 'Hoàn tác',
      durationMs: 6000,
      onAction: () =>
        undoDeletePerson({
          snapshot,
          affectedSiblings,
          treeId,
          wasRoot,
          previousRootTree,
          upsertPerson,
          setCurrentTree,
        }),
    })
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      eyebrow={editing ? 'Chỉnh sửa' : 'Thêm mới'}
      title={editing ? 'Sửa thông tin' : 'Thêm người vào gia phả'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <Field
          id="full_name"
          label="Họ và tên"
          required
          error={errors.full_name?.message}
        >
          <input
            id="full_name"
            type="text"
            autoFocus
            placeholder="Nguyễn Văn A"
            className={inputCls}
            {...register('full_name')}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field
            id="gender"
            label="Giới tính"
            error={errors.gender?.message}
          >
            <select id="gender" className={inputCls} {...register('gender')}>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="unknown">Chưa rõ</option>
            </select>
          </Field>
          <Field
            id="generation_name"
            label="Tên đời / vai vế"
            error={errors.generation_name?.message}
          >
            <input
              id="generation_name"
              type="text"
              placeholder="Cụ Tổ, Cao Tổ…"
              className={inputCls}
              {...register('generation_name')}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field
            id="birth_date"
            label="Năm sinh"
            error={errors.birth_date?.message}
          >
            <input
              id="birth_date"
              type="text"
              placeholder="1925 hoặc 1925-03-12"
              className={inputCls}
              {...register('birth_date')}
            />
          </Field>
          <Field
            id="death_date"
            label="Năm mất"
            error={errors.death_date?.message}
          >
            <input
              id="death_date"
              type="text"
              placeholder="1998"
              className={inputCls}
              {...register('death_date')}
            />
          </Field>
        </div>

        <Field
          id="birth_place"
          label="Quê quán"
          error={errors.birth_place?.message}
        >
          <input
            id="birth_place"
            type="text"
            placeholder="Làng Đông, huyện Tiên Lữ"
            className={inputCls}
            {...register('birth_place')}
          />
        </Field>

        <Field id="notes" label="Ghi chú" error={errors.notes?.message}>
          <textarea
            id="notes"
            rows={3}
            placeholder="Tiểu sử, công đức, hành trạng…"
            className={`${inputCls} resize-none`}
            {...register('notes')}
          />
        </Field>

        <Controller
          control={control}
          name="parent_ids"
          render={({ field }) => (
            <PersonPicker
              label="Cha mẹ"
              candidates={allPersons}
              selectedIds={field.value ?? []}
              onChange={field.onChange}
              excludeIds={excludedParentIds}
              maxSelected={2}
              helpText={
                errors.parent_ids?.message ??
                'Tối đa 2 người. Vai vế (đời) sẽ được tính tự động.'
              }
            />
          )}
        />

        <Controller
          control={control}
          name="spouse_ids"
          render={({ field }) => (
            <PersonPicker
              label="Vợ / chồng"
              candidates={allPersons}
              selectedIds={field.value ?? []}
              onChange={field.onChange}
              excludeIds={excludedSpouseIds}
              helpText={errors.spouse_ids?.message}
            />
          )}
        />

        {submitError && (
          <div
            role="alert"
            className="rounded-md bg-muted-red px-3 py-2 text-xs text-ink-300"
          >
            {submitError}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          <div>
            {editing && (
              <>
                {confirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={deleting}
                      className="rounded-md border border-line px-3 py-2 text-xs text-ink-300 transition-colors duration-200 ease-editorial hover:bg-paper-200 disabled:opacity-50"
                    >
                      Không xóa
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteClick}
                      disabled={deleting}
                      className="rounded-md border border-line bg-muted-red px-3 py-2 text-xs font-medium text-ink-300 transition-transform duration-200 ease-editorial active:scale-[0.98] disabled:opacity-60"
                    >
                      {deleting ? 'Đang xóa…' : 'Xác nhận xóa'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    disabled={isSubmitting || deleting}
                    className="rounded-md border border-line px-3 py-2 text-xs text-ink-100 transition-colors duration-200 ease-editorial hover:bg-muted-red hover:text-ink-300 disabled:opacity-50"
                  >
                    Xóa người
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting || deleting}
              className="rounded-md border border-line px-4 py-2.5 text-sm text-ink-300 transition-colors duration-200 ease-editorial hover:bg-paper-200 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || deleting}
              className="rounded-md bg-ink-300 px-4 py-2.5 text-sm font-medium text-paper-100 transition-transform duration-200 ease-editorial active:scale-[0.98] disabled:opacity-60"
            >
              {isSubmitting ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ---------- helpers (file-local, no separate module needed) ----------

/**
 * Undo a hard delete: re-insert the person row and re-add the deleted id back
 * into every sibling that referenced it. Best-effort; failures are logged but
 * not surfaced — TASTE-E5 explicitly accepts that undo can be lossy.
 */
async function undoDeletePerson(args: {
  snapshot: Person
  affectedSiblings: Person[]
  treeId: string
  wasRoot: boolean
  previousRootTree: import('@/types').FamilyTree
  upsertPerson: (p: Person) => void
  setCurrentTree: (t: import('@/types').FamilyTree | null) => void
}): Promise<void> {
  const { snapshot, affectedSiblings, wasRoot, previousRootTree, upsertPerson, setCurrentTree } = args

  // Re-insert the person row with its original id. Postgres has no issue
  // re-using a UUID once the row is gone.
  const { data: reinserted, error } = await supabase
    .from('persons')
    .insert({
      id: snapshot.id,
      tree_id: snapshot.tree_id,
      full_name: snapshot.full_name,
      generation_name: snapshot.generation_name,
      gender: snapshot.gender,
      birth_date: snapshot.birth_date,
      death_date: snapshot.death_date,
      birth_place: snapshot.birth_place,
      notes: snapshot.notes,
      parent_ids: snapshot.parent_ids,
      spouse_ids: snapshot.spouse_ids,
      generation: snapshot.generation,
    })
    .select('*')
    .single()

  if (error || !reinserted) {
    // eslint-disable-next-line no-console
    console.error('Hoàn tác thất bại:', error)
    return
  }

  upsertPerson(reinserted as Person)

  try {
    const db = await getDb()
    await db.put('persons', reinserted as Person)
  } catch {
    /* IDB unavailable */
  }

  // Restore each sibling's array reference. Sequential — partial failure is
  // acceptable per TASTE-E5.
  for (const sibling of affectedSiblings) {
    const { data, error: sibErr } = await supabase
      .from('persons')
      .update({
        parent_ids: sibling.parent_ids,
        spouse_ids: sibling.spouse_ids,
      })
      .eq('id', sibling.id)
      .select('*')
      .single()
    if (sibErr || !data) continue
    upsertPerson(data as Person)
    try {
      const db = await getDb()
      await db.put('persons', data as Person)
    } catch {
      /* IDB unavailable */
    }
  }

  // Restore root_person_id if this person was the tree's root.
  if (wasRoot) {
    const { data: treeData, error: treeErr } = await supabase
      .from('family_trees')
      .update({ root_person_id: snapshot.id })
      .eq('id', previousRootTree.id)
      .select('*')
      .single()
    if (!treeErr && treeData) {
      setCurrentTree(treeData as typeof previousRootTree)
    }
  }
}

/**
 * BFS the descendant set of `rootId` via parent_ids edges. Used by the parent
 * picker to prevent cycles — you can't choose a descendant as your own parent.
 */
function computeDescendants(rootId: string, persons: Person[]): Set<string> {
  const childrenByParent = new Map<string, string[]>()
  for (const p of persons) {
    for (const pid of p.parent_ids ?? []) {
      const arr = childrenByParent.get(pid) ?? []
      arr.push(p.id)
      childrenByParent.set(pid, arr)
    }
  }
  const result = new Set<string>()
  const queue: string[] = [rootId]
  while (queue.length > 0) {
    const cur = queue.shift() as string
    const kids = childrenByParent.get(cur) ?? []
    for (const k of kids) {
      if (!result.has(k)) {
        result.add(k)
        queue.push(k)
      }
    }
  }
  return result
}

/**
 * Generation depth = max(parent.generation) + 1, or 0 for roots.
 * If a parent id is missing from the local map (e.g. mid-sync), we treat it
 * as generation 0 to avoid blocking the save.
 */
function computeGeneration(
  parentIds: string[],
  personsMap: Record<string, Person>,
): number {
  if (!parentIds || parentIds.length === 0) return 0
  let maxGen = -1
  for (const pid of parentIds) {
    const parent = personsMap[pid]
    const g = parent ? parent.generation : 0
    if (g > maxGen) maxGen = g
  }
  return maxGen + 1
}

/**
 * Spouse links are bidirectional but stored on both rows. When the user adds
 * or removes a spouse, mirror the change onto the other side: optimistic
 * local update first, then enqueue an upsert through syncEngine so the
 * mirror survives a network blip. TASTE-E1 (single admin, naive LWW).
 */
async function syncSpouseSymmetry(args: {
  selfId: string
  previousSpouseIds: string[]
  nextSpouseIds: string[]
  personsMap: Record<string, Person>
  upsertPerson: (p: Person) => void
}): Promise<void> {
  const { selfId, previousSpouseIds, nextSpouseIds, personsMap, upsertPerson } = args
  const prev = new Set(previousSpouseIds)
  const next = new Set(nextSpouseIds)

  const added: string[] = []
  const removed: string[] = []
  for (const id of next) if (!prev.has(id)) added.push(id)
  for (const id of prev) if (!next.has(id)) removed.push(id)

  for (const spouseId of added) {
    const spouse = personsMap[spouseId]
    if (!spouse) continue
    if (spouse.spouse_ids.includes(selfId)) continue
    const updated: Person = {
      ...spouse,
      spouse_ids: [...spouse.spouse_ids, selfId],
      updated_at: new Date().toISOString(),
    }
    upsertPerson(updated)
    await enqueue({ kind: 'upsert_person', person: updated })
  }

  for (const spouseId of removed) {
    const spouse = personsMap[spouseId]
    if (!spouse) continue
    if (!spouse.spouse_ids.includes(selfId)) continue
    const updated: Person = {
      ...spouse,
      spouse_ids: spouse.spouse_ids.filter((x) => x !== selfId),
      updated_at: new Date().toISOString(),
    }
    upsertPerson(updated)
    await enqueue({ kind: 'upsert_person', person: updated })
  }
}

const inputCls =
  'w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink-300 outline-none transition-colors duration-200 ease-editorial focus:border-sand-300'

interface FieldProps {
  id: string
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}

function Field({ id, label, required, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block font-mono text-[11px] uppercase tracking-wider text-ink-100"
      >
        {label}
        {required && <span className="ml-1 text-sand-300">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-ink-100">{error}</p>}
    </div>
  )
}
