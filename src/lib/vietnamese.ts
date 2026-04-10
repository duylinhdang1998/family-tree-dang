// =====================================================================
// Vietnamese text utilities — diacritic-insensitive search.
// JavaScript's NFD decomposition handles most Vietnamese marks via the
// combining diacritical block, but `đ`/`Đ` are atomic and need an
// explicit mapping (they don't decompose under NFD).
// =====================================================================

/** Lowercase + strip Vietnamese diacritics for search comparison. */
export function normalizeVietnamese(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim()
}

/** True if `query` (case + diacritic insensitive) is a substring of `haystack`. */
export function matchesVietnameseSearch(haystack: string, query: string): boolean {
  if (!query) return true
  return normalizeVietnamese(haystack).includes(normalizeVietnamese(query))
}

/**
 * Convert Vietnamese text to a URL-friendly slug.
 * "Gia phả họ Nguyễn" → "gia-pha-ho-nguyen"
 */
export function slugify(input: string): string {
  return normalizeVietnamese(input)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
