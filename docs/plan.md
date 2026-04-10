# Giả Phả Họ — Web App Cây Gia Phả

> **Status:** `/autoplan` in progress — Phase 1 (CEO) complete, Phase 2 (Design) & Phase 3 (Eng) pending.
> **Updated:** 2026-04-09 after Premise Gate (cloud sync confirmed).

## Context

Một dòng họ Việt cần web app để ghi lại, hiển thị và khám phá cây gia phả nhiều thế hệ (cây gia phả nhiều cấp). Đây là greenfield build — không có code cũ. Yêu cầu: lưu được nhiều đời, theo quy ước Việt (tên lót, đời, dòng), và dễ dùng cho người không rành kỹ thuật.

## Problem Statement

Dữ liệu gia phả hiện tại nằm ở sổ giấy, ghi chép rời rạc, hoặc chỉ trong trí nhớ các cụ. Chưa có công cụ số nào:
- Hiểu quy ước đặt tên/đời của người Việt
- Hỗ trợ cây 8–12+ đời điển hình của một dòng họ
- Cho người không rành kỹ thuật dùng được
- An toàn dữ liệu qua thời gian

## Core Users
1. **Admin dòng họ (1–2 người)** — nhập, chỉnh sửa, quản lý cây
2. **Thành viên dòng họ** — xem cây, tìm người thân, đọc profile (read-only link)
3. **Con cháu về sau** — admin thêm họ vào cây khi có thông tin

## Premise Gate Results (2026-04-09)

| Premise | Confirmed | Impact |
|---|---|---|
| **Cloud sync** (thay vì local-first) | ✅ Admin 1 tài khoản, sync nhiều thiết bị. Family members dùng read-only link. | Cần backend + auth. Chọn Supabase. |
| **react-d3-tree + spouse overlay SVG** | ✅ Khuyến nghị chấp nhận | Giữ bundle nhỏ, isolate trong `TreeView/` để thay được sau |
| **Full MVP với D3 tree ngay từ đầu** | ✅ Khuyến nghị chấp nhận | ~4 tuần CC-assisted thay vì 2 tuần |

---

## Feature Set

### Must Have (MVP)
- **Admin auth**: email/password (Supabase Auth)
- **Tree visualization**: cây nhiều cấp với zoom/pan
- **Person node**: họ tên, tên lót theo đời, giới tính, năm sinh/mất
- **Parent → child**: ruột + nuôi
- **Spouse**: nhiều vợ/chồng, overlay SVG lines
- **Person profile**: họ tên, ngày sinh, ngày mất, quê quán, ghi chú, ảnh
- **Add / edit / delete** (admin only)
- **Search theo tên** (có dấu + không dấu)
- **Cloud sync**: admin login → sync IndexedDB ↔ Supabase
- **Read-only share link**: `/view/:treeId` — family members xem không cần login
- **Offline-first**: app chạy offline, sync khi có mạng
- **Vietnamese UI**

### Should Have
- Generation markers (Đời 1, Đời 2, ...)
- Export tree as image (PNG/SVG)
- Print-friendly view
- Mobile responsive
- Import/export JSON backup (ngoài cloud sync, làm backup thủ công)

### Could Have (post-MVP, → TODOS.md)
- Timeline view
- Relationship path finder ("Tôi có quan hệ gì với X?")
- Multi-clan support
- Oral history capture (audio/video)
- GEDCOM import/export
- Passphrase encryption trước khi sync cloud

---

## Technical Approach

### Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Tree visualization**: `react-d3-tree` (hierarchy) + custom SVG overlay (spouses)
- **State**: Zustand (single store, small bundle)
- **Local cache**: IndexedDB qua `idb` library (offline-first)
- **Backend**: **Supabase** (Postgres + Auth + Realtime)
- **Styling**: Tailwind CSS + shadcn/ui
- **Forms**: React Hook Form + Zod
- **Routing**: React Router (`/` admin, `/view/:treeId` read-only)

### Data Model

```typescript
// FINAL (post Final Gate 2026-04-09): no photo, no tombstone, no childrenIds persisted
interface Person {
  id: string              // uuid
  treeId: string          // FK → FamilyTree
  fullName: string        // Họ và tên đầy đủ
  generationName?: string // Tên lót theo đời (Văn, Thị, ...)
  gender: 'male' | 'female' | 'unknown'
  birthDate?: string      // YYYY or YYYY-MM-DD (năm cũ chỉ có năm)
  deathDate?: string
  birthPlace?: string     // Quê quán
  notes?: string
  parentIds: string[]     // 0–2 parents
  spouseIds: string[]     // theo thứ tự cưới
  // childrenIds: DERIVED via memoized selector (A1), not persisted
  generation: number      // computed từ root
  createdAt: string
  updatedAt: string       // server-side trigger (A2), not client
}
// Note: photoUrl REMOVED per TASTE-D5 (no photos in MVP)
// Note: deleted_at REMOVED per TASTE-E5 (hard delete, no tombstone)

interface FamilyTree {
  id: string
  ownerId: string         // Supabase user id
  name: string            // "Gia phả họ Nguyễn làng Hải An"
  rootPersonId: string
  publicSlug: string      // slug cho read-only link
  createdAt: string
  updatedAt: string
}
```

