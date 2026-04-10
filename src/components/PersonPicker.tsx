import { useMemo, useState } from 'react'
import { matchesVietnameseSearch } from '@/lib/vietnamese'
import type { Person } from '@/types'

// =====================================================================
// PersonPicker — searchable autocomplete with chips. Used by PersonForm
// for parent + spouse selection. Diacritic-insensitive search via
// `matchesVietnameseSearch`. Stateless w.r.t. selection (controlled).
// =====================================================================

interface Props {
  label: string
  candidates: Person[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  /** Ids that should never appear in the dropdown (self, descendants, etc). */
  excludeIds?: string[]
  /** Hard cap on selection — picker hides input once reached. */
  maxSelected?: number
  placeholder?: string
  helpText?: string
}

export function PersonPicker({
  label,
  candidates,
  selectedIds,
  onChange,
  excludeIds = [],
  maxSelected,
  placeholder = 'Tìm theo tên…',
  helpText,
}: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const byId = useMemo(() => {
    const m = new Map<string, Person>()
    for (const p of candidates) m.set(p.id, p)
    return m
  }, [candidates])

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => byId.get(id))
        .filter((p): p is Person => Boolean(p)),
    [selectedIds, byId],
  )

  const reachedMax =
    maxSelected !== undefined && selectedIds.length >= maxSelected

  const matches = useMemo(() => {
    const excludeSet = new Set<string>([...excludeIds, ...selectedIds])
    return candidates
      .filter((p) => !excludeSet.has(p.id))
      .filter((p) => matchesVietnameseSearch(p.full_name, query))
      .slice(0, 8)
  }, [candidates, excludeIds, selectedIds, query])

  const handleAdd = (id: string) => {
    if (reachedMax) return
    onChange([...selectedIds, id])
    setQuery('')
  }

  const handleRemove = (id: string) => {
    onChange(selectedIds.filter((x) => x !== id))
  }

  return (
    <div className="space-y-1.5">
      <div className="font-mono text-[11px] uppercase tracking-wider text-ink-100">
        {label}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper-200 px-2 py-1 text-xs text-ink-300"
            >
              <span className="max-w-[12rem] truncate">{p.full_name}</span>
              <button
                type="button"
                onClick={() => handleRemove(p.id)}
                className="text-ink-100 transition-colors duration-150 hover:text-ink-300"
                aria-label={`Bỏ ${p.full_name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {!reachedMax && (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              // Delay so click on dropdown item still fires
              window.setTimeout(() => setOpen(false), 150)
            }}
            placeholder={placeholder}
            className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink-300 outline-none transition-colors duration-200 ease-editorial focus:border-sand-300"
          />

          {open && matches.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-line bg-white shadow-sm">
              {matches.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleAdd(p.id)}
                    className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm text-ink-300 transition-colors duration-150 hover:bg-paper-200"
                  >
                    <span className="truncate">{p.full_name}</span>
                    {p.generation_name && (
                      <span className="shrink-0 text-xs text-ink-100">
                        {p.generation_name}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {open && query && matches.length === 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-xs text-ink-100 shadow-sm">
              Không tìm thấy
            </div>
          )}
        </div>
      )}

      {helpText && <p className="text-xs text-ink-100">{helpText}</p>}
    </div>
  )
}
