import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combine Tailwind class names with conflict resolution.
 * Use everywhere instead of plain template strings when classes are conditional.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