### Architecture

```
src/
  components/
    TreeView/          # react-d3-tree + spouse overlay SVG
      TreeCanvas.tsx
      PersonNode.tsx
      SpouseOverlay.tsx
    PersonCard/        # Profile panel (read)
    PersonForm/        # Add/edit form (admin only)
    SearchBar/         # Name search, diacritic-insensitive
    GenerationBadge/   # "Đời N" label
    AuthGate/          # Login wall for admin routes
  store/
    familyStore.ts     # Zustand — persons map, selectedId, syncStatus
    authStore.ts       # Supabase session
  services/
    storage.ts         # Interface: get/save/delete (offline-first)
    indexedDb.ts       # IndexedDB impl (local cache)
    supabase.ts        # Supabase client + sync engine
    syncEngine.ts      # IndexedDB ↔ Supabase reconcile
  utils/
    treeLayout.ts      # Flat persons → D3 hierarchy
    validation.ts      # Zod schemas
    vietnamese.ts      # Remove diacritics for search
  pages/
    HomePage.tsx       # Admin — tree view + sidebar
    ViewPage.tsx       # Read-only public view
    LoginPage.tsx
    SettingsPage.tsx
  App.tsx
  main.tsx
```

### Key Engineering Decisions (post Premise Gate + Final Gate)

1. **Supabase** — Postgres + Auth trong 1 service (KHÔNG Storage vì không có ảnh — TASTE-D5). Free tier thoải mái. Row Level Security bảo đảm admin chỉ thấy tree mình sở hữu.

2. **Offline-first qua IndexedDB** — Mọi write vào IndexedDB trước, sync lên Supabase background. App chạy được khi mất mạng. `storage.ts` là interface chung; `syncEngine.ts` đơn giản chỉ là outbox + naive UPDATE (không conflict resolution — TASTE-E1).

3. **`react-d3-tree` + spouse overlay** — D3 render parent→child hierarchy; custom `SpouseOverlay.tsx` vẽ SVG curves nối vợ/chồng. Cross-branch marriage = dashed line. Nếu không chạy nổi → fallback cytoscape.js chỉ trong `TreeView/`.

4. **Zustand** — 2 stores: `familyStore` (data), `authStore` (session). Không Redux, không context hell.

5. **Flat map + computed children** — `persons: Record<string, Person>`, children list tính lại mỗi render. Tránh nested state bugs. Hiệu năng OK đến ~500 nodes.

6. **Vietnamese search không dấu** — `vietnamese.ts` normalize diacritics trước khi so sánh. "Nguyen" match "Nguyễn".

7. **Depth limiter** — Mặc định hiển thị 4 đời từ selected node, user có thể mở rộng. Tránh lag khi cây >200 nodes.

8. **Read-only viewer qua RPC** — `/view/:publicSlug` gọi Supabase RPC `get_tree_by_slug(slug)` với `security definer` (TASTE-E2). RLS trên `family_trees` và `persons` là owner-only; RPC là đường duy nhất cho anon đọc. Không expose trực tiếp bảng.

9. **Naive sync, no conflict handling** (TASTE-E1) — user explicitly chấp nhận risk: nếu offline phone + online laptop cùng sửa 1 person, write sau đè write trước, không log. Outbox chỉ là queue offline→online, không có op_id collision detection, không có stale-write check.

10. **Hard delete, no tombstone** (TASTE-E5) — DELETE trên Person = `DELETE FROM persons WHERE id = ?`. App logic tự cascade: loại `id` khỏi mọi `parentIds` / `spouseIds` của row khác. UX safeguard: confirm dialog 2 bước "Xóa cụ X? Hành động này không thể hoàn tác" + undo toast 5s trước khi commit thật sự.

11. **Pull-on-focus + 60s poll** (TASTE-E4) — không dùng Supabase Realtime. Tab regain focus → fetch; mỗi 60s fetch nền. Đủ cho single admin, ít quota.

---

## Design System (Taste Skill Combo)

**Bắt buộc**: trước khi code bất kỳ component/screen nào, Read 2 file skill dưới đây và áp dụng làm constraint cứng.

- **Primary aesthetic**: `.claude/skills/minimalist-ui/` — clean editorial, warm monochrome, typographic contrast, flat bento grid, muted pastels. **Không** gradient, **không** heavy shadow, **không** rounded-2xl mặc định, **không** emoji UI.
- **Engineering baseline**: `.claude/skills/design-taste-frontend/` — senior UI engineer rules, metric-based spacing, strict component architecture, hardware-accelerated CSS (transform/opacity only), chặn AI defaults.

**Conflict resolution giữa 2 skill:**
- `design-taste-frontend` thắng trên các vấn đề kỹ thuật (performance, architecture, accessibility contrast ratios)
- `minimalist-ui` thắng trên các vấn đề thẩm mỹ (palette, typography hierarchy, layout feel)

**Typography Việt Nam:**
- Primary font: Be Vietnam Pro (hỗ trợ dấu thanh tốt, variable weight 100–900)
- Fallback: Inter với `font-feature-settings: 'ss01', 'cv11'`
- System fallback cuối: `-apple-system, system-ui, sans-serif`

