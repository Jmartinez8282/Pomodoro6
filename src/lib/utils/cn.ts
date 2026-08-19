import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names, with later Tailwind utilities beating earlier ones.
 *
 * Every primitive must route its `className` through this. Without the merge
 * step a consumer's `className="bg-danger"` silently loses to the variant's
 * own `bg-accent`, because both end up in the class list and the cascade
 * decides by stylesheet order rather than by intent.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
