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
 * Format a date safely with fallback
 * @param value - Date string, Date object, or other value
 * @param fallback - Fallback string if date is invalid
 * @returns Formatted date string or fallback
 */
export const formatDateSafe = (value?: string | Date | null, fallback: string = 'N/A'): string => {
  const date = safeDate(value);
  return date ? date.toLocaleDateString() : fallback;
};

/**
 * Format a date with time safely with fallback
 * @param value - Date string, Date object, or other value
 * @param fallback - Fallback string if date is invalid
 * @returns Formatted datetime string or fallback
 */
export const formatDateTimeSafe = (value?: string | Date | null, fallback: string = 'N/A'): string => {
  const date = safeDate(value);
  return date ? date.toLocaleString() : fallback;
};

/**
 * Get relative time (e.g., "2 hours ago") safely
 * @param value - Date string, Date object, or other value
 * @param fallback - Fallback string if date is invalid
 * @returns Relative time string or fallback
 */
export const formatRelativeTime = (value?: string | Date | null, fallback: string = 'Never'): string => {
  const date = safeDate(value);
  if (!date) return fallback;
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return diffMinutes < 1 ? 'Just now' : `${diffMinutes}m ago`;
  }
  
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  
  return date.toLocaleDateString();
};

/**
 * Check if a date is within the last N days (excludes future dates)
 * @param value - Date to check
 * @param days - Number of days to check within
 * @returns boolean indicating if date is within the last N days
 */
export const isWithinDays = (value?: string | Date | null, days: number = 30): boolean => {
  const date = safeDate(value);
  if (!date) return false;
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  // Return false for future dates
  if (diffMs < 0) return false;
  
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  return diffDays <= days;
};