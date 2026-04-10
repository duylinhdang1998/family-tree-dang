import { useMemo } from 'react'
import { buildHierarchy, type TreeNode } from '@/lib/treeLayout'
import type { Person } from '@/types'

// =====================================================================
// TreeCanvas — top-down family tree as a single SVG.
// Layout: simple recursive walk; leaves consume horizontal slots in
// reading order, internal nodes center over their child range. Good
// enough for gia phả-sized trees (≤ a few hundred persons).
//
// Spouses that are BOTH already in the hierarchy get a thin dashed
// horizontal connector. Spouses outside the hierarchy don't render
// here; they show in the searchable list below the canvas.
// =====================================================================

interface Props {
  persons: Person[]
  rootId: string | null
  onSelect: (person: Person) => void
}

interface PositionedNode {
  person: Person
  x: number // node center x
  y: number // node top y
  children: PositionedNode[]
}

const NODE_WIDTH = 180
const NODE_HEIGHT = 64
const H_GAP = 28
const V_GAP = 88
const PADDING = 32

export function TreeCanvas({ persons, rootId, onSelect }: Props) {
  const hierarchy = useMemo(
    () => buildHierarchy(persons, rootId),
    [persons, rootId],
  )

  const layout = useMemo(() => {
    if (!hierarchy) return null
    const cursor = { x: 0 }
    const positioned = layoutNode(hierarchy, 0, cursor)
    const flat = flatten(positioned)
    return { positioned, ...flat }
  }, [hierarchy])

  if (!hierarchy || !layout) {
    return (
      <div className="p-8 text-center text-sm text-ink-100">
        Chưa có cụ Tổ. Hãy thêm người đầu tiên để dựng cây gia phả.
      </div>
    )
  }

  // Compute bounding box
  let minX = Infinity
  let maxX = -Infinity
  let maxY = 0
  for (const n of layout.nodes) {
    if (n.x - NODE_WIDTH / 2 < minX) minX = n.x - NODE_WIDTH / 2
    if (n.x + NODE_WIDTH / 2 > maxX) maxX = n.x + NODE_WIDTH / 2
    if (n.y + NODE_HEIGHT > maxY) maxY = n.y + NODE_HEIGHT
  }
  const width = maxX - minX + PADDING * 2
  const height = maxY + PADDING * 2
  const offsetX = -minX + PADDING
  const offsetY = PADDING

  // Spouse pairs where both endpoints are positioned in this canvas.
  // Draw each pair only once (lower id → higher id).
  const positionedById = new Map<string, PositionedNode>()
  for (const n of layout.nodes) positionedById.set(n.person.id, n)
  const spousePairs: Array<{ a: PositionedNode; b: PositionedNode }> = []
  for (const n of layout.nodes) {
    for (const sid of n.person.spouse_ids ?? []) {
      if (sid <= n.person.id) continue // dedupe
      const other = positionedById.get(sid)
      if (!other) continue
      spousePairs.push({ a: n, b: other })
    }
  }

  return (
    <div className="overflow-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Cây gia phả"
        className="mx-auto block"
      >
        <g transform={`translate(${offsetX}, ${offsetY})`}>
          {/* Parent → child edges (drawn first so nodes paint over them) */}
          {layout.edges.map(({ from, to }, i) => {
            const x1 = from.x
            const y1 = from.y + NODE_HEIGHT
            const x2 = to.x
            const y2 = to.y
            const my = (y1 + y2) / 2
            const d = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`
            return (
              <path
                key={`edge-${i}`}
                d={d}
                fill="none"
                stroke="rgba(42, 31, 20, 0.18)"
                strokeWidth={1}
              />
            )
          })}

          {/* Spouse links (dashed sand) */}
          {spousePairs.map(({ a, b }, i) => {
            const ax = a.x + NODE_WIDTH / 2
            const ay = a.y + NODE_HEIGHT / 2
            const bx = b.x - NODE_WIDTH / 2
            const by = b.y + NODE_HEIGHT / 2
            // If at same generation (same y), straight line; else gentle curve.
            const d =
              ay === by
                ? `M ${ax} ${ay} L ${bx} ${by}`
                : `M ${ax} ${ay} C ${(ax + bx) / 2} ${ay}, ${(ax + bx) / 2} ${by}, ${bx} ${by}`
            return (
              <path
                key={`spouse-${i}`}
                d={d}
                fill="none"
                stroke="rgba(166, 124, 61, 0.55)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )
          })}

          {/* Nodes */}
          {layout.nodes.map((n) => (
            <foreignObject
              key={n.person.id}
              x={n.x - NODE_WIDTH / 2}
              y={n.y}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
            >
              <button
                type="button"
                onClick={() => onSelect(n.person)}
                className="flex h-full w-full flex-col justify-center rounded-md border border-line bg-white px-3 text-left transition-colors duration-200 ease-editorial hover:border-sand-300 hover:bg-white"
              >
                <div className="truncate text-sm font-medium text-ink-300">
                  {n.person.full_name}
                </div>
                <div className="mt-0.5 flex items-baseline justify-between gap-2">
                  {n.person.generation_name ? (
                    <span className="truncate font-mono text-[10px] uppercase tracking-wider text-ink-100">
                      {n.person.generation_name}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="shrink-0 font-mono text-[10px] tabular text-ink-100">
                    {formatLifespan(n.person)}
                  </span>
                </div>
              </button>
            </foreignObject>
          ))}
        </g>
      </svg>
    </div>
  )
}

// ---------- layout helpers ----------

function layoutNode(
  node: TreeNode,
  depth: number,
  cursor: { x: number },
): PositionedNode {
  const y = depth * (NODE_HEIGHT + V_GAP)

  if (node.children.length === 0) {
    const x = cursor.x + NODE_WIDTH / 2
    cursor.x += NODE_WIDTH + H_GAP
    return { person: node.person, x, y, children: [] }
  }

  const positionedChildren = node.children.map((c) =>
    layoutNode(c, depth + 1, cursor),
  )
  const first = positionedChildren[0]
  const last = positionedChildren[positionedChildren.length - 1]
  const x = (first.x + last.x) / 2

  return { person: node.person, x, y, children: positionedChildren }
}

function flatten(node: PositionedNode): {
  nodes: PositionedNode[]
  edges: Array<{ from: PositionedNode; to: PositionedNode }>
} {
  const nodes: PositionedNode[] = [node]
  const edges: Array<{ from: PositionedNode; to: PositionedNode }> = []
  for (const c of node.children) {
    edges.push({ from: node, to: c })
    const sub = flatten(c)
    nodes.push(...sub.nodes)
    edges.push(...sub.edges)
  }
  return { nodes, edges }
}

function formatLifespan(p: Person): string {
  const birth = p.birth_date ?? ''
  const death = p.death_date ?? ''
  if (!birth && !death) return ''
  if (birth && death) return `${birth} – ${death}`
  return birth || `– ${death}`
}
