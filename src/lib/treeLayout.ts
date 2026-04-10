import type { Person } from '@/types'

// =====================================================================
// Hierarchy builder — turns a flat persons[] into a parent→children
// tree rooted at `rootId`. Cycle-safe via a visited set.
//
// NOTE: This is the data layout, not the visual layout. The renderer
// (Phase 2) will compute x/y positions on top of this hierarchy.
// =====================================================================

export interface TreeNode {
  person: Person
  children: TreeNode[]
}

export function buildHierarchy(persons: Person[], rootId: string | null): TreeNode | null {
  if (!rootId) return null

  const byId = new Map<string, Person>()
  for (const p of persons) byId.set(p.id, p)

  const root = byId.get(rootId)
  if (!root) return null

  // Index children by parent. A person can list multiple parent_ids;
  // we add them under each parent so spouses still see shared children.
  const childrenByParent = new Map<string, Person[]>()
  for (const p of persons) {
    for (const pid of p.parent_ids) {
      const arr = childrenByParent.get(pid)
      if (arr) arr.push(p)
      else childrenByParent.set(pid, [p])
    }
  }

  const visited = new Set<string>()

  function build(person: Person): TreeNode {
    visited.add(person.id)
    const kids = childrenByParent.get(person.id) ?? []
    return {
      person,
      children: kids
        .filter((k) => !visited.has(k.id))
        .map((k) => build(k)),
    }
  }

  return build(root)
}
