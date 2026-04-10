import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFamilyStore } from '@/store/familyStore'
import { useLoadCurrentTree } from '@/hooks/useLoadCurrentTree'
import { CreateTreeDialog } from '@/components/CreateTreeDialog'
import { PersonForm } from '@/components/PersonForm'
import { TreeCanvas } from '@/components/TreeCanvas'
import { matchesVietnameseSearch } from '@/lib/vietnamese'
import type { Person } from '@/types'

// =====================================================================
// HomePage — Phase 1 vertical slice.
//   - Empty state: hero copy + "Tạo gia phả mới" → CreateTreeDialog
//   - With-tree state: header + person list + "Thêm người"
// Tree canvas comes in Phase 2; for now we render a flat editorial list,
// ordered by generation then full_name.
// =====================================================================

export function HomePage() {
  const currentTree = useFamilyStore((s) => s.currentTree)
  const personsMap = useFamilyStore((s) => s.persons)
  const { loading, error } = useLoadCurrentTree()

  const [createOpen, setCreateOpen] = useState(false)
  const [personFormOpen, setPersonFormOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [query, setQuery] = useState('')

  const persons = useMemo(() => {
    return Object.values(personsMap).sort((a, b) => {
      if (a.generation !== b.generation) return a.generation - b.generation
      return a.full_name.localeCompare(b.full_name, 'vi')
    })
  }, [personsMap])

  const filteredPersons = useMemo(() => {
    if (!query.trim()) return persons
    return persons.filter((p) => {
      const haystack = [p.full_name, p.generation_name ?? '', p.birth_place ?? '']
        .join(' ')
      return matchesVietnameseSearch(haystack, query)
    })
  }, [persons, query])

  const handleAddPerson = () => {
    setEditingPerson(null)
    setPersonFormOpen(true)
  }

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person)
    setPersonFormOpen(true)
  }

  return (
    <main className="min-h-[100dvh] bg-white px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col items-center">
          <img
            src="https://swdoxzpjminxjmhqtsft.supabase.co/storage/v1/object/public/Logo/logo%20(1).png"
            alt="Logo gia phả"
            className="h-24 w-24 rounded-lg object-contain"
          />
        </div>

        <p className="mt-8 font-mono text-xs uppercase tracking-wider text-ink-100">
          Gia phả họ
        </p>

        {loading && (
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-ink-300">
            Đang tải…
          </h1>
        )}

        {error && !loading && (
          <div
            role="alert"
            className="mt-4 rounded-md bg-muted-red px-4 py-3 text-sm text-ink-300"
          >
            {error}
          </div>
        )}

        {!loading && !currentTree && (
          <>
            <h1 className="mt-3 text-4xl font-medium tracking-tight text-ink-300">
              Ghi chép gia phả nhiều đời
            </h1>
            <p className="mt-4 max-w-[55ch] text-ink-100">
              Bắt đầu bằng việc tạo một gia phả mới. Bạn có thể thêm cụ Tổ và mở
              rộng cây phả hệ qua từng đời.
            </p>
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="rounded-md bg-ink-300 px-4 py-2.5 text-sm font-medium text-paper-100 transition-transform duration-200 ease-editorial active:scale-[0.98]"
              >
                Tạo gia phả mới
              </button>
            </div>
          </>
        )}

        {!loading && currentTree && (
          <>
            <h1 className="mt-3 text-4xl font-medium tracking-tight text-ink-300">
              {currentTree.name}
            </h1>
            <p className="mt-4 max-w-[55ch] text-ink-100">
              Gia phả hiện đang ghi nhận{' '}
              <span className="tabular text-ink-300">{persons.length}</span>{' '}
              nhân khẩu.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleAddPerson}
                className="rounded-md bg-ink-300 px-4 py-2.5 text-sm font-medium text-paper-100 transition-transform duration-200 ease-editorial active:scale-[0.98]"
              >
                Thêm người
              </button>
              <Link
                to={`/view/${currentTree.public_slug}`}
                className="rounded-md border border-line px-4 py-2.5 text-sm text-ink-300 transition-colors duration-200 ease-editorial hover:bg-paper-200"
              >
                Xem trang công khai
              </Link>
              <Link
                to="/settings"
                className="rounded-md border border-line px-4 py-2.5 text-sm text-ink-300 transition-colors duration-200 ease-editorial hover:bg-paper-200"
              >
                Cài đặt
              </Link>
            </div>

            {currentTree.root_person_id && persons.length > 0 && (
              <section className="mt-16">
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-100">
                  Sơ đồ
                </p>
                <h2 className="mt-1 text-xl font-medium tracking-tight text-ink-300">
                  Cây phả hệ
                </h2>
                <div className="mt-6">
                  <TreeCanvas
                    persons={persons}
                    rootId={currentTree.root_person_id}
                    onSelect={handleEditPerson}
                  />
                </div>
              </section>
            )}

            <section className="mt-16">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-100">
                Danh sách
              </p>
              <h2 className="mt-1 text-xl font-medium tracking-tight text-ink-300">
                Nhân khẩu trong gia phả
              </h2>

              {persons.length === 0 ? (
                <p className="mt-6 max-w-[55ch] text-sm text-ink-100">
                  Chưa có ai trong gia phả. Bắt đầu bằng cụ Tổ — nhấn{' '}
                  <span className="text-ink-300">Thêm người</span>.
                </p>
              ) : (
                <>
                  <div className="mt-6">
                    <label htmlFor="person-search" className="sr-only">
                      Tìm theo tên, vai vế, hoặc quê quán
                    </label>
                    <input
                      id="person-search"
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Tìm theo tên, vai vế, quê quán…"
                      className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink-300 outline-none transition-colors duration-200 ease-editorial focus:border-sand-300"
                    />
                    {query.trim() && (
                      <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-100">
                        {filteredPersons.length} / {persons.length} kết quả
                      </p>
                    )}
                  </div>

                  {filteredPersons.length === 0 ? (
                    <p className="mt-6 max-w-[55ch] text-sm text-ink-100">
                      Không tìm thấy người nào khớp với
                      {' '}
                      <span className="text-ink-300">{query}</span>.
                    </p>
                  ) : (
                    <ul className="mt-6 divide-y divide-line border-y border-line">
                      {filteredPersons.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => handleEditPerson(p)}
                            className="group flex w-full items-baseline justify-between gap-4 py-4 text-left transition-colors duration-200 ease-editorial hover:bg-paper-200/50"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-base text-ink-300">
                                {p.full_name}
                              </div>
                              {p.generation_name && (
                                <div className="mt-0.5 text-xs text-ink-100">
                                  {p.generation_name}
                                </div>
                              )}
                            </div>
                            <div className="shrink-0 font-mono text-xs tabular text-ink-100">
                              {formatLifespan(p)}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>

      <CreateTreeDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <PersonForm
        open={personFormOpen}
        onClose={() => setPersonFormOpen(false)}
        editing={editingPerson}
      />
    </main>
  )
}

function formatLifespan(p: Person): string {
  const birth = p.birth_date ?? '?'
  const death = p.death_date ?? ''
  if (!p.birth_date && !p.death_date) return ''
  return death ? `${birth} – ${death}` : birth
}
