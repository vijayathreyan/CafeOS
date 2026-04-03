import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind CSS class names, resolving conflicts via tailwind-merge.
 * @param inputs - Any number of class values (strings, arrays, objects)
 * @returns A single merged class string with Tailwind conflicts resolved
 * @example
 * cn('px-2 py-1', condition && 'bg-primary', 'text-sm')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
