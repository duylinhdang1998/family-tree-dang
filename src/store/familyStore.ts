import { create } from 'zustand'
import type { FamilyTree, Person } from '@/types'

// =====================================================================
// Family store — local cache of the currently-open tree + its persons.
// TASTE-E5 (hard delete cascade): removePerson must scrub the deleted
// id from every sibling's parent_ids / spouse_ids in the same tree.
// The DB has a server-side trigger doing the same thing for defense in
// depth, but we need it locally so the UI updates instantly without a
// pull round-trip.
// =====================================================================

type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error'

interface FamilyState {
  currentTree: FamilyTree | null
  /** Keyed by person id for O(1) lookups. */
  persons: Record<string, Person>
  selectedPersonId: string | null
  syncStatus: SyncStatus
  lastSyncedAt: string | null

  setCurrentTree: (tree: FamilyTree | null) => void
  setPersons: (persons: Person[]) => void
  upsertPerson: (person: Person) => void
  removePerson: (personId: string) => void
  selectPerson: (id: string | null) => void
  setSyncStatus: (status: SyncStatus) => void
  markSynced: () => void
  reset: () => void
}

export const useFamilyStore = create<FamilyState>((set) => ({
  currentTree: null,
  persons: {},
  selectedPersonId: null,
  syncStatus: 'idle',
  lastSyncedAt: null,

  setCurrentTree: (tree) => set({ currentTree: tree }),

  setPersons: (persons) => {
    const map: Record<string, Person> = {}
    for (const p of persons) map[p.id] = p
    set({ persons: map })
  },

  upsertPerson: (person) =>
    set((state) => ({
      persons: { ...state.persons, [person.id]: person },
    })),

  removePerson: (personId) =>
    set((state) => {
      const next: Record<string, Person> = {}
      for (const [id, p] of Object.entries(state.persons)) {
        if (id === personId) continue
        const cleanedParents = p.parent_ids.filter((pid) => pid !== personId)
        const cleanedSpouses = p.spouse_ids.filter((sid) => sid !== personId)
        if (
          cleanedParents.length !== p.parent_ids.length ||
          cleanedSpouses.length !== p.spouse_ids.length
        ) {
          next[id] = { ...p, parent_ids: cleanedParents, spouse_ids: cleanedSpouses }
        } else {
          next[id] = p
        }
      }
      const nextTree =
        state.currentTree && state.currentTree.root_person_id === personId
          ? { ...state.currentTree, root_person_id: null }
          : state.currentTree
      return {
        persons: next,
        currentTree: nextTree,
        selectedPersonId:
          state.selectedPersonId === personId ? null : state.selectedPersonId,
      }
    }),

  selectPerson: (id) => set({ selectedPersonId: id }),
  setSyncStatus: (status) => set({ syncStatus: status }),
  markSynced: () => set({ syncStatus: 'idle', lastSyncedAt: new Date().toISOString() }),
  reset: () =>
    set({
      currentTree: null,
      persons: {},
      selectedPersonId: null,
      syncStatus: 'idle',
      lastSyncedAt: null,
    }),
}))