**Palette dự kiến** (sẽ refine sau khi Read skill):
- Base: warm off-white `#FAF8F3` (paper-like, nhắc gia phả giấy)
- Ink: deep brown `#2A1F14` thay vì pure black (respectful, heritage)
- Accent: single muted color (chưa chốt, sẽ theo taste skill guidance)
- Generation band backgrounds: 3–5 cấp độ warm monochrome, chênh nhau ~8% lightness

**Anti-patterns bị cấm** (ghi rõ để future self / AI không vi phạm):
- ❌ `rounded-2xl` + `shadow-lg` + `bg-gradient-to-br` combo
- ❌ Glassmorphism / backdrop-blur
- ❌ Emoji trong UI (dùng icon set như Lucide/Phosphor)
- ❌ Pure black (#000) hoặc pure white (#FFF)
- ❌ Purple/blue gradient headers (signature AI-generic look)
- ❌ Bouncy spring animations, quá nhiều micro-interactions

**Session sau**: khi bắt đầu code UI, đọc `decision_taste_skill_combo.md` trong memory để nhớ quyết định này.

---

## Pages / Screens

### Home (Admin, `/`)
- Login gate — nếu chưa login → `/login`
- Left panel: search bar, generation filter, "Đời X" quick jump
- Main: interactive tree (centered on selected), pan/zoom
- Right panel: person profile card, actions (edit, add child, add spouse, delete)
- Bottom: generation legend + sync status indicator

### View (Public, `/view/:slug`)
- Không cần login
- Same layout nhưng disable all edit actions
- Nút "Copy link" để share

### Person Form (modal)
- Họ tên, tên lót, giới tính, ngày sinh, ngày mất, quê quán, ghi chú
- Parent picker (autocomplete)
- Spouse picker (autocomplete)
- Photo upload → Supabase Storage → URL

### Settings (`/settings`)
- Tên dòng họ
- Copy read-only link
- Export JSON (backup thủ công)
- Import JSON
- Logout

### Login (`/login`)
- Email + password (Supabase Auth)

---

## Test Plan
- Unit: `treeLayout.ts` (flat→hierarchy + depth limiter edge cases)
- Unit: `syncEngine.ts` (outbox enqueue/flush, retry on network error — no conflict logic)
- Unit: `vietnamese.ts` (diacritic normalization)
- Unit: Zod schemas
- Unit: hard-delete cascade (remove id từ parentIds/spouseIds của row khác)
- Integration: add person → sync → show on 2nd device (60s poll / focus refetch)
- Integration: offline add → come online → sync
- Integration: circular parent link rejected
- Integration: viewer RPC `get_tree_by_slug` trả đúng data; RLS trực tiếp từ anon bị reject
- Integration: delete person → confirm dialog → undo toast → commit
- E2E: full admin flow (login → create tree → 3 đời → search → share viewer link)
- E2E: viewer flow (open slug → browse → không có edit affordance)

Chi tiết 20 test cases: `docs/test-plan.md`

## Error & Rescue Registry

| Error | Trigger | User sees | Rescue |
|---|---|---|---|
| Supabase down | Network/outage | Sync indicator: ⚠ Offline | Keep working on IndexedDB, queue writes |
| Auth expired | 24h+ idle | Redirect `/login` | Preserve unsaved changes in IndexedDB |
| Circular parent | User sets grandparent as child | Validation error before save | Zod refine rule |
| Empty tree | No persons yet | "Thêm người đầu tiên" CTA | Empty state with button |
| IndexedDB quota | >50MB data | Warning toast | Offer JSON export + clear cache |
| Delete cụ Tổ (root) | User deletes root node | Warning: "Không thể xóa người gốc. Phải chuyển root trước" | Block + suggest set-root flow |
| Stale offline update 404 | Offline outbox retries UPDATE on deleted row | Silent drop (log only) | syncEngine catches 404, removes outbox entry |

## NOT in Scope (MVP)
- GEDCOM import/export (→ TODOS.md)
- Multi-user collaborative editing (chỉ 1 admin)
- Oral history (audio/video)
- PWA / service worker (revisit v1.1)
- Relationship path finder
- Timeline view
- Multi-clan support
- Passphrase encryption (→ required trước khi public launch)

## What Already Exists
- Empty repo với CLAUDE.md + gstack scaffold
- No code to reuse

## Dependencies to Install
```bash
bun create vite giaphahodang-app -- --template react-ts
bun add react-d3-tree zustand idb @supabase/supabase-js
bun add react-hook-form @hookform/resolvers zod
bun add react-router-dom
bun add -D tailwindcss @tailwindcss/vite
# shadcn/ui: bunx shadcn-ui@latest init
```

---

# PHASE 1: CEO REVIEW — ✅ COMPLETE (see archive below)

**Auto-decisions made:**
- #1: localStorage → IndexedDB (P1 — data safety)
- #2: Auto-export JSON on save (P1 — backup)
- #3: Depth limiter cho cây >200 nodes (P2 — performance)
- #4: Error states + empty states mandatory (P1 — observability)

**Premise Gate results (user answers 2026-04-09):**
- #5: Local-first → **Cloud sync qua Supabase** (1 admin, many devices, read-only link cho family)
- #6: Tree library → **react-d3-tree + spouse overlay** (khuyến nghị chấp nhận)
- #7: MVP scope → **Full MVP với D3 tree ngay** (khuyến nghị chấp nhận)

**CEO Completion Summary**

| Dimension | Rating | Key Finding |
|---|---|---|
| Problem clarity | 6/10 | Real pain, solution assumed nhưng owner-as-user OK cho MVP |
| Scope calibration | 7/10 | ~4 tuần CC-assisted, boilable |
| Alternatives | 7/10 | Cloud sync cân nhắc kỹ với 3 options (admin-only, multi-user, backup-only) |
| Risk coverage | 7/10 | localStorage risk đã giải quyết bằng Supabase + IndexedDB |
| Observability | 4/10 | Cần thêm error/empty states — auto-approved |
| Architecture | 8/10 | storage.ts interface + syncEngine cho cloud migration clean |
| 2-year vision | 6/10 | Có seam cho GEDCOM, oral history, encryption |

---

# PHASE 2: DESIGN REVIEW — ✅ COMPLETE [subagent-only]

## 1. Information hierarchy & visual flow — 5/10
Three-column layout (left filters, center tree, right profile) là conventional nhưng burn screen real estate mà tree đang cần cho cây 8–12 đời. Plan không nói collapse behavior cho side panels, selected-node focus treatment, hoặc profile card cạnh tranh ra sao với pan/zoom gestures. Generation legend + sync status nhét vào "bottom" bar là nơi important state đi chết. Không có mention về default viewport lần đầu load (root? last-edited? whole tree?).

## 2. Vietnamese typography & readability — 4/10
Plan nói "Vietnamese UI" và không gì về fonts. Stacked diacritics (ằ, ễ, ộ, ữ) vỡ ở nhiều display fonts và collide với tight line-heights — đây là real risk với Tailwind defaults. Không chọn font (Be Vietnam Pro, Inter Vietnamese subset, Noto Sans), không min line-height, không guidance cho tên dài ("Nguyễn Thị Hoàng Mỹ Lệ") trong fixed-width nodes. "Đời N" markers cần hệ thống typography — badge? column header? background band? Không định nghĩa.

## 3. Mobile ergonomics — 3/10
"Mobile responsive" đang là Should-Have, nhưng nên là Must-Have: family members (user đông nhất) browse trên phone qua share link. 200-node d3 tree trên 375px là unusable nếu không có mobile strategy — pinch-zoom đụng page scroll, 3-column layout collapse xuống nothing, right profile cần thành bottom sheet, tap targets trên person nodes cần hit 44px. Không nói gì về mobile search UX, mobile node selection, hay "Đời X quick jump" hoạt động sao bằng thumb.

## 4. Empty, loading, và error states — 5/10
Error registry decent nhưng state coverage mỏng: không skeleton cho tree canvas trong first hydrate, không "syncing…" per-node indicator, không conflict-resolution UI khi cùng 1 person edit trên 2 devices, không "link expired/revoked" state cho viewers, không "tree not found" cho bad slugs, không photo-upload progress, không optimistic-write rollback visual. "Unauthorized edit attempt trên read-only view" chưa cover — edit affordances không nên tồn tại ở mode đó, nhưng nếu ai đó deep-link vào `/edit/:id` thì sao?

## 5. Admin vs viewer UX differentiation — 4/10
Plan nói viewer dùng "same layout but disable edit actions" — đó là bẫy. Disabled buttons everywhere signal "bạn đang thiếu gì đó" thay vì "đây là gallery". Viewer mode cần chrome distinct: không edit toolbar, subtle "Chế độ xem — chia sẻ bởi [admin]" ribbon, có thể warmer background tint. Ngược lại admin mode không có "edit mode on/off" toggle, nên editing affordances sẽ clutter browsing experience cho chính admin.

## 6. Onboarding (zero → first success) — 3/10
Under-specified hoàn toàn. "Thêm người đầu tiên CTA" là 1 câu cho moment stake cao nhất. Non-technical admin login, thấy blank canvas — sau đó sao? Không guided "Bắt đầu từ ông tổ" flow, không example tree, không giải thích đời numbering, không hint rằng spouse vs parent là actions khác nhau. First-person form là modal với parent/spouse autocomplete pickers… empty. Sẽ strand users.

## 7. Accessibility — 2/10
react-d3-tree render SVG với 0 keyboard nav out of the box. Plan không có focus order cho nodes, không ARIA roles cho tree (phải `role="tree"` với `treeitem` nodes), không screen-reader narration cho spouse overlay lines (purely visual SVG). Gender likely encode bằng color với không secondary signal — fail WCAG 1.4.1. Không mention focus trap trên modals, Esc-to-close, reduced-motion cho pan/zoom, hoặc contrast ratios cho generation badges.

## Design Litmus Scorecard
```
Dimension                             Score  Notes
─────────────────────────────────────  ─────  ──────────────
Information hierarchy                  5/10   3-col burns tree space
Vietnamese typography                  4/10   No font chosen; diacritic risk
Mobile ergonomics                      3/10   Viewers ARE mobile but Should-Have
Empty/loading/error states             5/10   Sync/conflict UI missing
Admin vs viewer differentiation        4/10   Disabled buttons ≠ view mode
Onboarding (zero → first success)      3/10   One-line CTA for hardest moment
Accessibility                          2/10   SVG + color-only gender = WCAG fail
─────────────────────────────────────  ─────
TOTAL                                  26/70
```

## Top 5 Blocking Design Gaps
1. **Mobile là Should-Have nhưng majority user là mobile.** → Promote mobile-responsive lên Must-Have; design viewer mode mobile-first với bottom sheet cho profile.
2. **Không có Vietnamese font strategy.** → Lock Be Vietnam Pro (hoặc Inter Vietnamese subset), set min line-height 1.5, test tên 4 từ trong node cards.
3. **Onboarding từ empty tree chỉ 1 câu.** → Add 3-step first-run flow — "Ông tổ → vợ/chồng → con đầu" — với inline coaching trong canvas.
4. **Read-only mode là "admin UI với buttons greyed out".** → Design viewer như chrome distinct, lighter, 0 edit affordances, có visible "shared by" attribution bar.
5. **Tree không accessible — SVG + keyboard + screen reader + color-only gender.** → ARIA tree semantics, keyboard arrow nav, icon+color cho gender, focus-visible rings.

## Auto-approved design additions (Phase 2)
- **D1** Be Vietnam Pro font với min line-height 1.5, test diacritic rendering
- **D2** Skeleton loading state cho tree canvas trên initial hydrate
- **D3** Bottom-sheet profile panel trên mobile (<768px) thay right sidebar
- **D4** "Tree not found" + "Link revoked" states cho `/view/:slug`
- **D5** ARIA `role="tree"` + keyboard arrow navigation; focus-visible rings
- **D6** Gender show bằng icon + label, không bao giờ chỉ color
- **D7** Photo upload progress indicator + client-side resize confirmation
- **D8** "Chế độ xem" attribution ribbon trên viewer mode với admin display name
- **D9** Sync conflict resolution modal ("Person này edit trên device khác — giữ cái nào?")
- **D10** `prefers-reduced-motion` cho pan/zoom animations
- **D11** Esc-to-close + focus-trap trên tất cả modals; autofocus first field
- **D12** Empty-tree coached flow: "Thêm ông tổ → Thêm vợ/chồng → Thêm con"
- **D13** Promote mobile responsive lên MUST HAVE

## Taste decisions (Design — FINAL, chosen 2026-04-09)
- **TASTE-D1 ✅ CHOSEN — Viewer default view**: **Toàn bộ cây zoom-to-fit**. Viewer thấy tổng quan dòng họ ngay lần đầu mở, dù cây lớn có thể rối mắt — user chấp nhận.
- **TASTE-D2 ✅ CHOSEN — Admin edit affordances**: **Toolbar luôn hiện** cạnh mỗi node. Fast, không cần toggle mode. Chấp nhận giao diện busier.
- **TASTE-D3 ✅ CHOSEN — Generation visualization**: **Băng ngang "Đời 1, Đời 2…"** xuyên canvas, chú thích đời bên trái. Cấu trúc rõ rệt, phù hợp văn hóa gia phả Việt.
- **TASTE-D4 ✅ CHOSEN — Gender encoding**: **Màu + icon kết hợp** (border màu warm-mono + icon ⚥ nhỏ). Accessible (không color-only WCAG fail), redundant encoding an toàn.
- **TASTE-D5 ✅ CHOSEN — Photo prominence**: **Không có ảnh chân dung**. Cây 100% text, phù hợp gia phả truyền thống Việt. Schema/storage/upload UI đơn giản hẳn.

---

# PHASE 3: ENG REVIEW — ✅ COMPLETE [subagent-only]

## 1. Architecture Diagram

```
                        ┌─────────────────────────────────────┐
                        │           Browser (React)           │
                        │                                     │
  Admin routes ──►  ┌───┴────┐     ┌──────────────┐           │
  /, /settings      │ Pages  │────►│ Zustand      │           │
                    │+Forms  │◄────│ familyStore  │           │
  Viewer route ──►  │(RHF+   │     │ authStore    │           │
  /view/:slug       │ Zod)   │     └──────┬───────┘           │
                    └────────┘            │                   │
                        │                 ▼                   │
                        │         ┌───────────────┐           │
                        │         │ storage.ts    │  (iface)  │
                        │         └───┬───────┬───┘           │
                        │             │       │               │
                        │             ▼       ▼               │
                        │   ┌─────────────┐  ┌────────────┐   │
                        │   │ indexedDb.ts│  │ syncEngine │   │
                        │   │ (idb)       │◄─┤ (outbox,   │   │
                        │   │ persons     │  │  reconcile)│   │
                        │   │ trees       │  └─────┬──────┘   │
                        │   │ outbox      │        │          │
                        │   │ conflicts   │        │          │
                        │   │ meta(ver)   │        │          │
                        │   └─────────────┘        │          │
                        └──────────────────────────┼──────────┘
                                                   │ HTTPS/WSS
                                                   ▼
                        ┌──────────────────────────────────────┐
                        │              Supabase                │
                        │ ┌────────┐ ┌──────┐ ┌────────┐ ┌───┐ │
                        │ │Postgres│ │ Auth │ │Storage │ │RLS│ │
                        │ │persons │ │ JWT  │ │photos/ │ │pol│ │
                        │ │trees   │ │      │ │        │ │   │ │
                        │ │tombs   │ │      │ │        │ │   │ │
                        │ └────────┘ └──────┘ └────────┘ └───┘ │
                        └──────────────────────────────────────┘
```

Viewer path bypass `authStore`, dùng anon Supabase client, hydrate cùng `familyStore` với read-only flag.

## 2. Data Flow Diagrams

**Admin write (offline-first):**
```
UI edit ─► RHF+Zod ─► familyStore.action ─► storage.save(person)
                                                │
                                                ├─► IDB.persons.put (updatedAt=now)
                                                └─► IDB.outbox.put({op,id,op_id})
                                                       │
                                                       ▼
                                          syncEngine (debounced/online)
                                                       │
                                           pull remote changes since cursor
                                                       │
                                             reconcile (field-level LWW)
                                                       │
                                              push outbox → Supabase
                                                       │
                                            on 2xx: clear outbox row
                                            on 409: write conflict_log
```

**Viewer read (public slug):**
```
GET /view/:slug ─► ViewPage mount ─► anonSupabase
                                        │
                                        └─► rpc('get_tree_by_slug', {slug})
                                             (security definer, returns tree + persons)
                                        │
                                        ▼
                              hydrate familyStore (read-only flag)
                                        ▼
                                  TreeCanvas render (lazy photos)
```

## 3. Critical Architecture Questions & Answers

### Q1 — Sync conflict resolution
Plan nói "reconcile by updatedAt" = row-level LWW. Admin edit `notes` trên laptop, sau đó `photoUrl` trên phone khi laptop change vẫn trong outbox → LWW silently drop `notes`. **Fix**: field-level LWW (per-column `updatedAt` map) HOẶC dirty-field diff trong outbox (store patch, không phải full row). Giữ `conflict_log` IDB store để nothing silently lost. Taste decision TASTE-E1.

### Q2 — RLS for anon read via slug
Plan wave hand về chuyện này. Cần:
```sql
-- Option A: direct RLS (SIMPLE nhưng có hole)
alter table family_trees enable row level security;
create policy "anon_read_by_slug" on family_trees
  for select to anon
  using (public_slug is not null);

-- Hole: anon enumerate ALL public trees.
-- Fix: dùng RPC security definer thay thế.

-- Option B: RPC gate (SAFER)
create function get_tree_by_slug(slug text)
  returns table(...) language sql security definer as $$
  select t.*, array_agg(p.*) from family_trees t
    join persons p on p.tree_id = t.id
    where t.public_slug = slug
$$;
revoke select on family_trees, persons from anon;
grant execute on function get_tree_by_slug to anon;

-- Owner full access (both options):
create policy "owner_all_trees" on family_trees
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
```
Recommend Option B cho v1. Taste decision TASTE-E2.

### Q3 — IndexedDB schema migration
Plan không có migration story. Khi `Person` thêm field ở v1.1 → stale-shape reads, silent `undefined` bugs. **Fix**: `schemaVersion` explicit trong `meta` store, `idb.openDB(name, version, { upgrade })` với named migration steps v1→v2→v3, startup guard chạy backfills rồi bump version. Test U9.

### Q4 — Tree integrity
Plan nói circular parent validation nhưng miss: (a) orphaned `spouseIds` after delete, (b) `childrenIds` drift khỏi `parentIds` (double source of truth — **kill `childrenIds`, derive on the fly**), (c) cross-tree FK leak. **Fix**: drop `childrenIds` khỏi persisted shape; Zod enforce `parentIds.every(p => persons[p]?.treeId === self.treeId)`; cascade-prune `spouseIds` trong delete action.

### Q5 — Bundle size
Ước tính gzipped: react+react-dom ≈45KB, react-d3-tree+d3 ≈70–90KB, supabase-js ≈50KB, react-router ≈15KB, RHF+zod ≈25KB, idb ≈3KB, shadcn ≈10–20KB, zustand ≈3KB. **Total ≈220–250KB gzipped**. Borderline cho 3G mobile viewer (exact target users). **Fix**: route-split viewer bundle. Viewer KHÔNG cần RHF, zod, supabase auth module, form components. Lazy-load `TreeCanvas`. Import `@supabase/postgrest-js` only cho viewer. **Target: viewer entry ≤120KB gz, admin ≤280KB gz.**

### Q6 — Initial viewer load cho 500 persons
~500B JSON/person = ~250KB raw, ~60–80KB gzipped. OK. **But** photo URLs sẽ trigger 500 image requests nếu render eager. **Fix**: paginate theo generation (đời 1–4 trước, lazy fetch sâu hơn khi expand), render photos chỉ cho nodes trong viewport (IntersectionObserver), no preload collapsed subtrees. `persons_public` view omit `notes` → cut payload ~30%.

## 4. Failure Modes Registry

| # | Failure | Prob | Blast | Detection | Recovery |
|---|---|---|---|---|---|
| F1 | Sync conflict (multi-device LWW) | High | Silent field loss | `conflict_log` + diff vs last remote | Field-level merge; toast "review conflict"; manual revert |
| F2 | Supabase quota hit (500MB/2GB) | Med | Writes queue, reads 429 | Sync badge red; 429 log | Auto JSON export; pause photos; upgrade tier |
| F3 | IndexedDB quota (~50MB mobile Safari) | Med | `QuotaExceededError` | try/catch + toast | JSON export; purge photo cache; keep rows |
| F4 | Auth token expiry mid-edit | High (24h) | 401s, outbox stuck | `onAuthStateChange` + 401 interceptor | Silent refresh; redirect /login; resume outbox |
| F5 | Bad IDB migration v1→v2 | Low/catastrophic | Corrupted local DB | Migration errors logged | Refuse upgrade; offer backup JSON; wipe + re-pull |
| F6 | RLS misconfig → data leak | Low/catastrophic | All trees readable | I3 RLS test + manual probe + `pg_policies` audit | Emergency `alter policy`; rotate slugs; notify |
| F7 | Circular parent insertion | Med | Layout infinite loop, crash | Zod refine + `validateAcyclic` | Reject at form; show cycle path |
| F8 | Photo upload failure | High | Person saved no photo | Promise reject + toast | Resize; retry w/ backoff; `photoUrl=null` |
| F9 | Network flap mid-sync | High | Partial push | Per-row ack in outbox | Idempotent upsert by id+op_id; resume |
| F10 | Anon viewer rate limit/DDoS | Low | Viewer errors | Supabase logs | Edge cache; static snapshot; rotate slug |
| F11 | Clock skew between devices | Med | LWW picks wrong winner | Drift check vs server `now()` | Server `updatedAt` from response, not client |
| F12 | Outbox corruption (browser killed) | Low | Duplicate/missing op | `schemaVersion` + op_id dedupe | Idempotent upserts; op_id UUID |

## 5. Test Plan
Written to `docs/test-plan.md` — 20 tests (10 unit, 6 integration, 4 e2e + 4 manual QA). See that file for exact test cases.

## 6. Missing from Plan (severity-ordered) — Engineering

1. **Conflict resolution design** — LWW-by-row loses data. Need field-level merge or patch outbox + conflict log (Q1).
2. **RLS policy draft + anon exposure model** — plan assume "slug in query = safe". Needs RPC-based access + RLS integration test (Q2, F6).
3. **IndexedDB schema versioning + migration tests** — no story today (Q3, F5).
4. **Outbox + idempotency design** — "sync in background" is a sentence, not a design. Need `outbox` store, `op_id`, per-row ack, backoff, resume (F9, F12).
5. **Bundle budget + viewer split** — no target, no measurement. Set: viewer ≤120KB gz, admin ≤280KB gz; enforce với `size-limit` trong CI (Q5).
6. **Server clock as truth** — client `updatedAt` is footgun; server-side stamp via Postgres trigger (F11).
7. **Delete semantics** — hard vs tombstone undefined. Need `deleted_at` + tombstone retention 30 days (F1).

## 7. Auto-approved architecture additions (Phase 3)
- **A1** Drop `childrenIds` khỏi persisted `Person`; derive qua memoized selector
- **A2** Server-side `updatedAt` via Postgres `before update` trigger
- **A3** `op_id` UUID mỗi outbox entry; upserts idempotent by `(id, op_id)`
- **A4** `size-limit` CI check với viewer/admin budgets
- **A5** `meta` IDB store với `schemaVersion` + explicit named migrations
- **A6** Soft-delete via `deleted_at` column + tombstone sweeper
- **A7** Automated RLS test suite trong CI (I3)
- **A8** Structured client logger với ring buffer export từ Settings

## 8. Taste decisions (Engineering — FINAL, chosen 2026-04-09)
- **TASTE-E1 ✅ CHOSEN — Conflict resolution**: **Skip hoàn toàn**. User explicitly chấp nhận risk: single admin, pure row-level LWW, không `conflict_log`, không stale-write check, không field-level merge. Admin phải edit từ 1 thiết bị tại một thời điểm. Simplest possible implementation.
- **TASTE-E2 ✅ CHOSEN — Viewer auth model**: **RPC `get_tree_by_slug` security definer**. Viewer fetch qua 1 RPC duy nhất; RLS trên bảng gốc là owner-only. Safer than direct-RLS-on-slug, ít leak risk.
- **TASTE-E3 ✅ N/A — Photo storage**: **Không áp dụng** vì TASTE-D5 = không có ảnh. Bỏ toàn bộ Supabase Storage setup.
- **TASTE-E4 ✅ CHOSEN — Realtime vs poll**: **Pull-on-focus + 60s poll** (default, user không có preference rõ). Single admin không cần instant. Ít quota.
- **TASTE-E5 ✅ CHOSEN — Delete semantics**: **Hard delete, không tombstone**. DELETE thật sự, không `deleted_at` column, không retention. UX safeguard: confirm dialog 2 bước + undo toast 5s.

**Verdict (REVISED):** plan clear to code. 3 load-bearing systems trước đây (sync/conflict, RLS, tombstone) đã được resolved bằng cách **đơn giản hóa radical**:
- Sync/conflict: skip (TASTE-E1)
- RLS: 1 RPC security definer (TASTE-E2)
- Tombstone: bỏ (TASTE-E5)

Bundle savings ước tính: **~30–40KB gz** (không image lib, không tombstone sweeper, không conflict merge logic). Viewer budget ~120KB → ước ~85–90KB. Admin budget ~280KB → ước ~240KB. Cả hai đều trong target với margin.

---

## Decision Audit Trail

| # | Phase | Decision | Classification | Rationale |
|---|-------|----------|----------------|-----------|
| 1 | 1 | localStorage → IndexedDB | Auto | Data safety, mobile storage eviction |
| 2 | 1 | Auto-export JSON on save | Auto | Backup for non-technical admin |
| 3 | 1 | Depth limiter UI | Auto | Performance on cây >200 nodes |
| 4 | 1 | Error + empty states mandatory | Auto | Observability baseline |
| 5 | 1 Gate | Cloud sync (Supabase, admin-only) | User | User override của local-first premise |
| 6 | 1 Gate | react-d3-tree + spouse overlay | User (recommended) | Bundle size vs full DAG tradeoff |
| 7 | 1 Gate | Full MVP với D3 tree | User (recommended) | Tree IS the product |
| 8 | Final Gate | TASTE-D1: Viewer default = zoom-to-fit whole tree | User | Overview first, dù có thể rối mắt |
| 9 | Final Gate | TASTE-D2: Toolbar luôn hiện cạnh node | User | Fast edit, chấp nhận busier UI |
| 10 | Final Gate | TASTE-D3: Băng ngang "Đời N" xuyên canvas | User | Cấu trúc rõ, văn hóa gia phả Việt |
| 11 | Final Gate | TASTE-D4: Màu + icon gender encoding | User (recommended) | Accessible, redundant safety |
| 12 | Final Gate | TASTE-D5: Không có ảnh chân dung | User | Gia phả truyền thống, schema gọn hơn |
| 13 | Final Gate | TASTE-E1: Skip sync conflict resolution | User | Radical simplicity, single-admin risk chấp nhận |
| 14 | Final Gate | TASTE-E2: RPC security definer cho viewer | User (recommended) | Safer than direct-slug-RLS |
| 15 | Final Gate | TASTE-E3: N/A (moot do D5) | Auto | Dependency of removed feature |
| 16 | Final Gate | TASTE-E4: Pull-on-focus + 60s poll | Auto (no preference → default) | Simplest, ít quota |
| 17 | Final Gate | TASTE-E5: Hard delete, no tombstone | User | Radical simplicity + 2-step confirm UX |
| 18 | Post Final | Taste skill combo: minimalist-ui + design-taste-frontend | User (recommended) | Aesthetic + engineering baseline |
| 19 | Post Final | Vendored gstack as git submodule (project-local) | User | Removed global install, single-repo usage |

---

## GSTACK REVIEW REPORT

| Review | Trigger | Runs | Status | Findings |
|---|---|---|---|---|
| CEO Review | `/plan-ceo-review` | 1 (subagent) | ✅ | 7 issues, 4 auto-approved, 3 premise gate |
| Codex Review | `/codex review` | 0 | SKIP | Codex not installed (subagent-only mode) |
| Design Review | `/plan-design-review` | 1 (subagent) | ✅ | Scorecard 26/70, 5 blocking gaps, 13 auto-approved, 5 taste decisions |
| Eng Review | `/plan-eng-review` | 1 (subagent) | ✅ | 6 critical Q&A, 12 failure modes, 8 auto-approved, 5 taste decisions |
| DX Review | `/plan-devex-review` | 0 | SKIP | No DX scope (1 match) |

**Caveat ngày 2026-04-09**: Tất cả review chạy qua `general-purpose` subagent, không phải canonical gstack skill trực tiếp (gstack skill suite không discover được từ vendored submodule trong session này). Content quality tương đương senior reviewer nhưng không phải output chuẩn từ skill chính thức. User (duylinhdang) đã được thông báo và chấp nhận ("chạy A" — finalize với kết quả subagent).

**VERDICT: ✅ AUTOPLAN COMPLETE — CLEAR TO CODE.**

Next step options:
- (a) Scaffold Vite + React + TS + Tailwind + shadcn/ui + Supabase client → commit baseline
- (b) Setup Supabase project + migration SQL (cần `SUPABASE_URL` + `SUPABASE_ANON_KEY` từ user)
- (c) Phase 1 vertical slice: auth + tạo cây + thêm 1 person + view
- (d) Dừng ở đây, user tự code

Trước khi code bất kỳ UI nào: **bắt buộc Read** `.claude/skills/minimalist-ui/` và `.claude/skills/design-taste-frontend/` (xem section "Design System (Taste Skill Combo)" phía trên).
