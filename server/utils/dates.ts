/**
 * Server-side date utilities for safe date parsing and coercion
 */

/**
 * Safely parse a date string/value and return Date or null
 * @param value - Date string, Date object, or other value
 * @returns Valid Date object or null if invalid
 */
export const safeDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Safely parse a date string/value and return Date or undefined
 * @param value - Date string, Date object, or other value
 * @returns Valid Date object or undefined if invalid
 */
export const safeDateOptional = (value?: string | Date | null): Date | undefined => {
  if (!value) return undefined;
  
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
};