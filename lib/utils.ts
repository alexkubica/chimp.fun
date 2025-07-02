import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Truncate a string with ellipsis in the middle if it exceeds maxLength.
 * Example: middleEllipsis('abcdef', 5) => 'ab...f'
 */
export function middleEllipsis(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  if (maxLength <= 3) return str.slice(0, maxLength);
  const keep = maxLength - 3;
  const front = Math.ceil(keep / 2);
  const back = Math.floor(keep / 2);
  return str.slice(0, front) + "..." + str.slice(str.length - back);
}
